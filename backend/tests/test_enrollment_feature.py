"""
Test suite for Membership Enrollment Feature
Tests:
- GET /api/public/enrollment-fields - returns all visible fields
- POST /api/public/enrollment/validate-code - validates invite codes
- Admin CRUD for enrollment fields
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "admin@consultant.com"
ADMIN_PASSWORD = "Admin123!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD,
        "login_type": "admin"
    })
    if response.status_code == 200:
        token = response.json().get("token")
        return token
    pytest.skip(f"Admin authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers with admin auth token"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


class TestPublicEnrollmentFields:
    """Test public enrollment fields endpoint"""
    
    def test_get_enrollment_fields_returns_200(self):
        """GET /api/public/enrollment-fields should return 200"""
        response = requests.get(f"{BASE_URL}/api/public/enrollment-fields")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
    def test_get_enrollment_fields_returns_list(self):
        """GET /api/public/enrollment-fields should return a list"""
        response = requests.get(f"{BASE_URL}/api/public/enrollment-fields")
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        
    def test_get_enrollment_fields_returns_visible_fields(self):
        """GET /api/public/enrollment-fields should return visible fields"""
        response = requests.get(f"{BASE_URL}/api/public/enrollment-fields")
        data = response.json()
        # All returned fields should be visible
        for field in data:
            assert field.get("visible") == True, f"Field {field.get('field_key')} should be visible"
            
    def test_get_enrollment_fields_has_required_structure(self):
        """Each field should have required properties"""
        response = requests.get(f"{BASE_URL}/api/public/enrollment-fields")
        data = response.json()
        required_keys = ["step", "field_key", "label", "field_type", "required", "visible", "order"]
        for field in data[:5]:  # Check first 5 fields
            for key in required_keys:
                assert key in field, f"Field missing required key: {key}"
                
    def test_get_enrollment_fields_has_step1_fields(self):
        """Should have Step 1 fields: invite_code, email, first_name, last_name, password, confirm_password"""
        response = requests.get(f"{BASE_URL}/api/public/enrollment-fields")
        data = response.json()
        step1_fields = [f for f in data if f.get("step") == 1]
        step1_keys = [f.get("field_key") for f in step1_fields]
        expected_keys = ["invite_code", "email", "first_name", "last_name", "password", "confirm_password"]
        for key in expected_keys:
            assert key in step1_keys, f"Step 1 should have field: {key}"
            
    def test_get_enrollment_fields_count(self):
        """Should return approximately 49 visible fields (default seeded)"""
        response = requests.get(f"{BASE_URL}/api/public/enrollment-fields")
        data = response.json()
        # Should have at least 40 fields (some may be hidden)
        assert len(data) >= 40, f"Expected at least 40 fields, got {len(data)}"


class TestEnrollmentCodeValidation:
    """Test invite code validation endpoint"""
    
    def test_validate_code_rejects_empty_code(self):
        """POST /api/public/enrollment/validate-code should reject empty code"""
        response = requests.post(f"{BASE_URL}/api/public/enrollment/validate-code", json={"code": ""})
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
    def test_validate_code_rejects_invalid_code(self):
        """POST /api/public/enrollment/validate-code should reject invalid code"""
        response = requests.post(f"{BASE_URL}/api/public/enrollment/validate-code", json={"code": "INVALID_CODE_12345"})
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "detail" in data, "Response should have detail field"
        
    def test_validate_code_rejects_missing_code(self):
        """POST /api/public/enrollment/validate-code should reject missing code"""
        response = requests.post(f"{BASE_URL}/api/public/enrollment/validate-code", json={})
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"


class TestAdminEnrollmentFields:
    """Test admin enrollment fields CRUD"""
    
    def test_admin_get_fields_requires_auth(self):
        """GET /api/admin/enrollment-fields should require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/enrollment-fields")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
    def test_admin_get_fields_returns_all_fields(self, admin_headers):
        """GET /api/admin/enrollment-fields should return all fields (including hidden)"""
        response = requests.get(f"{BASE_URL}/api/admin/enrollment-fields", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        # Should have at least 49 fields (default seeded)
        assert len(data) >= 40, f"Expected at least 40 fields, got {len(data)}"
        
    def test_admin_create_field(self, admin_headers):
        """POST /api/admin/enrollment-fields should create a new field"""
        new_field = {
            "step": 2,
            "field_key": "test_field_create",
            "label": "Test Field Create",
            "field_type": "text",
            "placeholder": "Enter test value",
            "tooltip": "This is a test field",
            "required": False,
            "visible": True,
            "options": [],
            "icon": "test"
        }
        response = requests.post(f"{BASE_URL}/api/admin/enrollment-fields", json=new_field, headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("field_key") == "test_field_create"
        assert data.get("label") == "Test Field Create"
        assert "id" in data, "Created field should have an id"
        # Store for cleanup
        TestAdminEnrollmentFields.created_field_id = data.get("id")
        
    def test_admin_get_single_field(self, admin_headers):
        """GET /api/admin/enrollment-fields/{id} should return a single field"""
        if not hasattr(TestAdminEnrollmentFields, 'created_field_id'):
            pytest.skip("No field created to get")
        field_id = TestAdminEnrollmentFields.created_field_id
        response = requests.get(f"{BASE_URL}/api/admin/enrollment-fields/{field_id}", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("id") == field_id
        
    def test_admin_update_field(self, admin_headers):
        """PUT /api/admin/enrollment-fields/{id} should update a field"""
        if not hasattr(TestAdminEnrollmentFields, 'created_field_id'):
            pytest.skip("No field created to update")
        field_id = TestAdminEnrollmentFields.created_field_id
        update_data = {
            "label": "Updated Test Field",
            "tooltip": "Updated tooltip"
        }
        response = requests.put(f"{BASE_URL}/api/admin/enrollment-fields/{field_id}", json=update_data, headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("label") == "Updated Test Field"
        assert data.get("tooltip") == "Updated tooltip"
        
    def test_admin_toggle_visibility(self, admin_headers):
        """PUT /api/admin/enrollment-fields/{id}/visibility should toggle visibility"""
        if not hasattr(TestAdminEnrollmentFields, 'created_field_id'):
            pytest.skip("No field created to toggle")
        field_id = TestAdminEnrollmentFields.created_field_id
        # Toggle to hidden
        response = requests.put(f"{BASE_URL}/api/admin/enrollment-fields/{field_id}/visibility", 
                               json={"visible": False}, headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("visible") == False
        # Toggle back to visible
        response = requests.put(f"{BASE_URL}/api/admin/enrollment-fields/{field_id}/visibility", 
                               json={"visible": True}, headers=admin_headers)
        assert response.status_code == 200
        
    def test_admin_delete_field(self, admin_headers):
        """DELETE /api/admin/enrollment-fields/{id} should delete a field"""
        if not hasattr(TestAdminEnrollmentFields, 'created_field_id'):
            pytest.skip("No field created to delete")
        field_id = TestAdminEnrollmentFields.created_field_id
        response = requests.delete(f"{BASE_URL}/api/admin/enrollment-fields/{field_id}", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        # Verify deletion
        response = requests.get(f"{BASE_URL}/api/admin/enrollment-fields/{field_id}", headers=admin_headers)
        assert response.status_code == 404, "Deleted field should return 404"
        
    def test_admin_delete_nonexistent_field(self, admin_headers):
        """DELETE /api/admin/enrollment-fields/{id} should return 404 for nonexistent field"""
        response = requests.delete(f"{BASE_URL}/api/admin/enrollment-fields/nonexistent-id-12345", headers=admin_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestEnrollmentSubmission:
    """Test enrollment submission endpoint"""
    
    def test_submit_requires_email(self):
        """POST /api/public/enrollment/submit should require email"""
        response = requests.post(f"{BASE_URL}/api/public/enrollment/submit", json={
            "form_data": {
                "password": "TestPass123!",
                "confirm_password": "TestPass123!"
            }
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
    def test_submit_requires_password_min_length(self):
        """POST /api/public/enrollment/submit should require password min 8 chars"""
        response = requests.post(f"{BASE_URL}/api/public/enrollment/submit", json={
            "form_data": {
                "email": "test@example.com",
                "password": "short",
                "confirm_password": "short"
            }
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "8 characters" in data.get("detail", "").lower() or "password" in data.get("detail", "").lower()
        
    def test_submit_requires_password_match(self):
        """POST /api/public/enrollment/submit should require passwords to match"""
        response = requests.post(f"{BASE_URL}/api/public/enrollment/submit", json={
            "form_data": {
                "email": "test@example.com",
                "password": "TestPass123!",
                "confirm_password": "DifferentPass123!"
            }
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "match" in data.get("detail", "").lower()


class TestEnrollmentApplications:
    """Test admin enrollment applications endpoint"""
    
    def test_admin_get_applications_requires_auth(self):
        """GET /api/admin/enrollment-applications should require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/enrollment-applications")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
    def test_admin_get_applications(self, admin_headers):
        """GET /api/admin/enrollment-applications should return list"""
        response = requests.get(f"{BASE_URL}/api/admin/enrollment-applications", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
