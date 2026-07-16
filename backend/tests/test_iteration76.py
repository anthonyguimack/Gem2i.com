"""
Iteration 76 Tests - Member Info Modal + Enrollment Q&A + Community Modal Photo

Tests:
1. CMS Members info icon - GET /api/admin/members/{member_id}/enrollment endpoint
2. Member info modal - profile facts (tested via API response structure)
3. Member info modal - enrollment Q&A with step tags, labels, legal_checkbox handling
4. No-enrollment fallback - seeded members return has_application=false
5. WITH-enrollment success - historical enrollment returns answers with step tags
6. Endpoint security - 401/403 without admin token
7. My Community modal - photo rendering (tested via frontend)
8. Regression - iteration_75 tests still pass
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://consultant-cms.preview.emergentagent.com')

class TestMemberEnrollmentAPI:
    """Tests for the new /api/admin/members/{member_id}/enrollment endpoint"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@consultant.com", "password": "Admin123!"}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def member_token(self):
        """Get non-admin member token for security tests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "samplemember3@gmail.com", "password": "123456789"}
        )
        assert response.status_code == 200, f"Member login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture(scope="class")
    def members_list(self, admin_token):
        """Get all members to find test member IDs"""
        response = requests.get(
            f"{BASE_URL}/api/admin/members",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        return response.json()
    
    def test_endpoint_exists(self, admin_token):
        """Test that the enrollment endpoint exists and returns 200"""
        # Use a known member_id
        response = requests.get(
            f"{BASE_URL}/api/admin/members/member_f6ce8b325cf2/enrollment",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Endpoint returned {response.status_code}: {response.text}"
    
    def test_no_enrollment_fallback_seeded_member(self, admin_token, members_list):
        """Test 4: Seeded member (samplemember1 AUX-101) returns has_application=false"""
        # Find samplemember1 by membership_id
        samplemember1 = next((m for m in members_list if m.get("membership_id") == "AUX-101"), None)
        assert samplemember1 is not None, "samplemember1 (AUX-101) not found"
        
        response = requests.get(
            f"{BASE_URL}/api/admin/members/{samplemember1['member_id']}/enrollment",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify no-enrollment response structure
        assert data["has_application"] == False, "Seeded member should have has_application=false"
        assert data["submitted_at"] is None, "Seeded member should have submitted_at=null"
        assert data["answers"] == [], "Seeded member should have empty answers"
    
    def test_with_enrollment_historical_member(self, admin_token):
        """Test 5: Historical enrollment application (member_d35c97d94465) returns answers"""
        response = requests.get(
            f"{BASE_URL}/api/admin/members/member_d35c97d94465/enrollment",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify with-enrollment response structure
        assert data["has_application"] == True, "Historical member should have has_application=true"
        assert data["submitted_at"] is not None, "Historical member should have submitted_at"
        assert "email" in data, "Response should include email"
        assert len(data["answers"]) > 0, "Historical member should have answers"
        
        # Verify answer structure
        first_answer = data["answers"][0]
        assert "step" in first_answer, "Answer should have step"
        assert "field_key" in first_answer, "Answer should have field_key"
        assert "label" in first_answer, "Answer should have label"
        assert "field_type" in first_answer, "Answer should have field_type"
        assert "value" in first_answer, "Answer should have value"
    
    def test_legal_checkbox_rendering(self, admin_token):
        """Test 3: legal_checkbox fields render as 'Accepted' / 'Not accepted'"""
        response = requests.get(
            f"{BASE_URL}/api/admin/members/member_d35c97d94465/enrollment",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Find legal_checkbox answers
        legal_answers = [a for a in data["answers"] if a.get("field_type") == "legal_checkbox"]
        assert len(legal_answers) > 0, "Should have legal_checkbox answers"
        
        for answer in legal_answers:
            assert answer["value"] in ["Accepted", "Not accepted"], \
                f"legal_checkbox value should be 'Accepted' or 'Not accepted', got: {answer['value']}"
    
    def test_step_tags_present(self, admin_token):
        """Test 3: Answers have step tags (1, 2, or 3)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/members/member_d35c97d94465/enrollment",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify step tags
        steps_found = set()
        for answer in data["answers"]:
            if answer.get("step"):
                steps_found.add(answer["step"])
        
        assert 1 in steps_found, "Should have Step 1 answers"
        assert 2 in steps_found, "Should have Step 2 answers"
        assert 3 in steps_found, "Should have Step 3 answers"
    
    def test_security_no_token(self):
        """Test 6: Endpoint returns 401/403 without token"""
        response = requests.get(
            f"{BASE_URL}/api/admin/members/member_f6ce8b325cf2/enrollment"
        )
        assert response.status_code in [401, 403], \
            f"Should return 401/403 without token, got {response.status_code}"
    
    def test_security_non_admin_token(self, member_token):
        """Test 6: Endpoint returns 401/403 with non-admin token"""
        response = requests.get(
            f"{BASE_URL}/api/admin/members/member_f6ce8b325cf2/enrollment",
            headers={"Authorization": f"Bearer {member_token}"}
        )
        assert response.status_code in [401, 403], \
            f"Should return 401/403 with non-admin token, got {response.status_code}"


class TestRegressionIteration75:
    """Regression tests from iteration 75"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@consultant.com", "password": "Admin123!"}
        )
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_testing_manual_endpoint(self, admin_token):
        """Regression: /api/docs/testing-manual returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/docs/testing-manual",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Testing manual endpoint failed: {response.status_code}"
    
    def test_members_list_has_is_mentor(self, admin_token):
        """Regression: Members list includes is_mentor field"""
        response = requests.get(
            f"{BASE_URL}/api/admin/members",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        members = response.json()
        
        # Check that is_mentor field exists
        for member in members:
            assert "is_mentor" in member, f"Member {member.get('membership_id')} missing is_mentor field"
    
    def test_community_endpoint_returns_fields(self):
        """Regression: Community endpoint returns 7 new fields"""
        # Login as samplemember1
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "samplemember1@gmail.com", "password": "123456789"}
        )
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        response = requests.get(
            f"{BASE_URL}/api/member/my-community",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Check tree structure
        assert "tree" in data, "Response should have tree"
        if len(data["tree"]) > 0:
            first_member = data["tree"][0]
            required_fields = ["phone", "gender", "date_of_birth", "country", "state", "city", "zip_code"]
            for field in required_fields:
                assert field in first_member, f"Community member missing field: {field}"


class TestMembersManagerInfoIcon:
    """Tests for the Info icon in Members Manager"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "admin@consultant.com", "password": "Admin123!"}
        )
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_members_list_returns_member_id(self, admin_token):
        """Test that members list returns member_id for info icon data-testid"""
        response = requests.get(
            f"{BASE_URL}/api/admin/members",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        members = response.json()
        
        for member in members:
            assert "member_id" in member, "Member should have member_id for info icon testid"
            assert member["member_id"].startswith("member_"), "member_id should start with 'member_'"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
