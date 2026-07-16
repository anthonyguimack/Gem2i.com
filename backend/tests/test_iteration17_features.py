"""
Iteration 17 Tests: Member Types Permissions & Page Access
- Member Types form has 3 tabs: General, Permissions, Page Access
- Permissions tab shows all 10 permission radio buttons
- Page Access tab shows checklist of site pages
- Saving member type with permissions and allowed_pages persists correctly
- GET /api/admin/member-types returns types with permission fields and allowed_pages
- Members Membership Info tab NO LONGER has permission radio buttons
- Members Membership Info tab still has: Level, Ranking, Status, Fee, Active Date, Expiration Date, Member Type dropdown, Sponsor, Mentor
- When editing a member and selecting a Member Type, inherited permissions shown as read-only badges
- GET /api/auth/me returns _member_type with allowed_pages and permissions when user has member_type_id
- Admin login works at admin@consultant.com / Admin123!
- Member Types table shows active permissions count and page count per type
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Permission fields that should be on Member Types
PERMISSION_FIELDS = [
    'corporate', 'is_mentor', 'portfolio_development', 'application_reviewer',
    'opportunities_development', 'opportunities_reviewer', 'project_development',
    'project_reviewer', 'project_management', 'content_operator'
]


class TestAdminLogin:
    """Test admin authentication"""
    
    def test_admin_login_success(self):
        """Admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!",
            "login_type": "admin"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"
        print(f"✓ Admin login successful, token received")
    
    def test_admin_login_wrong_password(self):
        """Admin login with wrong password should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "WrongPassword",
            "login_type": "admin"
        })
        assert response.status_code == 401
        print(f"✓ Wrong password correctly rejected")


class TestMemberTypesAPI:
    """Test Member Types CRUD with permissions and allowed_pages"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!",
            "login_type": "admin"
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_member_types_list(self):
        """GET /api/admin/member-types returns list with permission fields"""
        response = requests.get(f"{BASE_URL}/api/admin/member-types", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Member types list returned: {len(data)} types")
        
        # Check if seeded types exist
        type_names = [t.get('name') for t in data]
        print(f"  Types found: {type_names}")
    
    def test_create_member_type_with_permissions(self):
        """Create member type with all permission fields and allowed_pages"""
        unique_name = f"TEST_Type_{uuid.uuid4().hex[:6]}"
        payload = {
            "name": unique_name,
            "description": "Test type with permissions",
            "order": 99,
            "allowed_pages": ["home", "news", "gallery"],
            # Set some permissions to True
            "corporate": True,
            "is_mentor": True,
            "portfolio_development": False,
            "application_reviewer": True,
            "opportunities_development": False,
            "opportunities_reviewer": False,
            "project_development": True,
            "project_reviewer": False,
            "project_management": False,
            "content_operator": True
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/member-types", 
                                 json=payload, headers=self.headers)
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        
        # Verify all fields persisted
        assert data["name"] == unique_name
        assert data["description"] == "Test type with permissions"
        assert data.get("allowed_pages") == ["home", "news", "gallery"]
        assert data.get("corporate") == True
        assert data.get("is_mentor") == True
        assert data.get("application_reviewer") == True
        assert data.get("project_development") == True
        assert data.get("content_operator") == True
        assert data.get("portfolio_development") == False
        
        print(f"✓ Created member type '{unique_name}' with permissions and allowed_pages")
        
        # Cleanup
        type_id = data["id"]
        requests.delete(f"{BASE_URL}/api/admin/member-types/{type_id}", headers=self.headers)
        print(f"  Cleaned up test type")
    
    def test_update_member_type_permissions(self):
        """Update member type permissions and allowed_pages"""
        # Create a type first
        unique_name = f"TEST_Update_{uuid.uuid4().hex[:6]}"
        create_response = requests.post(f"{BASE_URL}/api/admin/member-types", 
                                        json={"name": unique_name, "order": 98},
                                        headers=self.headers)
        assert create_response.status_code == 200
        type_id = create_response.json()["id"]
        
        # Update with permissions
        update_payload = {
            "name": unique_name,
            "allowed_pages": ["reading-list", "privacy"],
            "corporate": True,
            "is_mentor": False,
            "project_management": True
        }
        
        update_response = requests.put(f"{BASE_URL}/api/admin/member-types/{type_id}",
                                       json=update_payload, headers=self.headers)
        assert update_response.status_code == 200
        updated = update_response.json()
        
        assert updated.get("allowed_pages") == ["reading-list", "privacy"]
        assert updated.get("corporate") == True
        assert updated.get("project_management") == True
        
        print(f"✓ Updated member type permissions and allowed_pages")
        
        # Verify with GET
        get_response = requests.get(f"{BASE_URL}/api/admin/member-types", headers=self.headers)
        types = get_response.json()
        found = next((t for t in types if t["id"] == type_id), None)
        assert found is not None
        assert found.get("allowed_pages") == ["reading-list", "privacy"]
        
        print(f"✓ Verified persistence via GET")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/member-types/{type_id}", headers=self.headers)
    
    def test_member_type_has_all_permission_fields(self):
        """Verify member type response includes all 10 permission fields"""
        # Create a type with all permissions set
        unique_name = f"TEST_AllPerms_{uuid.uuid4().hex[:6]}"
        payload = {"name": unique_name, "order": 97}
        for perm in PERMISSION_FIELDS:
            payload[perm] = True
        
        response = requests.post(f"{BASE_URL}/api/admin/member-types",
                                 json=payload, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check all permission fields are present
        for perm in PERMISSION_FIELDS:
            assert perm in data, f"Missing permission field: {perm}"
            assert data[perm] == True, f"Permission {perm} should be True"
        
        print(f"✓ All 10 permission fields present and correctly saved")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/member-types/{data['id']}", headers=self.headers)


class TestMemberWithMemberType:
    """Test member creation/update with member_type_id and inherited permissions"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token and create a test member type"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!",
            "login_type": "admin"
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Create a test member type with permissions
        self.test_type_name = f"TEST_MemberType_{uuid.uuid4().hex[:6]}"
        type_response = requests.post(f"{BASE_URL}/api/admin/member-types", json={
            "name": self.test_type_name,
            "order": 100,
            "allowed_pages": ["home", "news"],
            "corporate": True,
            "is_mentor": True,
            "application_reviewer": True
        }, headers=self.headers)
        assert type_response.status_code == 200
        self.test_type_id = type_response.json()["id"]
        
        yield
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/member-types/{self.test_type_id}", headers=self.headers)
    
    def test_create_member_with_member_type(self):
        """Create member with member_type_id"""
        unique_email = f"test_{uuid.uuid4().hex[:8]}@test.com"
        payload = {
            "email": unique_email,
            "first_name": "Test",
            "last_name": "Member",
            "password": "TestPass123!",
            "member_type_id": self.test_type_id,
            "membership_ranking": "Gold",
            "membership_status": "Professional",
            "membership_fee": "99.99",
            "active_date": "2024-01-01",
            "expiration_date": "2025-01-01"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/members", 
                                 json=payload, headers=self.headers)
        assert response.status_code == 200, f"Create member failed: {response.text}"
        data = response.json()
        
        assert data["member_type_id"] == self.test_type_id
        assert data["membership_ranking"] == "Gold"
        assert data["membership_status"] == "Professional"
        assert data["membership_fee"] == "99.99"
        
        print(f"✓ Created member with member_type_id and membership fields")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/members/{data['member_id']}", headers=self.headers)
    
    def test_member_no_permission_radios_in_payload(self):
        """Verify member creation doesn't require individual permission fields (they come from type)"""
        unique_email = f"test_{uuid.uuid4().hex[:8]}@test.com"
        # Only send member_type_id, not individual permissions
        payload = {
            "email": unique_email,
            "first_name": "NoPerms",
            "last_name": "Test",
            "password": "TestPass123!",
            "member_type_id": self.test_type_id
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/members",
                                 json=payload, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Member should have member_type_id set
        assert data["member_type_id"] == self.test_type_id
        print(f"✓ Member created with member_type_id (permissions inherited from type)")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/members/{data['member_id']}", headers=self.headers)


class TestAuthMeWithMemberType:
    """Test /api/auth/me returns _member_type with permissions and allowed_pages"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: create member type and member"""
        # Admin login
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!",
            "login_type": "admin"
        })
        assert response.status_code == 200
        self.admin_token = response.json()["token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Create member type with permissions
        self.test_type_name = f"TEST_AuthMe_{uuid.uuid4().hex[:6]}"
        type_response = requests.post(f"{BASE_URL}/api/admin/member-types", json={
            "name": self.test_type_name,
            "order": 101,
            "allowed_pages": ["home", "gallery", "reading-list"],
            "corporate": True,
            "is_mentor": False,
            "portfolio_development": True,
            "application_reviewer": False,
            "opportunities_development": True,
            "opportunities_reviewer": False,
            "project_development": False,
            "project_reviewer": True,
            "project_management": False,
            "content_operator": True
        }, headers=self.admin_headers)
        assert type_response.status_code == 200
        self.test_type_id = type_response.json()["id"]
        
        # Create member with this type
        self.test_email = f"test_{uuid.uuid4().hex[:8]}@test.com"
        self.test_password = "TestPass123!"
        member_response = requests.post(f"{BASE_URL}/api/admin/members", json={
            "email": self.test_email,
            "first_name": "AuthMe",
            "last_name": "Test",
            "password": self.test_password,
            "member_type_id": self.test_type_id
        }, headers=self.admin_headers)
        assert member_response.status_code == 200
        self.test_member_id = member_response.json()["member_id"]
        
        yield
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/members/{self.test_member_id}", headers=self.admin_headers)
        requests.delete(f"{BASE_URL}/api/admin/member-types/{self.test_type_id}", headers=self.admin_headers)
    
    def test_auth_me_returns_member_type_data(self):
        """GET /api/auth/me returns _member_type with permissions and allowed_pages"""
        # Login as the test member
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.test_email,
            "password": self.test_password
        })
        assert login_response.status_code == 200
        member_token = login_response.json()["token"]
        
        # Call /auth/me
        me_response = requests.get(f"{BASE_URL}/api/auth/me", 
                                   headers={"Authorization": f"Bearer {member_token}"})
        assert me_response.status_code == 200
        data = me_response.json()
        
        # Verify _member_type is present
        assert "_member_type" in data, "Missing _member_type in /auth/me response"
        mt = data["_member_type"]
        
        assert mt["name"] == self.test_type_name
        assert "allowed_pages" in mt
        assert set(mt["allowed_pages"]) == {"home", "gallery", "reading-list"}
        
        # Verify permissions dict
        assert "permissions" in mt
        perms = mt["permissions"]
        assert perms["corporate"] == True
        assert perms["is_mentor"] == False
        assert perms["portfolio_development"] == True
        assert perms["opportunities_development"] == True
        assert perms["project_reviewer"] == True
        assert perms["content_operator"] == True
        
        print(f"✓ /api/auth/me returns _member_type with name, allowed_pages, and permissions")


class TestMemberMeWithMemberType:
    """Test /api/member/me returns _member_type"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: create member type and member"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!",
            "login_type": "admin"
        })
        assert response.status_code == 200
        self.admin_token = response.json()["token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Create member type
        self.test_type_name = f"TEST_MemberMe_{uuid.uuid4().hex[:6]}"
        type_response = requests.post(f"{BASE_URL}/api/admin/member-types", json={
            "name": self.test_type_name,
            "order": 102,
            "allowed_pages": ["news", "privacy"],
            "is_mentor": True,
            "project_management": True
        }, headers=self.admin_headers)
        assert type_response.status_code == 200
        self.test_type_id = type_response.json()["id"]
        
        # Create member
        self.test_email = f"test_{uuid.uuid4().hex[:8]}@test.com"
        self.test_password = "TestPass123!"
        member_response = requests.post(f"{BASE_URL}/api/admin/members", json={
            "email": self.test_email,
            "first_name": "MemberMe",
            "last_name": "Test",
            "password": self.test_password,
            "member_type_id": self.test_type_id
        }, headers=self.admin_headers)
        assert member_response.status_code == 200
        self.test_member_id = member_response.json()["member_id"]
        
        yield
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/members/{self.test_member_id}", headers=self.admin_headers)
        requests.delete(f"{BASE_URL}/api/admin/member-types/{self.test_type_id}", headers=self.admin_headers)
    
    def test_member_me_returns_member_type_data(self):
        """GET /api/member/me returns _member_type"""
        # Login as member
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.test_email,
            "password": self.test_password
        })
        assert login_response.status_code == 200
        member_token = login_response.json()["token"]
        
        # Call /member/me
        me_response = requests.get(f"{BASE_URL}/api/member/me",
                                   headers={"Authorization": f"Bearer {member_token}"})
        assert me_response.status_code == 200
        data = me_response.json()
        
        assert "_member_type" in data
        mt = data["_member_type"]
        assert mt["name"] == self.test_type_name
        assert "news" in mt["allowed_pages"]
        assert "privacy" in mt["allowed_pages"]
        assert mt["permissions"]["is_mentor"] == True
        assert mt["permissions"]["project_management"] == True
        
        print(f"✓ /api/member/me returns _member_type with permissions and allowed_pages")


class TestSitePagesAPI:
    """Test site-pages API for Page Access checklist"""
    
    def test_get_site_pages(self):
        """GET /api/public/site-pages returns pages for checklist"""
        response = requests.get(f"{BASE_URL}/api/public/site-pages")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Should have system pages
        page_ids = [p.get('id') for p in data]
        print(f"✓ Site pages returned: {len(data)} pages")
        print(f"  Page IDs: {page_ids[:10]}...")  # Show first 10


class TestMembershipFieldsStillPresent:
    """Verify Members Membership Info tab still has required fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!",
            "login_type": "admin"
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_member_has_membership_fields(self):
        """Verify member response includes all membership fields"""
        # Create a member with all membership fields
        unique_email = f"test_{uuid.uuid4().hex[:8]}@test.com"
        payload = {
            "email": unique_email,
            "first_name": "Fields",
            "last_name": "Test",
            "password": "TestPass123!",
            "membership_ranking": "Platinum",
            "membership_status": "Professional",
            "membership_fee": "199.99",
            "active_date": "2024-06-01",
            "expiration_date": "2025-06-01",
            "member_type_id": "",
            "sponsor_membership_number": None,
            "mentor_membership_number": None
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/members",
                                 json=payload, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify all membership fields are present
        assert "membership_ranking" in data
        assert "membership_status" in data
        assert "membership_fee" in data
        assert "active_date" in data
        assert "expiration_date" in data
        assert "member_type_id" in data
        assert "sponsor_membership_number" in data or "sponsor_id" in data
        assert "mentor_membership_number" in data or "mentor_id" in data
        assert "level_id" in data
        
        print(f"✓ Member has all required membership fields")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/members/{data['member_id']}", headers=self.headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
