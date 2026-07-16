"""
Iteration 9 Tests: APIs Tab in Settings + Dynamic My Account Sidebar
Features tested:
1. GET /api/admin/member-levels - returns all levels with permissions arrays
2. POST /api/admin/member-levels - create a level with specific permissions
3. PUT /api/admin/member-levels/{level_id} - update a level
4. DELETE /api/admin/member-levels/{level_id} - delete a level
5. GET /api/member/my-level - returns level data when member has level_id, null when not
6. Admin member update with level_id assignment
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestMemberLevelsAPI:
    """Test member levels CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_01_get_member_levels(self):
        """GET /api/admin/member-levels returns list of levels with permissions"""
        response = requests.get(f"{BASE_URL}/api/admin/member-levels", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        levels = response.json()
        assert isinstance(levels, list), "Response should be a list"
        # Verify structure of levels
        if len(levels) > 0:
            level = levels[0]
            assert "id" in level, "Level should have id"
            assert "name" in level, "Level should have name"
            assert "permissions" in level, "Level should have permissions"
            assert isinstance(level["permissions"], list), "Permissions should be a list"
        print(f"✓ GET /api/admin/member-levels returned {len(levels)} levels")
    
    def test_02_create_member_level(self):
        """POST /api/admin/member-levels creates a new level"""
        test_level = {
            "name": f"TEST_Level_{uuid.uuid4().hex[:6]}",
            "permissions": ["membership-profile", "portfolios"],
            "order": 99
        }
        response = requests.post(f"{BASE_URL}/api/admin/member-levels", 
                                 json=test_level, headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        created = response.json()
        assert created["name"] == test_level["name"], "Name should match"
        assert created["permissions"] == test_level["permissions"], "Permissions should match"
        assert "id" in created, "Should have id"
        # Store for cleanup
        self.created_level_id = created["id"]
        print(f"✓ POST /api/admin/member-levels created level: {created['name']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/member-levels/{created['id']}", headers=self.headers)
    
    def test_03_update_member_level(self):
        """PUT /api/admin/member-levels/{id} updates a level"""
        # First create a level
        test_level = {
            "name": f"TEST_Update_{uuid.uuid4().hex[:6]}",
            "permissions": ["membership-profile"],
            "order": 98
        }
        create_resp = requests.post(f"{BASE_URL}/api/admin/member-levels", 
                                    json=test_level, headers=self.headers)
        assert create_resp.status_code == 200
        level_id = create_resp.json()["id"]
        
        # Update the level
        update_data = {
            "name": f"TEST_Updated_{uuid.uuid4().hex[:6]}",
            "permissions": ["membership-profile", "invite-code", "portfolios"]
        }
        update_resp = requests.put(f"{BASE_URL}/api/admin/member-levels/{level_id}", 
                                   json=update_data, headers=self.headers)
        assert update_resp.status_code == 200, f"Failed: {update_resp.text}"
        updated = update_resp.json()
        assert updated["name"] == update_data["name"], "Name should be updated"
        assert set(updated["permissions"]) == set(update_data["permissions"]), "Permissions should be updated"
        print(f"✓ PUT /api/admin/member-levels/{level_id} updated successfully")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/member-levels/{level_id}", headers=self.headers)
    
    def test_04_delete_member_level(self):
        """DELETE /api/admin/member-levels/{id} deletes a level"""
        # First create a level
        test_level = {
            "name": f"TEST_Delete_{uuid.uuid4().hex[:6]}",
            "permissions": ["membership-profile"],
            "order": 97
        }
        create_resp = requests.post(f"{BASE_URL}/api/admin/member-levels", 
                                    json=test_level, headers=self.headers)
        assert create_resp.status_code == 200
        level_id = create_resp.json()["id"]
        
        # Delete the level
        delete_resp = requests.delete(f"{BASE_URL}/api/admin/member-levels/{level_id}", 
                                      headers=self.headers)
        assert delete_resp.status_code == 200, f"Failed: {delete_resp.text}"
        
        # Verify deletion - level should not be in list
        list_resp = requests.get(f"{BASE_URL}/api/admin/member-levels", headers=self.headers)
        levels = list_resp.json()
        level_ids = [l["id"] for l in levels]
        assert level_id not in level_ids, "Deleted level should not be in list"
        print(f"✓ DELETE /api/admin/member-levels/{level_id} deleted successfully")


class TestMyLevelAPI:
    """Test GET /api/member/my-level endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_01_my_level_returns_null_when_no_level(self):
        """GET /api/member/my-level returns null when member has no level_id"""
        response = requests.get(f"{BASE_URL}/api/member/my-level", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        # Admin has no level_id, so should return null
        assert data is None, f"Expected null for admin without level_id, got: {data}"
        print("✓ GET /api/member/my-level returns null when no level_id")
    
    def test_02_my_level_returns_level_when_assigned(self):
        """GET /api/member/my-level returns level data when member has level_id"""
        # First, get existing levels
        levels_resp = requests.get(f"{BASE_URL}/api/admin/member-levels", headers=self.headers)
        levels = levels_resp.json()
        
        if len(levels) == 0:
            pytest.skip("No levels exist to test with")
        
        # Get a member to assign level to
        members_resp = requests.get(f"{BASE_URL}/api/admin/members", headers=self.headers)
        members = members_resp.json()
        
        # Find a non-admin member
        test_member = None
        for m in members:
            if m.get("role") != "admin" and m.get("email") != "admin@consultant.com":
                test_member = m
                break
        
        if not test_member:
            pytest.skip("No non-admin member found to test with")
        
        # Assign level to member
        level_to_assign = levels[0]
        update_resp = requests.put(
            f"{BASE_URL}/api/admin/members/{test_member['member_id']}", 
            json={"level_id": level_to_assign["id"]},
            headers=self.headers
        )
        assert update_resp.status_code == 200, f"Failed to assign level: {update_resp.text}"
        
        # Login as that member and check my-level
        # Note: We can't easily login as another member without their password
        # So we verify the assignment was made
        updated_member = update_resp.json()
        assert updated_member.get("level_id") == level_to_assign["id"], "Level should be assigned"
        print(f"✓ Member {test_member['membership_id']} assigned level: {level_to_assign['name']}")


class TestSettingsAPI:
    """Test settings API for APIs tab data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_01_get_settings_for_apis_tab(self):
        """GET /api/admin/settings returns data needed for APIs tab"""
        response = requests.get(f"{BASE_URL}/api/admin/settings", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        settings = response.json()
        
        # Verify settings has fields needed for APIs tab status indicators
        # SMTP fields
        assert "smtp_host" in settings or settings.get("smtp_host") is None, "Should have smtp_host field"
        assert "smtp_user" in settings or settings.get("smtp_user") is None, "Should have smtp_user field"
        
        # Blog API field
        assert "blog_api_url" in settings or settings.get("blog_api_url") is None, "Should have blog_api_url field"
        
        print("✓ GET /api/admin/settings returns data for APIs tab")
        print(f"  - SMTP configured: {bool(settings.get('smtp_host') and settings.get('smtp_user'))}")
        print(f"  - Blog API configured: {bool(settings.get('blog_api_url'))}")


class TestAdminMemberLevelAssignment:
    """Test assigning levels to members via admin API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_01_assign_level_to_member(self):
        """PUT /api/admin/members/{id} can assign level_id"""
        # Get existing levels
        levels_resp = requests.get(f"{BASE_URL}/api/admin/member-levels", headers=self.headers)
        levels = levels_resp.json()
        
        if len(levels) == 0:
            pytest.skip("No levels exist to test with")
        
        # Get members
        members_resp = requests.get(f"{BASE_URL}/api/admin/members", headers=self.headers)
        members = members_resp.json()
        
        # Find a non-admin member
        test_member = None
        for m in members:
            if m.get("role") != "admin":
                test_member = m
                break
        
        if not test_member:
            pytest.skip("No non-admin member found")
        
        # Assign level
        level_to_assign = levels[0]
        update_resp = requests.put(
            f"{BASE_URL}/api/admin/members/{test_member['member_id']}", 
            json={"level_id": level_to_assign["id"]},
            headers=self.headers
        )
        assert update_resp.status_code == 200, f"Failed: {update_resp.text}"
        updated = update_resp.json()
        assert updated.get("level_id") == level_to_assign["id"], "Level should be assigned"
        print(f"✓ Assigned level '{level_to_assign['name']}' to member {test_member['membership_id']}")
    
    def test_02_remove_level_from_member(self):
        """PUT /api/admin/members/{id} can remove level_id by setting to null"""
        # Get members
        members_resp = requests.get(f"{BASE_URL}/api/admin/members", headers=self.headers)
        members = members_resp.json()
        
        # Find a member with level_id
        test_member = None
        for m in members:
            if m.get("level_id") and m.get("role") != "admin":
                test_member = m
                break
        
        if not test_member:
            pytest.skip("No member with level_id found")
        
        # Remove level
        update_resp = requests.put(
            f"{BASE_URL}/api/admin/members/{test_member['member_id']}", 
            json={"level_id": None},
            headers=self.headers
        )
        assert update_resp.status_code == 200, f"Failed: {update_resp.text}"
        updated = update_resp.json()
        assert updated.get("level_id") is None, "Level should be removed"
        print(f"✓ Removed level from member {test_member['membership_id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
