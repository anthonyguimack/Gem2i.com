"""
Iteration 47 Tests - Step 4 Content Management & Button Alignment
Tests for:
1. GET /api/public/enrollment-content/step4 - Public endpoint for Step 4 content
2. GET /api/admin/enrollment-content/step4 - Admin endpoint for Step 4 content
3. PUT /api/admin/enrollment-content/step4 - Update Step 4 content
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestStep4ContentPublic:
    """Test public Step 4 content endpoint"""
    
    def test_get_step4_content_public_returns_200(self):
        """GET /api/public/enrollment-content/step4 should return 200"""
        response = requests.get(f"{BASE_URL}/api/public/enrollment-content/step4")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should have title and description fields
        assert "title" in data, "Response should contain 'title' field"
        assert "description" in data, "Response should contain 'description' field"
        print(f"✓ Public Step 4 content: title='{data['title'][:50]}...' description present")


class TestStep4ContentAdmin:
    """Test admin Step 4 content endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    
    def test_admin_get_step4_content_requires_auth(self):
        """GET /api/admin/enrollment-content/step4 should require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/enrollment-content/step4")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Admin GET Step 4 content requires authentication")
    
    def test_admin_get_step4_content_with_auth(self, auth_token):
        """GET /api/admin/enrollment-content/step4 should return content with auth"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/enrollment-content/step4", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "title" in data, "Response should contain 'title' field"
        assert "description" in data, "Response should contain 'description' field"
        print(f"✓ Admin GET Step 4 content: title='{data['title'][:50] if data['title'] else 'default'}...'")
    
    def test_admin_update_step4_content_requires_auth(self):
        """PUT /api/admin/enrollment-content/step4 should require authentication"""
        response = requests.put(f"{BASE_URL}/api/admin/enrollment-content/step4", json={
            "title": "Test Title",
            "description": "Test Description"
        })
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("✓ Admin PUT Step 4 content requires authentication")
    
    def test_admin_update_step4_content_and_verify(self, auth_token):
        """PUT /api/admin/enrollment-content/step4 should update and persist content"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Generate unique test content
        unique_id = str(uuid.uuid4())[:8]
        test_title = f"TEST_Step4_Title_{unique_id}"
        test_description = f"<p>TEST_Step4_Description_{unique_id}</p>"
        
        # UPDATE - Save new content
        update_response = requests.put(
            f"{BASE_URL}/api/admin/enrollment-content/step4",
            headers=headers,
            json={"title": test_title, "description": test_description}
        )
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        update_data = update_response.json()
        assert update_data.get("success") == True, "Update should return success=True"
        print(f"✓ Admin PUT Step 4 content succeeded")
        
        # GET (Admin) - Verify persistence via admin endpoint
        admin_get_response = requests.get(f"{BASE_URL}/api/admin/enrollment-content/step4", headers=headers)
        assert admin_get_response.status_code == 200
        admin_data = admin_get_response.json()
        assert admin_data["title"] == test_title, f"Admin GET title mismatch: expected '{test_title}', got '{admin_data['title']}'"
        assert admin_data["description"] == test_description, f"Admin GET description mismatch"
        print(f"✓ Admin GET verifies persisted content")
        
        # GET (Public) - Verify public endpoint also returns updated content
        public_get_response = requests.get(f"{BASE_URL}/api/public/enrollment-content/step4")
        assert public_get_response.status_code == 200
        public_data = public_get_response.json()
        assert public_data["title"] == test_title, f"Public GET title mismatch: expected '{test_title}', got '{public_data['title']}'"
        assert public_data["description"] == test_description, f"Public GET description mismatch"
        print(f"✓ Public GET verifies persisted content")
        
        # Cleanup - Restore default content
        requests.put(
            f"{BASE_URL}/api/admin/enrollment-content/step4",
            headers=headers,
            json={
                "title": "Thank you for entering your information",
                "description": "Thank you for entering your information on our membership application form. To finish the subscription process, please click <strong>SUBMIT</strong>."
            }
        )
        print(f"✓ Restored default Step 4 content")


class TestEnrollmentFieldsEndpoints:
    """Test existing enrollment fields endpoints still work"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    
    def test_public_get_enrollment_fields(self):
        """GET /api/public/enrollment-fields should return fields"""
        response = requests.get(f"{BASE_URL}/api/public/enrollment-fields")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list of fields"
        print(f"✓ Public enrollment fields: {len(data)} fields returned")
    
    def test_admin_get_enrollment_fields(self, auth_token):
        """GET /api/admin/enrollment-fields should return all fields with auth"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/enrollment-fields", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list of fields"
        print(f"✓ Admin enrollment fields: {len(data)} fields returned")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
