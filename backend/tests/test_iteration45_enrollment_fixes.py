"""
Test suite for Iteration 45 - Membership Enrollment Fixes
Tests:
- POST /api/public/enrollment/check-email - rejects existing emails, accepts new ones
- POST /api/public/enrollment/submit - returns full member data including level_id and sponsor_id
- PUT /api/admin/enrollment-fields/reorder - field reordering
- Invite code fields (invitee_first_name, invitee_last_name, invitee_email, invitee_gender) after enrollment
- My Sponsor endpoint for enrolled members
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "admin@consultant.com"
ADMIN_PASSWORD = "Admin123!"

# Test member credentials
TEST_MEMBER_EMAIL = "fulltest@example.com"
TEST_MEMBER_PASSWORD = "MyPass2024!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD,
        "login_type": "admin"
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers with admin auth token"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def member_token():
    """Get member authentication token using username field"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_MEMBER_EMAIL,  # API uses email field but member login uses username
        "password": TEST_MEMBER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Member authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def member_headers(member_token):
    """Headers with member auth token"""
    return {"Authorization": f"Bearer {member_token}", "Content-Type": "application/json"}


class TestCheckEmailEndpoint:
    """Test POST /api/public/enrollment/check-email endpoint"""
    
    def test_check_email_rejects_empty_email(self):
        """Should reject empty email"""
        response = requests.post(f"{BASE_URL}/api/public/enrollment/check-email", json={"email": ""})
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "email" in data.get("detail", "").lower() or "required" in data.get("detail", "").lower()
        
    def test_check_email_rejects_existing_email(self):
        """Should reject email that already exists in members collection"""
        # Use admin email which should exist
        response = requests.post(f"{BASE_URL}/api/public/enrollment/check-email", json={"email": ADMIN_EMAIL})
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "already" in data.get("detail", "").lower() or "registered" in data.get("detail", "").lower()
        
    def test_check_email_accepts_new_email(self):
        """Should accept email that doesn't exist"""
        unique_email = f"test_new_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/public/enrollment/check-email", json={"email": unique_email})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("available") == True, "Response should indicate email is available"


class TestReorderFieldsEndpoint:
    """Test PUT /api/admin/enrollment-fields/reorder endpoint"""
    
    def test_reorder_requires_auth(self):
        """Should require authentication"""
        response = requests.put(f"{BASE_URL}/api/admin/enrollment-fields/reorder", json={"ordered_ids": []})
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
    def test_reorder_fields_success(self, admin_headers):
        """Should successfully reorder fields"""
        # First get existing fields
        response = requests.get(f"{BASE_URL}/api/admin/enrollment-fields", headers=admin_headers)
        assert response.status_code == 200
        fields = response.json()
        
        # Get step 1 fields
        step1_fields = [f for f in fields if f.get("step") == 1]
        if len(step1_fields) < 2:
            pytest.skip("Not enough step 1 fields to test reorder")
            
        # Reverse the order of first 2 fields
        ordered_ids = [step1_fields[1]["id"], step1_fields[0]["id"]] + [f["id"] for f in step1_fields[2:]]
        
        response = requests.put(f"{BASE_URL}/api/admin/enrollment-fields/reorder", 
                               json={"ordered_ids": ordered_ids}, headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True
        
        # Restore original order
        original_ids = [f["id"] for f in step1_fields]
        requests.put(f"{BASE_URL}/api/admin/enrollment-fields/reorder", 
                    json={"ordered_ids": original_ids}, headers=admin_headers)


class TestEnrollmentSubmitFullData:
    """Test POST /api/public/enrollment/submit returns full member data"""
    
    @pytest.fixture(scope="class")
    def invite_code(self, admin_headers):
        """Generate an invite code for testing"""
        response = requests.post(f"{BASE_URL}/api/member/invite-codes/generate", 
                                json={"count": 1}, headers=admin_headers)
        if response.status_code == 200:
            codes = response.json()  # Returns list directly
            if codes and len(codes) > 0:
                return codes[0].get("code")
        pytest.skip(f"Failed to generate invite code: {response.status_code} - {response.text}")
        
    def test_submit_returns_full_member_data(self, invite_code):
        """Submit should return full member data including level_id and sponsor_id"""
        unique_email = f"test_enroll_{uuid.uuid4().hex[:8]}@example.com"
        form_data = {
            "invite_code": invite_code,
            "email": unique_email,
            "first_name": "Test",
            "last_name": "Enrollee",
            "password": "TestPass123!",
            "confirm_password": "TestPass123!",
            "gender": "Male",
            "phone": "+1234567890",
            "country": "United States",
            "state": "California",
            "city": "Los Angeles"
        }
        
        response = requests.post(f"{BASE_URL}/api/public/enrollment/submit", json={"form_data": form_data})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        assert "token" in data, "Response should include token"
        assert "member" in data, "Response should include member data"
        
        member = data.get("member", {})
        # Verify full member data is returned
        assert member.get("email") == unique_email, "Member email should match"
        assert member.get("first_name") == "Test", "Member first_name should match"
        assert member.get("last_name") == "Enrollee", "Member last_name should match"
        assert "level_id" in member, "Member should have level_id"
        assert "sponsor_id" in member, "Member should have sponsor_id"
        assert "membership_id" in member, "Member should have membership_id"
        assert "member_id" in member, "Member should have member_id"
        
        # Store for later tests
        TestEnrollmentSubmitFullData.enrolled_member = member
        TestEnrollmentSubmitFullData.enrolled_token = data.get("token")
        TestEnrollmentSubmitFullData.used_invite_code = invite_code


class TestInviteCodeFieldsAfterEnrollment:
    """Test that invite code record has invitee fields after enrollment"""
    
    def test_invite_code_has_invitee_fields(self, admin_headers):
        """After enrollment, invite code should have invitee_first_name, invitee_last_name, invitee_email, invitee_gender"""
        if not hasattr(TestEnrollmentSubmitFullData, 'used_invite_code'):
            pytest.skip("No enrollment completed to check invite code")
            
        # Get all invite codes and find the used one
        response = requests.get(f"{BASE_URL}/api/member/invite-codes", headers=admin_headers)
        if response.status_code != 200:
            pytest.skip(f"Could not get invite codes: {response.status_code}")
            
        codes = response.json()
        used_code = None
        for code in codes:
            if code.get("code") == TestEnrollmentSubmitFullData.used_invite_code:
                used_code = code
                break
                
        if not used_code:
            pytest.skip("Could not find the used invite code")
            
        # Verify invitee fields
        assert used_code.get("status") == "used", "Code should be marked as used"
        assert "invitee_first_name" in used_code, "Code should have invitee_first_name"
        assert "invitee_last_name" in used_code, "Code should have invitee_last_name"
        assert "invitee_email" in used_code, "Code should have invitee_email"
        assert "invitee_gender" in used_code, "Code should have invitee_gender"


class TestMySponsorEndpoint:
    """Test GET /api/member/my-sponsor endpoint"""
    
    def test_my_sponsor_requires_auth(self):
        """Should require authentication"""
        response = requests.get(f"{BASE_URL}/api/member/my-sponsor")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
    def test_my_sponsor_returns_sponsor_info(self, member_headers):
        """Should return sponsor info for enrolled member"""
        response = requests.get(f"{BASE_URL}/api/member/my-sponsor", headers=member_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Sponsor info should be present (may be null if no sponsor)
        # The test member fulltest@example.com should have admin as sponsor
        if data:
            # If sponsor exists, verify structure
            assert "first_name" in data or "email" in data or data is None, "Sponsor should have basic info"


class TestMemberLevelAfterEnrollment:
    """Test that enrolled member has correct level"""
    
    def test_enrolled_member_has_level(self):
        """Enrolled member should have level_id set"""
        if not hasattr(TestEnrollmentSubmitFullData, 'enrolled_member'):
            pytest.skip("No enrollment completed")
            
        member = TestEnrollmentSubmitFullData.enrolled_member
        assert member.get("level_id") is not None, "Enrolled member should have level_id"


class TestMyLevelEndpoint:
    """Test GET /api/member/my-level endpoint"""
    
    def test_my_level_requires_auth(self):
        """Should require authentication"""
        response = requests.get(f"{BASE_URL}/api/member/my-level")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        
    def test_my_level_returns_level_info(self, member_headers):
        """Should return level info for member"""
        response = requests.get(f"{BASE_URL}/api/member/my-level", headers=member_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Level info should be present
        if data:
            assert "name" in data or "id" in data, "Level should have basic info"


class TestEnrollmentFieldTypes:
    """Test that richtext and datetime field types are supported"""
    
    def test_create_richtext_field(self, admin_headers):
        """Should be able to create a richtext field type"""
        new_field = {
            "step": 2,
            "field_key": "test_richtext_field",
            "label": "Test Rich Text",
            "field_type": "richtext",
            "placeholder": "",
            "tooltip": "Enter rich text content",
            "required": False,
            "visible": True,
            "options": [],
            "icon": ""
        }
        response = requests.post(f"{BASE_URL}/api/admin/enrollment-fields", json=new_field, headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("field_type") == "richtext"
        
        # Cleanup
        if data.get("id"):
            requests.delete(f"{BASE_URL}/api/admin/enrollment-fields/{data['id']}", headers=admin_headers)
            
    def test_create_datetime_field(self, admin_headers):
        """Should be able to create a datetime field type"""
        new_field = {
            "step": 2,
            "field_key": "test_datetime_field",
            "label": "Test DateTime",
            "field_type": "datetime",
            "placeholder": "",
            "tooltip": "Select date and time",
            "required": False,
            "visible": True,
            "options": [],
            "icon": ""
        }
        response = requests.post(f"{BASE_URL}/api/admin/enrollment-fields", json=new_field, headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("field_type") == "datetime"
        
        # Cleanup
        if data.get("id"):
            requests.delete(f"{BASE_URL}/api/admin/enrollment-fields/{data['id']}", headers=admin_headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
