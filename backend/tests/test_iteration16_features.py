"""
Iteration 16 Tests: Banner Image Removal + Member Types CRUD + Extended Membership Fields
Tests:
1. Member Types CRUD endpoints
2. Admin login
3. Public endpoints for hero slides (no banner fallback)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """Test admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert data.get("user", {}).get("role") == "admin", "User is not admin"
        print(f"✓ Admin login successful, token received")
        return data["token"]
    
    def test_admin_login_wrong_password(self):
        """Test admin login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "WrongPassword123!"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Wrong password correctly rejected with 401")


class TestMemberTypesCRUD:
    """Member Types CRUD endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        if response.status_code == 200:
            self.token = response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Admin login failed")
    
    def test_get_member_types_list(self):
        """GET /api/admin/member-types returns member types list"""
        response = requests.get(f"{BASE_URL}/api/admin/member-types", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/admin/member-types returned {len(data)} types")
        # Check if seeded types exist
        type_names = [t.get("name") for t in data]
        print(f"  Types found: {type_names}")
        return data
    
    def test_create_member_type(self):
        """POST /api/admin/member-types creates a new member type"""
        new_type = {
            "name": "TEST_Premium",
            "description": "Premium membership type for testing",
            "order": 99
        }
        response = requests.post(f"{BASE_URL}/api/admin/member-types", 
                                 json=new_type, headers=self.headers)
        assert response.status_code in [200, 201], f"Create failed: {response.text}"
        data = response.json()
        assert data.get("name") == "TEST_Premium", "Name mismatch"
        assert "id" in data, "No ID returned"
        print(f"✓ Created member type: {data.get('name')} with ID: {data.get('id')}")
        return data
    
    def test_update_member_type(self):
        """PUT /api/admin/member-types/:id updates a member type"""
        # First create a type to update
        create_resp = requests.post(f"{BASE_URL}/api/admin/member-types", 
                                    json={"name": "TEST_ToUpdate", "order": 98},
                                    headers=self.headers)
        assert create_resp.status_code in [200, 201], f"Create failed: {create_resp.text}"
        type_id = create_resp.json().get("id")
        
        # Update it
        update_data = {"name": "TEST_Updated", "description": "Updated description", "order": 97}
        response = requests.put(f"{BASE_URL}/api/admin/member-types/{type_id}",
                               json=update_data, headers=self.headers)
        assert response.status_code == 200, f"Update failed: {response.text}"
        data = response.json()
        assert data.get("name") == "TEST_Updated", "Name not updated"
        print(f"✓ Updated member type {type_id} to name: {data.get('name')}")
        return data
    
    def test_delete_member_type(self):
        """DELETE /api/admin/member-types/:id deletes a member type"""
        # First create a type to delete
        create_resp = requests.post(f"{BASE_URL}/api/admin/member-types",
                                    json={"name": "TEST_ToDelete", "order": 96},
                                    headers=self.headers)
        assert create_resp.status_code in [200, 201], f"Create failed: {create_resp.text}"
        type_id = create_resp.json().get("id")
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/admin/member-types/{type_id}",
                                   headers=self.headers)
        assert response.status_code in [200, 204], f"Delete failed: {response.text}"
        print(f"✓ Deleted member type {type_id}")
        
        # Verify deletion
        get_resp = requests.get(f"{BASE_URL}/api/admin/member-types", headers=self.headers)
        types = get_resp.json()
        type_ids = [t.get("id") for t in types]
        assert type_id not in type_ids, "Type still exists after deletion"
        print(f"✓ Verified type {type_id} no longer exists")
    
    def test_seeded_member_types_exist(self):
        """Verify seeded member types: Individual, Corporate, Institutional"""
        response = requests.get(f"{BASE_URL}/api/admin/member-types", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        type_names = [t.get("name") for t in data]
        
        expected_types = ["Individual", "Corporate", "Institutional"]
        for expected in expected_types:
            assert expected in type_names, f"Seeded type '{expected}' not found"
            print(f"✓ Seeded type '{expected}' exists")


class TestHeroSlidesPerPage:
    """Test hero slides per-page assignment (no banner fallback)"""
    
    def test_hero_slides_home(self):
        """GET /api/public/hero-slides?page=home returns slides for home"""
        response = requests.get(f"{BASE_URL}/api/public/hero-slides?page=home")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        print(f"✓ Home page has {len(data)} hero slides")
    
    def test_hero_slides_news(self):
        """GET /api/public/hero-slides?page=news returns slides for news"""
        response = requests.get(f"{BASE_URL}/api/public/hero-slides?page=news")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        print(f"✓ News page has {len(data)} hero slides")
    
    def test_hero_slides_gallery(self):
        """GET /api/public/hero-slides?page=gallery returns slides for gallery"""
        response = requests.get(f"{BASE_URL}/api/public/hero-slides?page=gallery")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        print(f"✓ Gallery page has {len(data)} hero slides")
    
    def test_hero_slides_reading_list(self):
        """GET /api/public/hero-slides?page=reading-list returns slides"""
        response = requests.get(f"{BASE_URL}/api/public/hero-slides?page=reading-list")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        print(f"✓ Reading List page has {len(data)} hero slides")


class TestMembersEndpoints:
    """Test members endpoints with new membership fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        if response.status_code == 200:
            self.token = response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Admin login failed")
    
    def test_get_members_list(self):
        """GET /api/admin/members returns members list"""
        response = requests.get(f"{BASE_URL}/api/admin/members", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/admin/members returned {len(data)} members")
    
    def test_create_member_with_new_fields(self):
        """Create member with all new membership fields"""
        # Get a member type ID first
        types_resp = requests.get(f"{BASE_URL}/api/admin/member-types", headers=self.headers)
        member_types = types_resp.json() if types_resp.status_code == 200 else []
        member_type_id = member_types[0].get("id") if member_types else ""
        
        new_member = {
            "first_name": "TEST",
            "last_name": "MemberFields",
            "email": f"test_member_fields_{os.urandom(4).hex()}@test.com",
            "password": "TestPass123!",
            "role": "member",
            # New membership fields
            "membership_ranking": "Gold",
            "membership_status": "Professional",
            "active_date": "2024-01-01",
            "expiration_date": "2025-12-31",
            "membership_fee": "99.99",
            "member_type_id": member_type_id,
            "corporate": True,
            "application_reviewer": True,
            "opportunities_development": True,
            "opportunities_reviewer": False,
            "project_development": True,
            "project_reviewer": False,
            "project_management": True,
            "content_operator": False
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/members", 
                                json=new_member, headers=self.headers)
        assert response.status_code in [200, 201], f"Create failed: {response.text}"
        data = response.json()
        
        # Verify new fields are saved
        assert data.get("membership_ranking") == "Gold", "membership_ranking not saved"
        assert data.get("membership_status") == "Professional", "membership_status not saved"
        assert data.get("corporate") == True, "corporate not saved"
        assert data.get("application_reviewer") == True, "application_reviewer not saved"
        print(f"✓ Created member with new fields: {data.get('email')}")
        print(f"  - membership_ranking: {data.get('membership_ranking')}")
        print(f"  - membership_status: {data.get('membership_status')}")
        print(f"  - member_type_id: {data.get('member_type_id')}")
        print(f"  - corporate: {data.get('corporate')}")
        return data


class TestPublicEndpoints:
    """Test public endpoints still work"""
    
    def test_nav_pages(self):
        """GET /api/public/nav-pages returns pages"""
        response = requests.get(f"{BASE_URL}/api/public/nav-pages")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        print(f"✓ GET /api/public/nav-pages returned {len(data)} pages")
    
    def test_site_pages(self):
        """GET /api/public/site-pages returns system + custom pages"""
        response = requests.get(f"{BASE_URL}/api/public/site-pages")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        print(f"✓ GET /api/public/site-pages returned {len(data)} pages")
    
    def test_hero_slides_all(self):
        """GET /api/public/hero-slides returns all active slides"""
        response = requests.get(f"{BASE_URL}/api/public/hero-slides")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        print(f"✓ GET /api/public/hero-slides returned {len(data)} slides")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        if response.status_code == 200:
            self.token = response.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Admin login failed")
    
    def test_cleanup_test_member_types(self):
        """Clean up TEST_ prefixed member types"""
        response = requests.get(f"{BASE_URL}/api/admin/member-types", headers=self.headers)
        if response.status_code == 200:
            types = response.json()
            for t in types:
                if t.get("name", "").startswith("TEST_"):
                    del_resp = requests.delete(
                        f"{BASE_URL}/api/admin/member-types/{t['id']}", 
                        headers=self.headers
                    )
                    print(f"  Cleaned up type: {t.get('name')}")
        print("✓ Cleanup complete")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
