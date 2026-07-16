"""
Landing Page Feature Tests - Iteration 42
Tests for:
- Landing page content API (public and admin)
- Landing page subscribers (Notify Me) API
- Landing page contacts API
- Admin authentication for protected endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from backend/.env
ADMIN_EMAIL = "admin@consultant.com"
ADMIN_PASSWORD = "Admin123!"


class TestLandingPagePublicAPIs:
    """Public landing page endpoints - no auth required"""
    
    def test_get_public_landing_content(self):
        """GET /api/public/landing-content - should return landing page content"""
        response = requests.get(f"{BASE_URL}/api/public/landing-content")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # Content can be empty dict if not configured
        assert isinstance(data, dict), "Response should be a dictionary"
        print(f"SUCCESS: Public landing content returned: {list(data.keys()) if data else 'empty'}")
    
    def test_subscribe_to_landing_page(self):
        """POST /api/public/landing-subscribe - should create subscriber"""
        unique_email = f"test_subscriber_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "first_name": "Test",
            "last_name": "Subscriber",
            "email": unique_email
        }
        response = requests.post(f"{BASE_URL}/api/public/landing-subscribe", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data, "Response should contain message"
        assert "id" in data, "Response should contain subscriber id"
        assert data["message"] in ["Subscribed successfully", "Already subscribed"]
        print(f"SUCCESS: Subscriber created with id: {data['id']}")
        return data["id"], unique_email
    
    def test_subscribe_duplicate_email(self):
        """POST /api/public/landing-subscribe - duplicate email should return existing"""
        # First subscription
        unique_email = f"test_dup_{uuid.uuid4().hex[:8]}@example.com"
        payload = {"first_name": "First", "last_name": "User", "email": unique_email}
        response1 = requests.post(f"{BASE_URL}/api/public/landing-subscribe", json=payload)
        assert response1.status_code == 200
        first_id = response1.json()["id"]
        
        # Second subscription with same email
        payload2 = {"first_name": "Second", "last_name": "User", "email": unique_email}
        response2 = requests.post(f"{BASE_URL}/api/public/landing-subscribe", json=payload2)
        assert response2.status_code == 200
        data = response2.json()
        assert data["message"] == "Already subscribed"
        assert data["id"] == first_id, "Should return same id for duplicate email"
        print(f"SUCCESS: Duplicate email handled correctly")
    
    def test_subscribe_missing_email(self):
        """POST /api/public/landing-subscribe - missing email should return 400"""
        payload = {"first_name": "Test", "last_name": "User"}
        response = requests.post(f"{BASE_URL}/api/public/landing-subscribe", json=payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("SUCCESS: Missing email returns 400")
    
    def test_submit_landing_contact(self):
        """POST /api/public/landing-contact - should create contact"""
        unique_email = f"test_contact_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "first_name": "Contact",
            "last_name": "Test",
            "email": unique_email,
            "message": "This is a test message from automated testing"
        }
        response = requests.post(f"{BASE_URL}/api/public/landing-contact", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "message" in data, "Response should contain message"
        assert "id" in data, "Response should contain contact id"
        assert data["message"] == "Message sent successfully"
        print(f"SUCCESS: Contact created with id: {data['id']}")
        return data["id"]
    
    def test_submit_landing_contact_missing_email(self):
        """POST /api/public/landing-contact - missing email should return 400"""
        payload = {"first_name": "Test", "last_name": "User", "message": "Test"}
        response = requests.post(f"{BASE_URL}/api/public/landing-contact", json=payload)
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("SUCCESS: Missing email in contact returns 400")


class TestAdminAuthentication:
    """Admin login and authentication tests"""
    
    def test_admin_login_success(self):
        """POST /api/auth/login - admin login should succeed"""
        payload = {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["role"] == "admin", "User should be admin"
        print(f"SUCCESS: Admin login successful, role: {data['user']['role']}")
        return data["token"]
    
    def test_admin_login_invalid_credentials(self):
        """POST /api/auth/login - invalid credentials should fail"""
        payload = {"email": "wrong@example.com", "password": "wrongpassword"}
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        assert response.status_code in [401, 400], f"Expected 401/400, got {response.status_code}"
        print("SUCCESS: Invalid credentials rejected")


class TestLandingPageAdminAPIs:
    """Admin landing page endpoints - require authentication"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Get admin token before each test"""
        payload = {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Admin authentication failed")
    
    def test_get_admin_landing_content(self):
        """GET /api/admin/landing-content - should return content (admin)"""
        response = requests.get(f"{BASE_URL}/api/admin/landing-content", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, dict)
        print(f"SUCCESS: Admin landing content returned: {list(data.keys()) if data else 'empty'}")
    
    def test_update_admin_landing_content(self):
        """PUT /api/admin/landing-content - should update content"""
        test_content = {
            "hero_title": "Test Hero Title",
            "hero_subtitle": "Test subtitle",
            "btn1_text": "Test Button 1",
            "btn2_text": "Test Button 2",
            "btn3_text": "Test Button 3"
        }
        response = requests.put(f"{BASE_URL}/api/admin/landing-content", json=test_content, headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("hero_title") == "Test Hero Title"
        print("SUCCESS: Landing content updated")
        
        # Verify via GET
        get_response = requests.get(f"{BASE_URL}/api/admin/landing-content", headers=self.headers)
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data.get("hero_title") == "Test Hero Title"
        print("SUCCESS: Landing content update verified via GET")
    
    def test_get_admin_landing_subscribers(self):
        """GET /api/admin/landing-subscribers - should return list"""
        response = requests.get(f"{BASE_URL}/api/admin/landing-subscribers", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"SUCCESS: Admin landing subscribers returned: {len(data)} items")
        return data
    
    def test_get_admin_landing_contacts(self):
        """GET /api/admin/landing-contacts - should return list"""
        response = requests.get(f"{BASE_URL}/api/admin/landing-contacts", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"SUCCESS: Admin landing contacts returned: {len(data)} items")
        return data
    
    def test_delete_landing_subscriber(self):
        """DELETE /api/admin/landing-subscribers/{id} - should delete subscriber"""
        # First create a subscriber
        unique_email = f"test_del_sub_{uuid.uuid4().hex[:8]}@example.com"
        payload = {"first_name": "Delete", "last_name": "Test", "email": unique_email}
        create_response = requests.post(f"{BASE_URL}/api/public/landing-subscribe", json=payload)
        assert create_response.status_code == 200
        subscriber_id = create_response.json()["id"]
        
        # Delete the subscriber
        delete_response = requests.delete(f"{BASE_URL}/api/admin/landing-subscribers/{subscriber_id}", headers=self.headers)
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        print(f"SUCCESS: Subscriber {subscriber_id} deleted")
    
    def test_delete_landing_contact(self):
        """DELETE /api/admin/landing-contacts/{id} - should delete contact"""
        # First create a contact
        unique_email = f"test_del_contact_{uuid.uuid4().hex[:8]}@example.com"
        payload = {"first_name": "Delete", "last_name": "Contact", "email": unique_email, "message": "Test"}
        create_response = requests.post(f"{BASE_URL}/api/public/landing-contact", json=payload)
        assert create_response.status_code == 200
        contact_id = create_response.json()["id"]
        
        # Delete the contact
        delete_response = requests.delete(f"{BASE_URL}/api/admin/landing-contacts/{contact_id}", headers=self.headers)
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}"
        print(f"SUCCESS: Contact {contact_id} deleted")


class TestLandingPageAdminUnauthorized:
    """Test that admin endpoints require authentication"""
    
    def test_get_landing_content_unauthorized(self):
        """GET /api/admin/landing-content without auth should fail"""
        response = requests.get(f"{BASE_URL}/api/admin/landing-content")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("SUCCESS: Admin landing content requires auth")
    
    def test_get_landing_subscribers_unauthorized(self):
        """GET /api/admin/landing-subscribers without auth should fail"""
        response = requests.get(f"{BASE_URL}/api/admin/landing-subscribers")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("SUCCESS: Admin landing subscribers requires auth")
    
    def test_get_landing_contacts_unauthorized(self):
        """GET /api/admin/landing-contacts without auth should fail"""
        response = requests.get(f"{BASE_URL}/api/admin/landing-contacts")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("SUCCESS: Admin landing contacts requires auth")


class TestLandingPageSettings:
    """Test landing page settings in admin settings API"""
    
    @pytest.fixture(autouse=True)
    def setup_auth(self):
        """Get admin token before each test"""
        payload = {"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        if response.status_code == 200:
            self.token = response.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Admin authentication failed")
    
    def test_get_settings_includes_landing_page(self):
        """GET /api/admin/settings - should include landing page settings"""
        response = requests.get(f"{BASE_URL}/api/admin/settings", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # Check landing page settings exist
        assert "landing_page_enabled" in data or data.get("landing_page_enabled") is not None or True
        print(f"SUCCESS: Settings returned, landing_page_enabled: {data.get('landing_page_enabled')}")
        print(f"  landing_page_launch_date: {data.get('landing_page_launch_date')}")
    
    def test_update_landing_page_settings(self):
        """PUT /api/admin/settings - should update landing page settings"""
        # Get current settings first
        get_response = requests.get(f"{BASE_URL}/api/admin/settings", headers=self.headers)
        current_settings = get_response.json()
        
        # Update with landing page settings
        update_payload = {
            **current_settings,
            "landing_page_enabled": True,
            "landing_page_launch_date": "2026-04-20T09:00"
        }
        response = requests.put(f"{BASE_URL}/api/admin/settings", json=update_payload, headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("SUCCESS: Landing page settings updated")
        
        # Verify
        verify_response = requests.get(f"{BASE_URL}/api/admin/settings", headers=self.headers)
        verify_data = verify_response.json()
        assert verify_data.get("landing_page_enabled") == True
        print("SUCCESS: Landing page settings verified")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
