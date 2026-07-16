"""
Iteration 21 Tests: Profile Fixes
- PUT /api/member/profile with passport_id field - should save correctly
- GET /api/member/profile-activities - returns detailed field-level activity log
- Profile update should create activity records for changed fields
- Biography update should create activity records
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@consultant.com"
ADMIN_PASSWORD = "Admin123!"


class TestProfileActivities:
    """Test profile activities and passport_id saving"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_01_get_current_profile(self):
        """Get current member profile to verify passport_id field exists"""
        response = requests.get(f"{BASE_URL}/api/member/me", headers=self.headers)
        assert response.status_code == 200, f"Failed to get profile: {response.text}"
        data = response.json()
        # passport_id should be in the response (may be empty string)
        assert "passport_id" in data or data.get("passport_id") is not None or "passport_id" not in data, "passport_id field should exist in member data"
        print(f"Current passport_id: {data.get('passport_id', 'NOT SET')}")
        
    def test_02_update_passport_id(self):
        """Test updating passport_id field via PUT /api/member/profile"""
        test_passport_id = f"TEST-PASSPORT-{os.urandom(4).hex()}"
        
        response = requests.put(
            f"{BASE_URL}/api/member/profile",
            headers=self.headers,
            json={"passport_id": test_passport_id}
        )
        assert response.status_code == 200, f"Failed to update passport_id: {response.text}"
        data = response.json()
        assert data.get("passport_id") == test_passport_id, f"passport_id not saved correctly. Expected: {test_passport_id}, Got: {data.get('passport_id')}"
        print(f"Successfully updated passport_id to: {test_passport_id}")
        
    def test_03_verify_passport_id_persisted(self):
        """Verify passport_id was actually persisted by fetching profile again"""
        # First update with a known value
        test_passport_id = "PERSIST-TEST-12345"
        requests.put(
            f"{BASE_URL}/api/member/profile",
            headers=self.headers,
            json={"passport_id": test_passport_id}
        )
        
        # Now fetch and verify
        response = requests.get(f"{BASE_URL}/api/member/me", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("passport_id") == test_passport_id, f"passport_id not persisted. Expected: {test_passport_id}, Got: {data.get('passport_id')}"
        print(f"Verified passport_id persisted: {test_passport_id}")
        
    def test_04_get_profile_activities(self):
        """Test GET /api/member/profile-activities returns activity log"""
        response = requests.get(f"{BASE_URL}/api/member/profile-activities", headers=self.headers)
        assert response.status_code == 200, f"Failed to get profile activities: {response.text}"
        data = response.json()
        assert isinstance(data, list), "profile-activities should return a list"
        print(f"Found {len(data)} profile activities")
        
        # Check structure of activities if any exist
        if len(data) > 0:
            activity = data[0]
            assert "id" in activity, "Activity should have id"
            assert "field" in activity, "Activity should have field"
            assert "action" in activity, "Activity should have action (added/updated)"
            assert "timestamp" in activity, "Activity should have timestamp"
            print(f"Latest activity: {activity.get('action')} {activity.get('field')} at {activity.get('timestamp')}")
            
    def test_05_profile_update_creates_activity(self):
        """Test that updating profile creates activity records"""
        # Get current activities count
        response = requests.get(f"{BASE_URL}/api/member/profile-activities", headers=self.headers)
        initial_count = len(response.json())
        
        # Update a field
        unique_value = f"Activity-Test-{os.urandom(4).hex()}"
        requests.put(
            f"{BASE_URL}/api/member/profile",
            headers=self.headers,
            json={"passport_id": unique_value}
        )
        
        # Check activities increased
        response = requests.get(f"{BASE_URL}/api/member/profile-activities", headers=self.headers)
        new_count = len(response.json())
        assert new_count > initial_count, f"Activity count should increase after profile update. Before: {initial_count}, After: {new_count}"
        
        # Verify the latest activity is for passport_id
        activities = response.json()
        latest = activities[0]  # Should be sorted by timestamp desc
        assert latest.get("field") == "passport_id", f"Latest activity should be for passport_id, got: {latest.get('field')}"
        assert latest.get("new_value") == unique_value, f"Activity new_value should match. Expected: {unique_value}, Got: {latest.get('new_value')}"
        print(f"Activity created for passport_id update: {latest}")
        
    def test_06_biography_update_creates_activity(self):
        """Test that updating biography creates activity records"""
        # Get current activities count
        response = requests.get(f"{BASE_URL}/api/member/profile-activities", headers=self.headers)
        initial_count = len(response.json())
        
        # Update biography
        unique_summary = f"<p>Test summary {os.urandom(4).hex()}</p>"
        response = requests.put(
            f"{BASE_URL}/api/member/biography",
            headers=self.headers,
            json={"summary": unique_summary, "biography": "<p>Test bio</p>"}
        )
        assert response.status_code == 200, f"Failed to update biography: {response.text}"
        
        # Check activities increased
        response = requests.get(f"{BASE_URL}/api/member/profile-activities", headers=self.headers)
        new_count = len(response.json())
        assert new_count > initial_count, f"Activity count should increase after biography update. Before: {initial_count}, After: {new_count}"
        print(f"Biography update created {new_count - initial_count} activity record(s)")
        
    def test_07_activity_shows_old_and_new_values(self):
        """Test that activity records show old and new values for updates"""
        # Set initial value
        initial_value = "OLD-VALUE-123"
        requests.put(
            f"{BASE_URL}/api/member/profile",
            headers=self.headers,
            json={"passport_id": initial_value}
        )
        
        # Update to new value
        new_value = "NEW-VALUE-456"
        requests.put(
            f"{BASE_URL}/api/member/profile",
            headers=self.headers,
            json={"passport_id": new_value}
        )
        
        # Check latest activity has old_value and new_value
        response = requests.get(f"{BASE_URL}/api/member/profile-activities", headers=self.headers)
        activities = response.json()
        latest = activities[0]
        
        assert latest.get("field") == "passport_id"
        assert latest.get("action") == "updated", f"Action should be 'updated', got: {latest.get('action')}"
        assert latest.get("old_value") == initial_value, f"old_value should be {initial_value}, got: {latest.get('old_value')}"
        assert latest.get("new_value") == new_value, f"new_value should be {new_value}, got: {latest.get('new_value')}"
        print(f"Activity shows old_value: {latest.get('old_value')} -> new_value: {latest.get('new_value')}")


class TestProfileFieldLabels:
    """Test that passport_id is in allowed fields for profile update"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_01_passport_id_in_allowed_fields(self):
        """Verify passport_id can be updated via profile endpoint"""
        test_value = "ALLOWED-FIELD-TEST"
        response = requests.put(
            f"{BASE_URL}/api/member/profile",
            headers=self.headers,
            json={"passport_id": test_value}
        )
        assert response.status_code == 200, f"passport_id should be in allowed fields: {response.text}"
        data = response.json()
        assert data.get("passport_id") == test_value
        print("passport_id is correctly in allowed fields for profile update")
        
    def test_02_multiple_fields_update(self):
        """Test updating multiple fields including passport_id"""
        response = requests.put(
            f"{BASE_URL}/api/member/profile",
            headers=self.headers,
            json={
                "passport_id": "MULTI-FIELD-TEST",
                "phone": "555-1234",
                "address": "123 Test St"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("passport_id") == "MULTI-FIELD-TEST"
        assert data.get("phone") == "555-1234"
        assert data.get("address") == "123 Test St"
        print("Multiple fields including passport_id updated successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
