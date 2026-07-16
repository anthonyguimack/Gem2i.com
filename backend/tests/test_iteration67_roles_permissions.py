"""
Iteration 67: CMS Roles & Permissions System Tests

Tests:
1. Admin login returns cms_roles and effective_permissions
2. GET /api/admin/cms-sections returns sections/groups (no admin_only keys)
3. GET /api/admin/cms-roles returns seeded system roles + custom roles
4. POST /api/admin/cms-roles creates new role
5. PUT /api/admin/cms-roles/{role_id} updates role
6. DELETE /api/admin/cms-roles/{role_id} - system roles protected
7. PUT /api/admin/members/{member_id}/cms-roles assigns roles
8. Operator login returns correct cms_roles and effective_permissions
9. Permission enforcement - operator access allowed/denied sections
10. Admin-only routes protected from operators
11. Admin regression - full access to all pages
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@consultant.com"
ADMIN_PASSWORD = "Admin123!"
OPERATOR_EMAIL = "carlos@example.com"
OPERATOR_PASSWORD = "Test123!"
CARLOS_MEMBER_ID = "member_f8496347f44d"


class TestAdminAuthAndPermissions:
    """Test admin login returns cms_roles and effective_permissions"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_admin_login_returns_cms_roles(self):
        """POST /api/auth/login + GET /api/auth/me returns cms_roles and effective_permissions for admin"""
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        
        # Store token for subsequent requests
        token = data["token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get /auth/me
        me_response = self.session.get(f"{BASE_URL}/api/auth/me")
        assert me_response.status_code == 200, f"Auth me failed: {me_response.text}"
        me_data = me_response.json()
        
        # Verify cms_roles contains role_admin
        assert "cms_roles" in me_data, "cms_roles not in /auth/me response"
        assert "role_admin" in me_data["cms_roles"], f"role_admin not in cms_roles: {me_data['cms_roles']}"
        
        # Verify effective_permissions has ~42 keys
        assert "effective_permissions" in me_data, "effective_permissions not in /auth/me response"
        perms = me_data["effective_permissions"]
        assert len(perms) >= 40, f"Expected ~42 permissions, got {len(perms)}: {perms}"
        print(f"Admin has {len(perms)} effective_permissions")


class TestCmsSectionsEndpoint:
    """Test GET /api/admin/cms-sections"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        token = response.json()["token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_cms_sections_returns_groups_and_sections(self):
        """GET /api/admin/cms-sections returns sections and groups"""
        response = self.session.get(f"{BASE_URL}/api/admin/cms-sections")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        assert "sections" in data, "sections not in response"
        assert "groups" in data, "groups not in response"
        
        sections = data["sections"]
        groups = data["groups"]
        
        # Should have ~41 sections (excluding admin_only roles_permissions)
        assert len(sections) >= 40, f"Expected ~41 sections, got {len(sections)}"
        
        # Verify roles_permissions is NOT in the list (admin_only)
        section_keys = [s["key"] for s in sections]
        assert "roles_permissions" not in section_keys, "roles_permissions should be filtered out (admin_only)"
        
        # Verify groups exist
        assert len(groups) >= 8, f"Expected 9 groups, got {len(groups)}"
        print(f"Got {len(sections)} sections and {len(groups)} groups")


class TestCmsRolesCRUD:
    """Test CMS Roles CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        token = response.json()["token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.created_role_id = None
    
    def test_list_cms_roles_returns_system_roles(self):
        """GET /api/admin/cms-roles returns seeded system roles"""
        response = self.session.get(f"{BASE_URL}/api/admin/cms-roles")
        assert response.status_code == 200, f"Failed: {response.text}"
        roles = response.json()
        
        # Should have at least role_admin and role_member
        role_ids = [r["id"] for r in roles]
        assert "role_admin" in role_ids, "role_admin not found"
        assert "role_member" in role_ids, "role_member not found"
        
        # Verify member_count is present
        for role in roles:
            assert "member_count" in role, f"member_count missing from role {role['id']}"
        
        print(f"Found {len(roles)} roles: {role_ids}")
    
    def test_create_cms_role(self):
        """POST /api/admin/cms-roles creates a new role"""
        response = self.session.post(f"{BASE_URL}/api/admin/cms-roles", json={
            "name": "TEST_Operator Test",
            "description": "Test operator role",
            "permissions": ["blog", "services", "dashboard", "analytics"]
        })
        assert response.status_code == 200, f"Failed to create role: {response.text}"
        role = response.json()
        
        assert role["name"] == "TEST_Operator Test"
        assert "id" in role
        assert role["is_system"] == False
        assert set(role["permissions"]) == {"blog", "services", "dashboard", "analytics"}
        
        self.created_role_id = role["id"]
        print(f"Created role: {role['id']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/cms-roles/{self.created_role_id}")
    
    def test_update_cms_role(self):
        """PUT /api/admin/cms-roles/{role_id} updates a non-system role"""
        # First create a role
        create_resp = self.session.post(f"{BASE_URL}/api/admin/cms-roles", json={
            "name": "TEST_Update Role",
            "permissions": ["dashboard"]
        })
        assert create_resp.status_code == 200
        role_id = create_resp.json()["id"]
        
        # Update it
        update_resp = self.session.put(f"{BASE_URL}/api/admin/cms-roles/{role_id}", json={
            "name": "TEST_Updated Role Name",
            "description": "Updated description",
            "permissions": ["dashboard", "analytics", "blog"]
        })
        assert update_resp.status_code == 200, f"Failed to update: {update_resp.text}"
        updated = update_resp.json()
        
        assert updated["name"] == "TEST_Updated Role Name"
        assert updated["description"] == "Updated description"
        assert set(updated["permissions"]) == {"dashboard", "analytics", "blog"}
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/cms-roles/{role_id}")
        print(f"Updated and cleaned up role: {role_id}")
    
    def test_delete_non_system_role_succeeds(self):
        """DELETE /api/admin/cms-roles/{role_id} on non-system role succeeds"""
        # Create a role
        create_resp = self.session.post(f"{BASE_URL}/api/admin/cms-roles", json={
            "name": "TEST_Delete Me",
            "permissions": ["dashboard"]
        })
        assert create_resp.status_code == 200
        role_id = create_resp.json()["id"]
        
        # Delete it
        delete_resp = self.session.delete(f"{BASE_URL}/api/admin/cms-roles/{role_id}")
        assert delete_resp.status_code == 200, f"Failed to delete: {delete_resp.text}"
        
        # Verify it's gone
        list_resp = self.session.get(f"{BASE_URL}/api/admin/cms-roles")
        role_ids = [r["id"] for r in list_resp.json()]
        assert role_id not in role_ids, "Role should be deleted"
        print(f"Successfully deleted role: {role_id}")
    
    def test_delete_system_role_fails(self):
        """DELETE /api/admin/cms-roles/{role_id} on system role returns 400"""
        # Try to delete role_admin
        response = self.session.delete(f"{BASE_URL}/api/admin/cms-roles/role_admin")
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "System roles cannot be deleted" in response.text
        
        # Try to delete role_member
        response = self.session.delete(f"{BASE_URL}/api/admin/cms-roles/role_member")
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "System roles cannot be deleted" in response.text
        print("System roles correctly protected from deletion")


class TestMemberRoleAssignment:
    """Test assigning CMS roles to members"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        token = response.json()["token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.test_role_id = None
    
    def test_assign_cms_roles_to_member(self):
        """PUT /api/admin/members/{member_id}/cms-roles assigns roles"""
        # First create a test role
        create_resp = self.session.post(f"{BASE_URL}/api/admin/cms-roles", json={
            "name": "TEST_Analyst Role",
            "permissions": ["dashboard", "analytics", "blog"]
        })
        assert create_resp.status_code == 200
        self.test_role_id = create_resp.json()["id"]
        
        # Assign to carlos
        assign_resp = self.session.put(
            f"{BASE_URL}/api/admin/members/{CARLOS_MEMBER_ID}/cms-roles",
            json={"cms_roles": ["role_member", self.test_role_id]}
        )
        assert assign_resp.status_code == 200, f"Failed to assign: {assign_resp.text}"
        member = assign_resp.json()
        
        assert "cms_roles" in member
        assert self.test_role_id in member["cms_roles"]
        print(f"Assigned roles to carlos: {member['cms_roles']}")
        
        # Verify via GET /api/admin/members
        members_resp = self.session.get(f"{BASE_URL}/api/admin/members")
        assert members_resp.status_code == 200
        members = members_resp.json()
        carlos = next((m for m in members if m.get("member_id") == CARLOS_MEMBER_ID), None)
        assert carlos is not None, "Carlos not found in members list"
        assert self.test_role_id in carlos.get("cms_roles", [])
        
    def teardown_method(self, method):
        # Cleanup: remove test role from carlos and delete it
        if self.test_role_id:
            self.session.put(
                f"{BASE_URL}/api/admin/members/{CARLOS_MEMBER_ID}/cms-roles",
                json={"cms_roles": ["role_member"]}
            )
            self.session.delete(f"{BASE_URL}/api/admin/cms-roles/{self.test_role_id}")


class TestOperatorPermissions:
    """Test operator login and permission enforcement"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.admin_session = requests.Session()
        self.admin_session.headers.update({"Content-Type": "application/json"})
        self.operator_session = requests.Session()
        self.operator_session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.admin_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        admin_token = response.json()["token"]
        self.admin_session.headers.update({"Authorization": f"Bearer {admin_token}"})
        
        # Create test role for operator
        create_resp = self.admin_session.post(f"{BASE_URL}/api/admin/cms-roles", json={
            "name": "TEST_Operator Analyst",
            "permissions": ["dashboard", "analytics", "blog"]
        })
        assert create_resp.status_code == 200
        self.test_role_id = create_resp.json()["id"]
        
        # Assign to carlos
        self.admin_session.put(
            f"{BASE_URL}/api/admin/members/{CARLOS_MEMBER_ID}/cms-roles",
            json={"cms_roles": ["role_member", self.test_role_id]}
        )
    
    def test_operator_login_returns_correct_permissions(self):
        """Login as carlos returns cms_roles and effective_permissions"""
        # Login as operator
        response = self.operator_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": OPERATOR_EMAIL,
            "password": OPERATOR_PASSWORD
        })
        assert response.status_code == 200, f"Operator login failed: {response.text}"
        token = response.json()["token"]
        self.operator_session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get /auth/me
        me_resp = self.operator_session.get(f"{BASE_URL}/api/auth/me")
        assert me_resp.status_code == 200
        me_data = me_resp.json()
        
        assert me_data.get("role") == "member", f"Expected role=member, got {me_data.get('role')}"
        assert "cms_roles" in me_data
        assert self.test_role_id in me_data["cms_roles"]
        
        # Verify effective_permissions matches role's permissions
        perms = me_data.get("effective_permissions", [])
        assert "dashboard" in perms
        assert "analytics" in perms
        assert "blog" in perms
        # Should NOT have admin-only permissions
        assert "roles_permissions" not in perms
        print(f"Operator effective_permissions: {perms}")
    
    def test_operator_access_allowed_sections(self):
        """Operator can access sections they have permission for"""
        # Login as operator
        response = self.operator_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": OPERATOR_EMAIL,
            "password": OPERATOR_PASSWORD
        })
        token = response.json()["token"]
        self.operator_session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Access blog (allowed)
        blog_resp = self.operator_session.get(f"{BASE_URL}/api/admin/blog")
        assert blog_resp.status_code == 200, f"Blog access denied: {blog_resp.text}"
        print("Operator can access /api/admin/blog - PASS")
        
        # Access analytics (allowed)
        analytics_resp = self.operator_session.get(f"{BASE_URL}/api/admin/analytics")
        assert analytics_resp.status_code == 200, f"Analytics access denied: {analytics_resp.text}"
        print("Operator can access /api/admin/analytics - PASS")
    
    def test_operator_access_denied_sections(self):
        """Operator gets 403 for sections they don't have permission for"""
        # Login as operator
        response = self.operator_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": OPERATOR_EMAIL,
            "password": OPERATOR_PASSWORD
        })
        token = response.json()["token"]
        self.operator_session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Access services (NOT allowed - not in permissions)
        services_resp = self.operator_session.get(f"{BASE_URL}/api/admin/services")
        assert services_resp.status_code == 403, f"Expected 403 for services, got {services_resp.status_code}"
        assert "Access denied" in services_resp.text or "denied" in services_resp.text.lower()
        print("Operator denied /api/admin/services - PASS")
    
    def test_operator_denied_admin_only_routes(self):
        """Operator gets 403 for admin-only routes (cms-roles, cms-sections)"""
        # Login as operator
        response = self.operator_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": OPERATOR_EMAIL,
            "password": OPERATOR_PASSWORD
        })
        token = response.json()["token"]
        self.operator_session.headers.update({"Authorization": f"Bearer {token}"})
        
        # GET /api/admin/cms-roles (admin-only)
        roles_resp = self.operator_session.get(f"{BASE_URL}/api/admin/cms-roles")
        assert roles_resp.status_code == 403, f"Expected 403 for cms-roles, got {roles_resp.status_code}"
        print("Operator denied /api/admin/cms-roles - PASS")
        
        # GET /api/admin/cms-sections (admin-only)
        sections_resp = self.operator_session.get(f"{BASE_URL}/api/admin/cms-sections")
        assert sections_resp.status_code == 403, f"Expected 403 for cms-sections, got {sections_resp.status_code}"
        print("Operator denied /api/admin/cms-sections - PASS")
        
        # POST /api/admin/cms-roles (admin-only)
        create_resp = self.operator_session.post(f"{BASE_URL}/api/admin/cms-roles", json={
            "name": "Hacker Role",
            "permissions": ["dashboard"]
        })
        assert create_resp.status_code == 403, f"Expected 403 for POST cms-roles, got {create_resp.status_code}"
        print("Operator denied POST /api/admin/cms-roles - PASS")
        
        # PUT /api/admin/members/*/cms-roles (admin-only)
        assign_resp = self.operator_session.put(
            f"{BASE_URL}/api/admin/members/{CARLOS_MEMBER_ID}/cms-roles",
            json={"cms_roles": ["role_admin"]}
        )
        assert assign_resp.status_code == 403, f"Expected 403 for PUT members/cms-roles, got {assign_resp.status_code}"
        print("Operator denied PUT /api/admin/members/*/cms-roles - PASS")
    
    def teardown_method(self, method):
        # Cleanup
        self.admin_session.put(
            f"{BASE_URL}/api/admin/members/{CARLOS_MEMBER_ID}/cms-roles",
            json={"cms_roles": ["role_member"]}
        )
        self.admin_session.delete(f"{BASE_URL}/api/admin/cms-roles/{self.test_role_id}")


class TestAdminRegression:
    """Test admin still has full access to all pages"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        token = response.json()["token"]
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_admin_can_access_all_sections(self):
        """Admin can access all admin pages without 403"""
        endpoints = [
            "/api/admin/services",
            "/api/admin/settings",
            "/api/admin/backups",
            "/api/admin/hero-slides",
            "/api/admin/members",
            "/api/admin/aurex/aurex_audience/config",  # Aurex requires section param
            "/api/admin/blog",
            "/api/admin/analytics",
            "/api/admin/cms-roles",
            "/api/admin/cms-sections",
        ]
        
        for endpoint in endpoints:
            response = self.session.get(f"{BASE_URL}{endpoint}")
            assert response.status_code == 200, f"Admin denied access to {endpoint}: {response.status_code} - {response.text}"
            print(f"Admin can access {endpoint} - PASS")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
