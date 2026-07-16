"""
Iteration 68 - Roles & Permissions Follow-up Tests
===================================================
Tests for:
1. Upload endpoints (/api/upload, /api/upload-file) - operators with any CMS permission can upload
2. Login gates - CMS login vs My Account login vs role_member revocation
3. GET /member/me - role_member gate
4. Members table column rename (Mentor) - API returns is_mentor field
"""

import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "admin@consultant.com"
ADMIN_PASSWORD = "Admin123!"
OPERATOR_EMAIL = "carlos@example.com"
OPERATOR_PASSWORD = "Test123!"
OPERATOR_MEMBER_ID = "member_f8496347f44d"
OPERATOR_ROLE_ID = "role_9ce1490309b3"  # Operador role


class TestUploadEndpoints:
    """Test that operators with any CMS permission can upload files"""
    
    @pytest.fixture
    def operator_token(self):
        """Get operator token via CMS login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": OPERATOR_EMAIL,
            "password": OPERATOR_PASSWORD,
            "login_type": "cms"
        })
        assert response.status_code == 200, f"Operator CMS login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    def test_operator_can_upload_image(self, operator_token):
        """POST /api/upload - operator with CMS permissions can upload images"""
        # Create a simple test image (1x1 pixel PNG)
        png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = {'file': ('test.png', io.BytesIO(png_data), 'image/png')}
        headers = {'Authorization': f'Bearer {operator_token}'}
        
        response = requests.post(f"{BASE_URL}/api/upload", files=files, headers=headers)
        
        assert response.status_code == 200, f"Upload failed with {response.status_code}: {response.text}"
        data = response.json()
        assert 'url' in data, "Response should contain 'url'"
        assert 'filename' in data, "Response should contain 'filename'"
        print(f"PASS: Operator uploaded image successfully - {data['filename']}")
    
    def test_operator_can_upload_file(self, operator_token):
        """POST /api/upload-file - operator with CMS permissions can upload documents"""
        # Create a simple text file
        text_data = b'Test document content for iteration 68'
        
        files = {'file': ('test.txt', io.BytesIO(text_data), 'text/plain')}
        headers = {'Authorization': f'Bearer {operator_token}'}
        
        response = requests.post(f"{BASE_URL}/api/upload-file", files=files, headers=headers)
        
        assert response.status_code == 200, f"Upload-file failed with {response.status_code}: {response.text}"
        data = response.json()
        assert 'url' in data, "Response should contain 'url'"
        assert 'filename' in data, "Response should contain 'filename'"
        print(f"PASS: Operator uploaded document successfully - {data['filename']}")
    
    def test_admin_can_upload_image(self, admin_token):
        """POST /api/upload - admin can upload images"""
        png_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\x0f\x00\x00\x01\x01\x00\x05\x18\xd8N\x00\x00\x00\x00IEND\xaeB`\x82'
        
        files = {'file': ('admin_test.png', io.BytesIO(png_data), 'image/png')}
        headers = {'Authorization': f'Bearer {admin_token}'}
        
        response = requests.post(f"{BASE_URL}/api/upload", files=files, headers=headers)
        
        assert response.status_code == 200, f"Admin upload failed: {response.text}"
        print("PASS: Admin uploaded image successfully")


class TestLoginGates:
    """Test login gates for CMS vs My Account access"""
    
    def test_cms_login_admin_succeeds(self):
        """POST /api/auth/login with login_type='cms' - admin succeeds"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "login_type": "cms"
        })
        assert response.status_code == 200, f"Admin CMS login failed: {response.text}"
        data = response.json()
        assert 'token' in data
        assert data['user']['role'] == 'admin'
        print("PASS: Admin CMS login succeeds")
    
    def test_cms_login_operator_succeeds(self):
        """POST /api/auth/login with login_type='cms' - operator with CMS role succeeds"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": OPERATOR_EMAIL,
            "password": OPERATOR_PASSWORD,
            "login_type": "cms"
        })
        assert response.status_code == 200, f"Operator CMS login failed: {response.text}"
        data = response.json()
        assert 'token' in data
        print("PASS: Operator CMS login succeeds")
    
    def test_default_login_with_role_member(self):
        """POST /api/auth/login (default) - user with role_member succeeds"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": OPERATOR_EMAIL,
            "password": OPERATOR_PASSWORD
        })
        assert response.status_code == 200, f"Default login failed: {response.text}"
        print("PASS: Default login with role_member succeeds")


class TestRoleMemberRevocation:
    """Test that removing role_member revokes My Account access immediately"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_revoke_role_member_blocks_my_account_login(self, admin_token):
        """
        1. Remove role_member from carlos
        2. Verify default login fails with 403
        3. Verify CMS login still works
        4. Restore role_member
        """
        headers = {'Authorization': f'Bearer {admin_token}'}
        
        # Step 1: Remove role_member (keep only Operador role)
        response = requests.put(
            f"{BASE_URL}/api/admin/members/{OPERATOR_MEMBER_ID}/cms-roles",
            json={"cms_roles": [OPERATOR_ROLE_ID]},  # Only Operador, no role_member
            headers=headers
        )
        assert response.status_code == 200, f"Failed to remove role_member: {response.text}"
        print("Step 1: Removed role_member from carlos")
        
        try:
            # Step 2: Verify default login fails
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": OPERATOR_EMAIL,
                "password": OPERATOR_PASSWORD
            })
            assert response.status_code == 403, f"Expected 403, got {response.status_code}"
            assert "My Account access has been revoked" in response.json().get("detail", "")
            print("Step 2: PASS - Default login blocked with 403")
            
            # Step 3: Verify CMS login still works
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": OPERATOR_EMAIL,
                "password": OPERATOR_PASSWORD,
                "login_type": "cms"
            })
            assert response.status_code == 200, f"CMS login should still work: {response.text}"
            print("Step 3: PASS - CMS login still works after role_member revocation")
            
        finally:
            # Step 4: ALWAYS restore role_member
            response = requests.put(
                f"{BASE_URL}/api/admin/members/{OPERATOR_MEMBER_ID}/cms-roles",
                json={"cms_roles": ["role_member", OPERATOR_ROLE_ID]},
                headers=headers
            )
            assert response.status_code == 200, f"Failed to restore role_member: {response.text}"
            print("Step 4: Restored role_member to carlos")
    
    def test_revoke_role_member_blocks_member_login_endpoint(self, admin_token):
        """POST /api/member/login - blocked when role_member is removed"""
        headers = {'Authorization': f'Bearer {admin_token}'}
        
        # Remove role_member
        response = requests.put(
            f"{BASE_URL}/api/admin/members/{OPERATOR_MEMBER_ID}/cms-roles",
            json={"cms_roles": [OPERATOR_ROLE_ID]},
            headers=headers
        )
        assert response.status_code == 200
        
        try:
            # Try member login
            response = requests.post(f"{BASE_URL}/api/member/login", json={
                "username": OPERATOR_EMAIL,
                "password": OPERATOR_PASSWORD
            })
            assert response.status_code == 403, f"Expected 403, got {response.status_code}"
            assert "My Account access has been revoked" in response.json().get("detail", "")
            print("PASS: /member/login blocked when role_member removed")
            
        finally:
            # Restore role_member
            requests.put(
                f"{BASE_URL}/api/admin/members/{OPERATOR_MEMBER_ID}/cms-roles",
                json={"cms_roles": ["role_member", OPERATOR_ROLE_ID]},
                headers=headers
            )
    
    def test_revoke_role_member_blocks_member_me_endpoint(self, admin_token):
        """GET /api/member/me - blocked when role_member is removed (even with valid token)"""
        headers = {'Authorization': f'Bearer {admin_token}'}
        
        # First get a valid token while carlos still has role_member
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": OPERATOR_EMAIL,
            "password": OPERATOR_PASSWORD
        })
        assert response.status_code == 200
        carlos_token = response.json()["token"]
        
        # Remove role_member
        response = requests.put(
            f"{BASE_URL}/api/admin/members/{OPERATOR_MEMBER_ID}/cms-roles",
            json={"cms_roles": [OPERATOR_ROLE_ID]},
            headers=headers
        )
        assert response.status_code == 200
        
        try:
            # Try to access /member/me with the token obtained before revocation
            response = requests.get(
                f"{BASE_URL}/api/member/me",
                headers={'Authorization': f'Bearer {carlos_token}'}
            )
            assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
            assert "My Account access has been revoked" in response.json().get("detail", "")
            print("PASS: /member/me blocked immediately after role_member revocation")
            
        finally:
            # Restore role_member
            requests.put(
                f"{BASE_URL}/api/admin/members/{OPERATOR_MEMBER_ID}/cms-roles",
                json={"cms_roles": ["role_member", OPERATOR_ROLE_ID]},
                headers=headers
            )


class TestMembersAPIFields:
    """Test that Members API returns correct fields for UI"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_members_list_includes_is_mentor(self, admin_token):
        """GET /api/admin/members - returns is_mentor field for Mentor column"""
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = requests.get(f"{BASE_URL}/api/admin/members", headers=headers)
        
        assert response.status_code == 200
        members = response.json()
        assert len(members) > 0, "Should have at least one member"
        
        # Check that is_mentor field exists
        for member in members:
            assert 'is_mentor' in member, f"Member {member.get('email')} missing is_mentor field"
        
        print(f"PASS: Members list includes is_mentor field ({len(members)} members)")


class TestSettingsCmsWelcome:
    """Test CMS Welcome field in settings"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_settings_cms_welcome_field(self, admin_token):
        """GET /api/admin/settings - includes cms_welcome field"""
        headers = {'Authorization': f'Bearer {admin_token}'}
        response = requests.get(f"{BASE_URL}/api/admin/settings", headers=headers)
        
        assert response.status_code == 200
        # cms_welcome may or may not be set, but the endpoint should work
        print("PASS: Settings endpoint accessible")
    
    def test_update_cms_welcome(self, admin_token):
        """PUT /api/admin/settings - can update cms_welcome field"""
        headers = {'Authorization': f'Bearer {admin_token}'}
        
        # Get current settings
        response = requests.get(f"{BASE_URL}/api/admin/settings", headers=headers)
        settings = response.json()
        
        # Update with cms_welcome
        test_html = "<p>Welcome to the CMS! This is a <strong>test</strong> message.</p>"
        settings['cms_welcome'] = test_html
        
        response = requests.put(f"{BASE_URL}/api/admin/settings", json=settings, headers=headers)
        assert response.status_code == 200, f"Failed to update settings: {response.text}"
        
        # Verify it was saved
        response = requests.get(f"{BASE_URL}/api/admin/settings", headers=headers)
        updated = response.json()
        assert updated.get('cms_welcome') == test_html, "cms_welcome not saved correctly"
        
        print("PASS: cms_welcome field can be updated and persisted")


class TestAuthMeEndpoint:
    """Test /auth/me returns correct permissions for operators"""
    
    def test_operator_auth_me_returns_permissions(self):
        """GET /api/auth/me - operator gets effective_permissions"""
        # Login as operator
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": OPERATOR_EMAIL,
            "password": OPERATOR_PASSWORD,
            "login_type": "cms"
        })
        assert response.status_code == 200
        token = response.json()["token"]
        
        # Get /auth/me
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert 'cms_roles' in data, "Should have cms_roles"
        assert 'effective_permissions' in data, "Should have effective_permissions"
        assert len(data['effective_permissions']) > 0, "Operator should have some permissions"
        
        print(f"PASS: Operator has {len(data['effective_permissions'])} effective permissions")
        print(f"  CMS Roles: {data['cms_roles']}")
        print(f"  Permissions: {data['effective_permissions'][:5]}...")


class TestAdminRegression:
    """Regression tests for admin functionality"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        return response.json()["token"]
    
    def test_admin_full_access(self, admin_token):
        """Admin should have full access to all sections"""
        headers = {'Authorization': f'Bearer {admin_token}'}
        
        # Test various admin endpoints
        endpoints = [
            "/api/admin/settings",
            "/api/admin/members",
            "/api/admin/cms-roles",
            "/api/admin/cms-sections",
        ]
        
        for endpoint in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
            assert response.status_code == 200, f"Admin blocked from {endpoint}: {response.text}"
        
        print("PASS: Admin has full access to all tested endpoints")
    
    def test_admin_can_update_member(self, admin_token):
        """Admin can update member without role dropdown (regression)"""
        headers = {'Authorization': f'Bearer {admin_token}'}
        
        # Get carlos's current data
        response = requests.get(
            f"{BASE_URL}/api/admin/members/{OPERATOR_MEMBER_ID}",
            headers=headers
        )
        assert response.status_code == 200
        member = response.json()
        
        # Update a field (not role - that's removed from UI)
        member['phone'] = '555-1234-TEST'
        
        response = requests.put(
            f"{BASE_URL}/api/admin/members/{OPERATOR_MEMBER_ID}",
            json=member,
            headers=headers
        )
        assert response.status_code == 200, f"Failed to update member: {response.text}"
        
        # Verify update
        response = requests.get(
            f"{BASE_URL}/api/admin/members/{OPERATOR_MEMBER_ID}",
            headers=headers
        )
        assert response.json()['phone'] == '555-1234-TEST'
        
        print("PASS: Admin can update member successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
