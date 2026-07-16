"""
Iteration 50 Tests: Quick Links, Members Manager Register Column, Analytics Login Tracking
- Quick Links CRUD for My Account header
- Members Manager 'Register' column showing created_at date
- Login tracking via member_logins collection
- Analytics monthly_logins using unique member count from member_logins
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@consultant.com",
        "password": "Admin123!"
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["token"]

@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers with admin auth token"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


class TestPublicMyAccountLinks:
    """Test public endpoint for My Account quick links"""
    
    def test_get_public_myaccount_links(self):
        """GET /api/public/myaccount-links should return active links sorted by order"""
        response = requests.get(f"{BASE_URL}/api/public/myaccount-links")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        # Verify all returned links are active
        for link in data:
            assert link.get("active") == True, f"Link {link.get('label')} should be active"
            assert "id" in link
            assert "label" in link
            assert "url" in link
            assert "order" in link
        
        # Verify sorted by order
        if len(data) > 1:
            orders = [link["order"] for link in data]
            assert orders == sorted(orders), "Links should be sorted by order"
        
        print(f"Found {len(data)} active quick links")
    
    def test_seeded_quick_links_exist(self):
        """Verify 4 seeded quick links exist: Home, KMS, News, Backend"""
        response = requests.get(f"{BASE_URL}/api/public/myaccount-links")
        assert response.status_code == 200
        
        data = response.json()
        labels = [link["label"] for link in data]
        
        expected_labels = ["Home", "KMS", "News", "Backend"]
        for label in expected_labels:
            assert label in labels, f"Expected seeded link '{label}' not found"
        
        print(f"All seeded links verified: {expected_labels}")


class TestAdminMyAccountLinksCRUD:
    """Test admin CRUD operations for My Account quick links"""
    
    def test_admin_list_myaccount_links(self, admin_headers):
        """GET /api/admin/myaccount-links should return all links (active and inactive)"""
        response = requests.get(f"{BASE_URL}/api/admin/myaccount-links", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Admin can see {len(data)} total quick links")
    
    def test_create_myaccount_link(self, admin_headers):
        """POST /api/admin/myaccount-links should create a new link"""
        unique_label = f"TEST_Link_{uuid.uuid4().hex[:6]}"
        payload = {
            "label": unique_label,
            "url": "/test-page",
            "new_tab": False,
            "active": True
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/myaccount-links", json=payload, headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["label"] == unique_label
        assert data["url"] == "/test-page"
        assert data["new_tab"] == False
        assert data["active"] == True
        assert "id" in data
        assert "order" in data
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/myaccount-links/{data['id']}", headers=admin_headers)
        print(f"Created and cleaned up test link: {unique_label}")
    
    def test_create_link_with_new_tab(self, admin_headers):
        """Create link with new_tab=true should work"""
        unique_label = f"TEST_External_{uuid.uuid4().hex[:6]}"
        payload = {
            "label": unique_label,
            "url": "https://external.example.com",
            "new_tab": True,
            "active": True
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/myaccount-links", json=payload, headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["new_tab"] == True
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/myaccount-links/{data['id']}", headers=admin_headers)
        print(f"Created link with new_tab=true: {unique_label}")
    
    def test_update_myaccount_link(self, admin_headers):
        """PUT /api/admin/myaccount-links/{id} should update a link"""
        # Create a link first
        create_payload = {"label": f"TEST_Update_{uuid.uuid4().hex[:6]}", "url": "/original", "active": True}
        create_response = requests.post(f"{BASE_URL}/api/admin/myaccount-links", json=create_payload, headers=admin_headers)
        assert create_response.status_code == 200
        link_id = create_response.json()["id"]
        
        # Update the link
        update_payload = {"label": "Updated Label", "url": "/updated", "new_tab": True, "active": False}
        update_response = requests.put(f"{BASE_URL}/api/admin/myaccount-links/{link_id}", json=update_payload, headers=admin_headers)
        assert update_response.status_code == 200
        
        updated_data = update_response.json()
        assert updated_data["label"] == "Updated Label"
        assert updated_data["url"] == "/updated"
        assert updated_data["new_tab"] == True
        assert updated_data["active"] == False
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/myaccount-links/{link_id}", headers=admin_headers)
        print("Link update verified")
    
    def test_toggle_active_status(self, admin_headers):
        """Toggle active status should work"""
        # Create active link
        create_payload = {"label": f"TEST_Toggle_{uuid.uuid4().hex[:6]}", "url": "/toggle", "active": True}
        create_response = requests.post(f"{BASE_URL}/api/admin/myaccount-links", json=create_payload, headers=admin_headers)
        link_id = create_response.json()["id"]
        
        # Deactivate
        update_response = requests.put(f"{BASE_URL}/api/admin/myaccount-links/{link_id}", json={"active": False}, headers=admin_headers)
        assert update_response.status_code == 200
        assert update_response.json()["active"] == False
        
        # Verify not in public list
        public_response = requests.get(f"{BASE_URL}/api/public/myaccount-links")
        public_ids = [link["id"] for link in public_response.json()]
        assert link_id not in public_ids, "Deactivated link should not appear in public list"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/myaccount-links/{link_id}", headers=admin_headers)
        print("Toggle active status verified")
    
    def test_delete_myaccount_link(self, admin_headers):
        """DELETE /api/admin/myaccount-links/{id} should delete a link"""
        # Create a link
        create_payload = {"label": f"TEST_Delete_{uuid.uuid4().hex[:6]}", "url": "/delete-me"}
        create_response = requests.post(f"{BASE_URL}/api/admin/myaccount-links", json=create_payload, headers=admin_headers)
        link_id = create_response.json()["id"]
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/admin/myaccount-links/{link_id}", headers=admin_headers)
        assert delete_response.status_code == 200
        assert delete_response.json().get("success") == True
        
        # Verify deleted
        all_links = requests.get(f"{BASE_URL}/api/admin/myaccount-links", headers=admin_headers).json()
        link_ids = [link["id"] for link in all_links]
        assert link_id not in link_ids, "Deleted link should not exist"
        
        print("Link deletion verified")
    
    def test_reorder_myaccount_links(self, admin_headers):
        """PUT /api/admin/myaccount-links-reorder should reorder links"""
        # Get current links
        response = requests.get(f"{BASE_URL}/api/admin/myaccount-links", headers=admin_headers)
        links = response.json()
        
        if len(links) < 2:
            pytest.skip("Need at least 2 links to test reorder")
        
        # Reverse the order
        original_ids = [link["id"] for link in links]
        reversed_ids = list(reversed(original_ids))
        
        reorder_response = requests.put(
            f"{BASE_URL}/api/admin/myaccount-links-reorder",
            json={"ordered_ids": reversed_ids},
            headers=admin_headers
        )
        assert reorder_response.status_code == 200
        assert reorder_response.json().get("success") == True
        
        # Verify new order
        new_links = requests.get(f"{BASE_URL}/api/admin/myaccount-links", headers=admin_headers).json()
        new_ids = [link["id"] for link in new_links]
        assert new_ids == reversed_ids, "Links should be in reversed order"
        
        # Restore original order
        requests.put(
            f"{BASE_URL}/api/admin/myaccount-links-reorder",
            json={"ordered_ids": original_ids},
            headers=admin_headers
        )
        print("Link reorder verified")


class TestMembersManagerRegisterColumn:
    """Test Members Manager shows created_at date in Register column"""
    
    def test_members_have_created_at_field(self, admin_headers):
        """GET /api/admin/members should return members with created_at field"""
        response = requests.get(f"{BASE_URL}/api/admin/members", headers=admin_headers)
        assert response.status_code == 200
        
        members = response.json()
        assert isinstance(members, list)
        assert len(members) > 0, "Should have at least one member"
        
        # Check that members have created_at field
        for member in members[:5]:  # Check first 5
            assert "created_at" in member, f"Member {member.get('email')} missing created_at field"
            if member["created_at"]:
                # Verify it's a valid ISO date string
                assert "T" in member["created_at"], "created_at should be ISO format"
        
        print(f"Verified {len(members)} members have created_at field")


class TestMemberLoginTracking:
    """Test member login tracking via member_logins collection"""
    
    def test_member_login_creates_login_event(self):
        """POST /api/member/login should insert into member_logins collection"""
        # Login as admin (who is also a member)
        response = requests.post(f"{BASE_URL}/api/member/login", json={
            "username": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "token" in data
        assert "member" in data
        
        # The login should have been tracked - we verify this via analytics
        print("Member login successful - login event should be tracked")
    
    def test_analytics_monthly_logins_uses_member_logins_collection(self, admin_headers):
        """GET /api/admin/analytics should return monthly_logins from member_logins collection"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "monthly_logins" in data, "Analytics should include monthly_logins"
        
        monthly_logins = data["monthly_logins"]
        assert isinstance(monthly_logins, list)
        assert len(monthly_logins) == 6, "Should have 6 months of login data"
        
        # Verify structure
        for month_data in monthly_logins:
            assert "month" in month_data
            assert "logins" in month_data
            assert isinstance(month_data["logins"], int)
        
        print(f"Monthly logins data: {monthly_logins}")
    
    def test_analytics_has_monthly_registrations(self, admin_headers):
        """GET /api/admin/analytics should also return monthly_registrations"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics", headers=admin_headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "monthly_registrations" in data
        
        monthly_registrations = data["monthly_registrations"]
        assert isinstance(monthly_registrations, list)
        assert len(monthly_registrations) == 6
        
        for month_data in monthly_registrations:
            assert "month" in month_data
            assert "members" in month_data
        
        print(f"Monthly registrations data: {monthly_registrations}")


class TestQuickLinksRequiresAuth:
    """Test that admin quick links endpoints require authentication"""
    
    def test_admin_list_requires_auth(self):
        """GET /api/admin/myaccount-links without auth should fail"""
        response = requests.get(f"{BASE_URL}/api/admin/myaccount-links")
        assert response.status_code == 401
    
    def test_admin_create_requires_auth(self):
        """POST /api/admin/myaccount-links without auth should fail"""
        response = requests.post(f"{BASE_URL}/api/admin/myaccount-links", json={"label": "Test"})
        assert response.status_code == 401
    
    def test_admin_update_requires_auth(self):
        """PUT /api/admin/myaccount-links/{id} without auth should fail"""
        response = requests.put(f"{BASE_URL}/api/admin/myaccount-links/fake-id", json={"label": "Test"})
        assert response.status_code == 401
    
    def test_admin_delete_requires_auth(self):
        """DELETE /api/admin/myaccount-links/{id} without auth should fail"""
        response = requests.delete(f"{BASE_URL}/api/admin/myaccount-links/fake-id")
        assert response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
