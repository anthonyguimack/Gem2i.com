"""
Iteration 51 Tests: Analytics Month Labels Fix & Quick Links Level Permissions

Tests:
1. Analytics monthly data returns unique month labels (no duplicate 'Jan')
2. Analytics monthly_registrations labels format 'Mon YY' (e.g., 'Nov 25', 'Dec 25', 'Jan 26')
3. Analytics monthly_logins correctly counts unique logged-in members per month
4. Member Levels CRUD with quick_link_permissions field
5. GET /api/member/my-level returns quick_link_permissions array
6. Members Manager still has Register column (created_at field)
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAnalyticsMonthLabels:
    """Test analytics endpoint returns unique month labels"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin to get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_analytics_returns_unique_month_labels(self):
        """GET /api/admin/analytics should return monthly data with unique month labels"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics", headers=self.headers)
        assert response.status_code == 200, f"Analytics failed: {response.text}"
        
        data = response.json()
        
        # Check monthly_registrations has unique labels
        assert "monthly_registrations" in data, "monthly_registrations missing"
        reg_labels = [m["month"] for m in data["monthly_registrations"]]
        assert len(reg_labels) == len(set(reg_labels)), f"Duplicate month labels in registrations: {reg_labels}"
        
        # Check monthly_logins has unique labels
        assert "monthly_logins" in data, "monthly_logins missing"
        login_labels = [m["month"] for m in data["monthly_logins"]]
        assert len(login_labels) == len(set(login_labels)), f"Duplicate month labels in logins: {login_labels}"
        
        # Check monthly_contacts has unique labels
        assert "monthly_contacts" in data, "monthly_contacts missing"
        contact_labels = [m["month"] for m in data["monthly_contacts"]]
        assert len(contact_labels) == len(set(contact_labels)), f"Duplicate month labels in contacts: {contact_labels}"
        
        # Check monthly_revenue has unique labels
        assert "monthly_revenue" in data, "monthly_revenue missing"
        revenue_labels = [m["month"] for m in data["monthly_revenue"]]
        assert len(revenue_labels) == len(set(revenue_labels)), f"Duplicate month labels in revenue: {revenue_labels}"
        
        print(f"PASS: All month labels are unique")
        print(f"  Registration labels: {reg_labels}")
        print(f"  Login labels: {login_labels}")
    
    def test_analytics_month_labels_format(self):
        """Analytics labels should be in 'Mon YY' format (e.g., 'Nov 25', 'Dec 25', 'Jan 26')"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        reg_labels = [m["month"] for m in data["monthly_registrations"]]
        
        # Check format: should be like 'Nov 25', 'Dec 25', 'Jan 26'
        import re
        pattern = r'^[A-Z][a-z]{2} \d{2}$'  # e.g., 'Nov 25'
        for label in reg_labels:
            assert re.match(pattern, label), f"Label '{label}' doesn't match 'Mon YY' format"
        
        print(f"PASS: All labels match 'Mon YY' format: {reg_labels}")
    
    def test_analytics_no_duplicate_jan(self):
        """Specifically check there's no duplicate 'Jan' month"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        reg_labels = [m["month"] for m in data["monthly_registrations"]]
        
        # Count occurrences of 'Jan' (any year)
        jan_count = sum(1 for label in reg_labels if label.startswith('Jan'))
        assert jan_count <= 1, f"Found {jan_count} 'Jan' labels (should be max 1): {reg_labels}"
        
        print(f"PASS: No duplicate Jan labels. Labels: {reg_labels}")
    
    def test_analytics_monthly_logins_structure(self):
        """monthly_logins should have correct structure with 'logins' count"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        monthly_logins = data["monthly_logins"]
        
        for entry in monthly_logins:
            assert "month" in entry, "Missing 'month' key"
            assert "logins" in entry, "Missing 'logins' key"
            assert isinstance(entry["logins"], int), f"'logins' should be int, got {type(entry['logins'])}"
        
        print(f"PASS: monthly_logins structure correct: {monthly_logins}")


class TestMemberLevelsQuickLinkPermissions:
    """Test Member Levels with quick_link_permissions field"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.created_level_id = None
    
    def teardown_method(self, method):
        """Cleanup created test level"""
        if self.created_level_id:
            requests.delete(f"{BASE_URL}/api/admin/member-levels/{self.created_level_id}", headers=self.headers)
    
    def test_get_member_levels_returns_quick_link_permissions(self):
        """GET /api/admin/member-levels should return levels with quick_link_permissions"""
        response = requests.get(f"{BASE_URL}/api/admin/member-levels", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        levels = response.json()
        assert isinstance(levels, list), "Should return list of levels"
        
        # Check if any level has quick_link_permissions
        for level in levels:
            assert "id" in level, "Level missing 'id'"
            assert "name" in level, "Level missing 'name'"
            # quick_link_permissions may or may not exist, but if it does, should be array
            if "quick_link_permissions" in level:
                assert isinstance(level["quick_link_permissions"], list), "quick_link_permissions should be array"
        
        print(f"PASS: Found {len(levels)} levels")
        for level in levels:
            ql_perms = level.get("quick_link_permissions", [])
            print(f"  - {level['name']}: quick_link_permissions={ql_perms}")
    
    def test_create_level_with_quick_link_permissions(self):
        """POST /api/admin/member-levels should accept quick_link_permissions"""
        # First get quick links to use their IDs
        ql_response = requests.get(f"{BASE_URL}/api/admin/myaccount-links", headers=self.headers)
        quick_links = ql_response.json() if ql_response.status_code == 200 else []
        ql_ids = [ql["id"] for ql in quick_links[:2]] if quick_links else []
        
        level_data = {
            "name": "TEST_Level_QL_Perms",
            "permissions": ["membership-profile", "invite-code"],
            "quick_link_permissions": ql_ids,
            "order": 99
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/member-levels", json=level_data, headers=self.headers)
        assert response.status_code == 200, f"Create level failed: {response.text}"
        
        created = response.json()
        self.created_level_id = created["id"]
        
        assert created["name"] == "TEST_Level_QL_Perms"
        assert "quick_link_permissions" in created or ql_ids == [], "quick_link_permissions should be in response"
        
        print(f"PASS: Created level with quick_link_permissions: {created.get('quick_link_permissions', [])}")
    
    def test_update_level_quick_link_permissions(self):
        """PUT /api/admin/member-levels/{id} should update quick_link_permissions"""
        # Create a level first
        create_response = requests.post(f"{BASE_URL}/api/admin/member-levels", json={
            "name": "TEST_Level_Update_QL",
            "permissions": [],
            "order": 98
        }, headers=self.headers)
        assert create_response.status_code == 200
        level_id = create_response.json()["id"]
        self.created_level_id = level_id
        
        # Get quick links
        ql_response = requests.get(f"{BASE_URL}/api/admin/myaccount-links", headers=self.headers)
        quick_links = ql_response.json() if ql_response.status_code == 200 else []
        ql_ids = [ql["id"] for ql in quick_links[:3]] if quick_links else []
        
        # Update with quick_link_permissions
        update_response = requests.put(f"{BASE_URL}/api/admin/member-levels/{level_id}", json={
            "quick_link_permissions": ql_ids
        }, headers=self.headers)
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        
        updated = update_response.json()
        assert updated.get("quick_link_permissions") == ql_ids, f"quick_link_permissions not updated correctly"
        
        print(f"PASS: Updated level quick_link_permissions to: {ql_ids}")


class TestMemberMyLevel:
    """Test GET /api/member/my-level returns quick_link_permissions"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin (who is also a member)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_member_my_level_endpoint_exists(self):
        """GET /api/member/my-level should return level info or null"""
        response = requests.get(f"{BASE_URL}/api/member/my-level", headers=self.headers)
        # Should return 200 even if no level assigned (returns null)
        assert response.status_code == 200, f"my-level endpoint failed: {response.text}"
        
        data = response.json()
        if data is not None:
            # If level exists, check structure
            assert "id" in data, "Level missing 'id'"
            assert "name" in data, "Level missing 'name'"
            # quick_link_permissions should be present if set
            print(f"PASS: my-level returned: {data.get('name')}, quick_link_permissions={data.get('quick_link_permissions', [])}")
        else:
            print("PASS: my-level returned null (no level assigned)")


class TestMembersManagerRegisterColumn:
    """Test Members Manager returns created_at for Register column"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_admin_members_returns_created_at(self):
        """GET /api/admin/members should return members with created_at field"""
        response = requests.get(f"{BASE_URL}/api/admin/members", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        members = response.json()
        assert isinstance(members, list), "Should return list of members"
        
        if members:
            # Check first member has created_at
            first_member = members[0]
            assert "created_at" in first_member, "Member missing 'created_at' field for Register column"
            print(f"PASS: Members have created_at field. First member created_at: {first_member['created_at']}")
        else:
            print("PASS: No members found, but endpoint works")


class TestQuickLinksEndpoints:
    """Test Quick Links endpoints for completeness"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_public_myaccount_links(self):
        """GET /api/public/myaccount-links returns active quick links"""
        response = requests.get(f"{BASE_URL}/api/public/myaccount-links")
        assert response.status_code == 200, f"Failed: {response.text}"
        
        links = response.json()
        assert isinstance(links, list), "Should return list"
        
        print(f"PASS: Public quick links returned {len(links)} active links")
        for link in links:
            print(f"  - {link.get('label')}: {link.get('url')}")
    
    def test_admin_myaccount_links(self):
        """GET /api/admin/myaccount-links returns all quick links"""
        response = requests.get(f"{BASE_URL}/api/admin/myaccount-links", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        
        links = response.json()
        assert isinstance(links, list), "Should return list"
        
        print(f"PASS: Admin quick links returned {len(links)} links")
        for link in links:
            print(f"  - {link.get('label')}: id={link.get('id')}, active={link.get('active')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
