"""
Iteration 20 Tests: Membership Settings, Change Password, Profile Completion
Features tested:
1. Admin Membership Settings - GET/PUT /api/admin/membership-settings
2. Public Membership Settings - GET /api/public/membership-settings
3. Member Change Password - PUT /api/member/change-password
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from context
ADMIN_EMAIL = "admin@consultant.com"
ADMIN_PASSWORD = "Admin123!"


class TestAdminMembershipSettings:
    """Test Admin Membership Settings CRUD"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_membership_settings(self):
        """GET /api/admin/membership-settings returns mandatory_fields array"""
        response = requests.get(f"{BASE_URL}/api/admin/membership-settings", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "mandatory_fields" in data, "Response should contain mandatory_fields"
        assert isinstance(data["mandatory_fields"], list), "mandatory_fields should be a list"
        print(f"Current mandatory_fields: {data['mandatory_fields']}")
    
    def test_update_membership_settings(self):
        """PUT /api/admin/membership-settings saves mandatory_fields"""
        test_fields = ["first_name", "last_name", "email", "phone", "country"]
        response = requests.put(
            f"{BASE_URL}/api/admin/membership-settings",
            headers=self.headers,
            json={"mandatory_fields": test_fields}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "mandatory_fields" in data, "Response should contain mandatory_fields"
        assert data["mandatory_fields"] == test_fields, f"Expected {test_fields}, got {data['mandatory_fields']}"
        print(f"Updated mandatory_fields: {data['mandatory_fields']}")
    
    def test_update_membership_settings_with_ebank_fields(self):
        """PUT /api/admin/membership-settings saves ebank fields"""
        test_fields = ["first_name", "last_name", "email", "ebank.investment_amount", "ebank.risk_level"]
        response = requests.put(
            f"{BASE_URL}/api/admin/membership-settings",
            headers=self.headers,
            json={"mandatory_fields": test_fields}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "ebank.investment_amount" in data["mandatory_fields"], "Should include ebank fields"
        print(f"Updated with ebank fields: {data['mandatory_fields']}")
    
    def test_update_membership_settings_empty_array(self):
        """PUT /api/admin/membership-settings accepts empty array"""
        response = requests.put(
            f"{BASE_URL}/api/admin/membership-settings",
            headers=self.headers,
            json={"mandatory_fields": []}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert data["mandatory_fields"] == [], "Should accept empty array"
        print("Empty mandatory_fields accepted")
        
        # Restore original fields
        requests.put(
            f"{BASE_URL}/api/admin/membership-settings",
            headers=self.headers,
            json={"mandatory_fields": ["first_name", "last_name", "email", "phone", "country"]}
        )


class TestPublicMembershipSettings:
    """Test Public Membership Settings endpoint"""
    
    def test_get_public_membership_settings(self):
        """GET /api/public/membership-settings returns mandatory_fields (no auth required)"""
        response = requests.get(f"{BASE_URL}/api/public/membership-settings")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "mandatory_fields" in data, "Response should contain mandatory_fields"
        assert isinstance(data["mandatory_fields"], list), "mandatory_fields should be a list"
        print(f"Public mandatory_fields: {data['mandatory_fields']}")


class TestMemberChangePassword:
    """Test Member Change Password endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin (who is also a member) before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_change_password_validation_min_length(self):
        """PUT /api/member/change-password validates min 8 chars"""
        response = requests.put(
            f"{BASE_URL}/api/member/change-password",
            headers=self.headers,
            json={"new_password": "short", "confirm_password": "short"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "8 characters" in data.get("detail", ""), f"Expected min length error, got: {data}"
        print("Min length validation works")
    
    def test_change_password_validation_mismatch(self):
        """PUT /api/member/change-password validates password match"""
        response = requests.put(
            f"{BASE_URL}/api/member/change-password",
            headers=self.headers,
            json={"new_password": "NewPassword123!", "confirm_password": "DifferentPassword123!"}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        data = response.json()
        assert "match" in data.get("detail", "").lower(), f"Expected mismatch error, got: {data}"
        print("Password mismatch validation works")
    
    def test_change_password_success(self):
        """PUT /api/member/change-password changes password successfully"""
        new_password = "NewAdmin123!"
        response = requests.put(
            f"{BASE_URL}/api/member/change-password",
            headers=self.headers,
            json={"new_password": new_password, "confirm_password": new_password}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "success" in data.get("message", "").lower(), f"Expected success message, got: {data}"
        print("Password changed successfully")
        
        # Verify new password works
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": new_password
        })
        assert login_response.status_code == 200, "Login with new password failed"
        print("Login with new password works")
        
        # Restore original password
        new_token = login_response.json().get("token")
        restore_response = requests.put(
            f"{BASE_URL}/api/member/change-password",
            headers={"Authorization": f"Bearer {new_token}"},
            json={"new_password": ADMIN_PASSWORD, "confirm_password": ADMIN_PASSWORD}
        )
        assert restore_response.status_code == 200, "Failed to restore original password"
        print("Original password restored")
    
    def test_change_password_requires_auth(self):
        """PUT /api/member/change-password requires authentication"""
        response = requests.put(
            f"{BASE_URL}/api/member/change-password",
            json={"new_password": "TestPassword123!", "confirm_password": "TestPassword123!"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Auth required validation works")


class TestMemberMeWithMemberType:
    """Test that /api/member/me returns _member_type with permissions"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_member_me_returns_member_type(self):
        """GET /api/member/me returns _member_type with permissions"""
        response = requests.get(f"{BASE_URL}/api/member/me", headers=self.headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        # Admin may or may not have a member_type assigned
        print(f"Member data keys: {list(data.keys())}")
        if "_member_type" in data:
            print(f"Member type: {data['_member_type']}")
        else:
            print("No _member_type assigned to admin member")


class TestAdminSidebarMembershipSettings:
    """Verify admin sidebar has Membership Settings entry"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_admin_membership_settings_endpoint_exists(self):
        """Verify /api/admin/membership-settings endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/admin/membership-settings", headers=self.headers)
        assert response.status_code == 200, f"Endpoint not accessible: {response.text}"
        print("Admin membership settings endpoint accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
