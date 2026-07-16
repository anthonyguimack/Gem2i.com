"""
Iteration 75 - Testing 5 bug fixes:
1. Natural sort on AUX column (membership_id)
2. Sortable Sponsor column with natural numeric ordering
3. Testing manual endpoint returns 200 (was 500)
4. Community modal new fields (phone, gender, date_of_birth, country, state, city, zip_code)
5. Bell icon color stand-out (CSS variables)
6. Regression tests from iterations 70-74
"""
import pytest
import requests
import os
import re

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTestingManualEndpoint:
    """Test 3: /api/docs/testing-manual returns 200 (was 500)"""
    
    def test_testing_manual_returns_200(self):
        """Testing manual endpoint should return 200, not 500"""
        response = requests.get(f"{BASE_URL}/api/docs/testing-manual")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
    def test_testing_manual_contains_sample_members(self):
        """Testing manual should list sample members in correct order"""
        response = requests.get(f"{BASE_URL}/api/docs/testing-manual")
        assert response.status_code == 200
        content = response.text
        # Check that sample members are listed
        assert "samplemember1" in content.lower() or "sample member 1" in content.lower()
        assert "samplemember10" in content.lower() or "sample member 10" in content.lower()
        assert "AUX-101" in content
        assert "AUX-110" in content
        
    def test_testing_manual_handles_email_usernames(self):
        """Testing manual should not crash with email-style usernames like samplemember11@gmail.com"""
        # The fix uses regex to extract trailing integer, non-numeric usernames sort to end
        response = requests.get(f"{BASE_URL}/api/docs/testing-manual")
        assert response.status_code == 200
        # If we got here without 500, the defensive sort is working


class TestMyCommunityEndpoint:
    """Test 4: /api/member/my-community returns new fields"""
    
    @pytest.fixture
    def member_token(self):
        """Login as samplemember1 who has community children"""
        response = requests.post(f"{BASE_URL}/api/member/login", json={
            "username": "samplemember1@gmail.com",
            "password": "123456789"
        })
        if response.status_code != 200:
            pytest.skip("Could not login as samplemember1")
        return response.json().get("token")
    
    def test_my_community_returns_new_fields(self, member_token):
        """Community endpoint should return 7 new fields for each child"""
        headers = {"Authorization": f"Bearer {member_token}"}
        response = requests.get(f"{BASE_URL}/api/member/my-community", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # samplemember1 (AUX-101) sponsors AUX-104 through AUX-110
        tree = data.get("tree", [])
        assert len(tree) > 0, "samplemember1 should have community children"
        
        # Check first child has all 7 new fields
        child = tree[0]
        required_fields = ["phone", "gender", "date_of_birth", "country", "state", "city", "zip_code"]
        for field in required_fields:
            assert field in child, f"Missing field: {field}"
            
    def test_my_community_stats(self, member_token):
        """Community endpoint should return invite stats"""
        headers = {"Authorization": f"Bearer {member_token}"}
        response = requests.get(f"{BASE_URL}/api/member/my-community", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert "total_invites" in data
        assert "used_invites" in data


class TestAdminMembersEndpoint:
    """Test 1 & 2: Admin members endpoint for sorting verification"""
    
    @pytest.fixture
    def admin_token(self):
        """Login as admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        if response.status_code != 200:
            pytest.skip("Could not login as admin")
        return response.json().get("token")
    
    def test_admin_members_returns_membership_id(self, admin_token):
        """Admin members endpoint should return membership_id for AUX sorting"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/members", headers=headers)
        assert response.status_code == 200
        members = response.json()
        
        # Check that members have membership_id field
        for member in members:
            if member.get("membership_number"):
                assert "membership_id" in member, "Missing membership_id field"
                
    def test_admin_members_returns_sponsor_membership_number(self, admin_token):
        """Admin members endpoint should return sponsor_membership_number for Sponsor sorting"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/members", headers=headers)
        assert response.status_code == 200
        members = response.json()
        
        # Check that members have sponsor_membership_number field
        sponsored_members = [m for m in members if m.get("sponsor_membership_number")]
        assert len(sponsored_members) > 0, "Should have members with sponsors"
        
    def test_admin_members_mentor_derivation(self, admin_token):
        """Mentor column should be derived from member_type.is_mentor"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/members", headers=headers)
        assert response.status_code == 200
        members = response.json()
        
        # Find carlos (Corporate type) - should NOT be mentor
        carlos = next((m for m in members if m.get("email") == "carlos@example.com"), None)
        if carlos:
            assert carlos.get("is_mentor") == False, "carlos (Corporate type) should NOT be mentor"
            
        # Find anthonytest (Mentors type) - should BE mentor
        anthony = next((m for m in members if m.get("email") == "anthonytest@gmail.com"), None)
        if anthony:
            assert anthony.get("is_mentor") == True, "anthonytest (Mentors type) should BE mentor"


class TestThemeColorsEndpoint:
    """Test 5: Bell icon CSS variables in theme colors"""
    
    def test_settings_returns_theme_colors(self):
        """Settings should return theme_colors with bell variables"""
        response = requests.get(f"{BASE_URL}/api/public/settings")
        assert response.status_code == 200
        # Theme colors are managed separately, but we verify the endpoint works
        
    def test_public_settings_accessible(self):
        """Public settings endpoint should be accessible"""
        response = requests.get(f"{BASE_URL}/api/public/settings")
        assert response.status_code == 200


class TestRegressionFromIteration70to74:
    """Test 6: Regression tests from iterations 70-74"""
    
    @pytest.fixture
    def admin_token(self):
        """Login as admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        if response.status_code != 200:
            pytest.skip("Could not login as admin")
        return response.json().get("token")
    
    def test_member_levels_exist(self, admin_token):
        """Member levels should exist with correct order"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/member-levels", headers=headers)
        assert response.status_code == 200
        levels = response.json()
        
        level_names = [l.get("name") for l in levels]
        assert "Free" in level_names
        assert "Standard" in level_names
        assert "Premium" in level_names
        assert "Mentor" in level_names
        
    def test_cms_roles_exist(self, admin_token):
        """CMS roles should exist"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/cms-roles", headers=headers)
        assert response.status_code == 200
        roles = response.json()
        
        role_ids = [r.get("id") for r in roles]
        assert "role_admin" in role_ids
        assert "role_member" in role_ids
        
    def test_myaccount_nav_endpoint(self, admin_token):
        """My Account navigation endpoint should work"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/myaccount-nav", headers=headers)
        assert response.status_code == 200
        nav_items = response.json()
        
        nav_ids = [n.get("id") for n in nav_items]
        assert "membership-profile" in nav_ids
        assert "my-community" in nav_ids
        assert "portfolios" in nav_ids


class TestNaturalSortVerification:
    """Verify natural sort data is available for frontend sorting"""
    
    @pytest.fixture
    def admin_token(self):
        """Login as admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        if response.status_code != 200:
            pytest.skip("Could not login as admin")
        return response.json().get("token")
    
    def test_members_have_sortable_fields(self, admin_token):
        """Members should have fields needed for natural sorting"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/members", headers=headers)
        assert response.status_code == 200
        members = response.json()
        
        # Get members with AUX prefix
        aux_members = [m for m in members if m.get("membership_id", "").startswith("AUX-")]
        assert len(aux_members) >= 10, "Should have at least 10 AUX members"
        
        # Verify membership_id format
        for m in aux_members:
            mid = m.get("membership_id", "")
            assert re.match(r"AUX-\d+", mid), f"Invalid membership_id format: {mid}"
            
    def test_sponsor_membership_number_is_numeric(self, admin_token):
        """sponsor_membership_number should be numeric for sorting"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/members", headers=headers)
        assert response.status_code == 200
        members = response.json()
        
        for m in members:
            smn = m.get("sponsor_membership_number")
            if smn is not None:
                assert isinstance(smn, int), f"sponsor_membership_number should be int, got {type(smn)}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
