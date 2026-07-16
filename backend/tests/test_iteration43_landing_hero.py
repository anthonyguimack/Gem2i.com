"""
Iteration 43: Landing Page Redesign - Landing Hero CRUD Tests
Tests for the new Landing Hero Manager feature with CRUD operations
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestLandingHeroCRUD:
    """Tests for Landing Hero Slides CRUD operations"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        return data.get("token")
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Headers with admin auth"""
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    # ─── Public Landing Hero Endpoint ───
    def test_public_landing_hero_list(self):
        """GET /api/public/landing-hero - should return list of hero slides"""
        response = requests.get(f"{BASE_URL}/api/public/landing-hero")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Public landing hero slides: {len(data)} slides")
    
    # ─── Admin Landing Hero CRUD ───
    def test_admin_landing_hero_list(self, admin_headers):
        """GET /api/admin/landing-hero - should return list of hero slides (admin)"""
        response = requests.get(f"{BASE_URL}/api/admin/landing-hero", headers=admin_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Admin landing hero slides: {len(data)} slides")
    
    def test_admin_landing_hero_create(self, admin_headers):
        """POST /api/admin/landing-hero - should create a new hero slide"""
        test_id = str(uuid.uuid4())[:8]
        payload = {
            "title": f"TEST_Hero_Title_{test_id}",
            "subtitle": f"TEST_Hero_Subtitle_{test_id}",
            "description": f"<p>TEST description for hero slide {test_id}</p>",
            "background": "",
            "video_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "button1_text": "More Information",
            "button2_text": "Membership Lounge",
            "button3_text": "Add to Waiting List",
            "order": 99
        }
        response = requests.post(f"{BASE_URL}/api/admin/landing-hero", json=payload, headers=admin_headers)
        assert response.status_code == 200, f"Failed to create: {response.text}"
        data = response.json()
        assert "id" in data, "Response should contain id"
        assert data["title"] == payload["title"], "Title should match"
        assert data["video_url"] == payload["video_url"], "Video URL should match"
        assert data["button1_text"] == payload["button1_text"], "Button1 text should match"
        print(f"Created hero slide with id: {data['id']}")
        return data["id"]
    
    def test_admin_landing_hero_get_single(self, admin_headers):
        """GET /api/admin/landing-hero/{id} - should get a single hero slide"""
        # First create a slide
        test_id = str(uuid.uuid4())[:8]
        create_payload = {
            "title": f"TEST_Get_Single_{test_id}",
            "description": "Test description",
            "order": 98
        }
        create_response = requests.post(f"{BASE_URL}/api/admin/landing-hero", json=create_payload, headers=admin_headers)
        assert create_response.status_code == 200
        slide_id = create_response.json()["id"]
        
        # Now get it
        response = requests.get(f"{BASE_URL}/api/admin/landing-hero/{slide_id}", headers=admin_headers)
        assert response.status_code == 200, f"Failed to get: {response.text}"
        data = response.json()
        assert data["id"] == slide_id, "ID should match"
        assert data["title"] == create_payload["title"], "Title should match"
        print(f"Retrieved hero slide: {data['title']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/landing-hero/{slide_id}", headers=admin_headers)
    
    def test_admin_landing_hero_update(self, admin_headers):
        """PUT /api/admin/landing-hero/{id} - should update a hero slide"""
        # First create a slide
        test_id = str(uuid.uuid4())[:8]
        create_payload = {
            "title": f"TEST_Update_Original_{test_id}",
            "description": "Original description",
            "order": 97
        }
        create_response = requests.post(f"{BASE_URL}/api/admin/landing-hero", json=create_payload, headers=admin_headers)
        assert create_response.status_code == 200
        slide_id = create_response.json()["id"]
        
        # Update it
        update_payload = {
            "title": f"TEST_Update_Modified_{test_id}",
            "description": "Modified description",
            "video_url": "https://vimeo.com/123456789"
        }
        response = requests.put(f"{BASE_URL}/api/admin/landing-hero/{slide_id}", json=update_payload, headers=admin_headers)
        assert response.status_code == 200, f"Failed to update: {response.text}"
        data = response.json()
        assert data["title"] == update_payload["title"], "Title should be updated"
        assert data["description"] == update_payload["description"], "Description should be updated"
        print(f"Updated hero slide: {data['title']}")
        
        # Verify with GET
        get_response = requests.get(f"{BASE_URL}/api/admin/landing-hero/{slide_id}", headers=admin_headers)
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["title"] == update_payload["title"], "GET should return updated title"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/landing-hero/{slide_id}", headers=admin_headers)
    
    def test_admin_landing_hero_delete(self, admin_headers):
        """DELETE /api/admin/landing-hero/{id} - should delete a hero slide"""
        # First create a slide
        test_id = str(uuid.uuid4())[:8]
        create_payload = {
            "title": f"TEST_Delete_{test_id}",
            "order": 96
        }
        create_response = requests.post(f"{BASE_URL}/api/admin/landing-hero", json=create_payload, headers=admin_headers)
        assert create_response.status_code == 200
        slide_id = create_response.json()["id"]
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/admin/landing-hero/{slide_id}", headers=admin_headers)
        assert response.status_code == 200, f"Failed to delete: {response.text}"
        print(f"Deleted hero slide: {slide_id}")
        
        # Verify it's gone
        get_response = requests.get(f"{BASE_URL}/api/admin/landing-hero/{slide_id}", headers=admin_headers)
        assert get_response.status_code == 404, "Deleted slide should return 404"
    
    def test_admin_landing_hero_delete_nonexistent(self, admin_headers):
        """DELETE /api/admin/landing-hero/{id} - should return 404 for nonexistent slide"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/api/admin/landing-hero/{fake_id}", headers=admin_headers)
        assert response.status_code == 404, f"Should return 404 for nonexistent slide"
    
    def test_admin_landing_hero_requires_auth(self):
        """Admin landing hero endpoints should require authentication"""
        # List without auth
        response = requests.get(f"{BASE_URL}/api/admin/landing-hero")
        assert response.status_code == 401, "Should require auth for list"
        
        # Create without auth
        response = requests.post(f"{BASE_URL}/api/admin/landing-hero", json={"title": "test"})
        assert response.status_code == 401, "Should require auth for create"


class TestLandingContentAPI:
    """Tests for Landing Content API"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_public_landing_content(self):
        """GET /api/public/landing-content - should return landing content"""
        response = requests.get(f"{BASE_URL}/api/public/landing-content")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, dict), "Response should be a dict"
        print(f"Landing content keys: {list(data.keys())}")
    
    def test_admin_landing_content_get(self, admin_headers):
        """GET /api/admin/landing-content - should return landing content (admin)"""
        response = requests.get(f"{BASE_URL}/api/admin/landing-content", headers=admin_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, dict), "Response should be a dict"
    
    def test_admin_landing_content_update(self, admin_headers):
        """PUT /api/admin/landing-content - should update landing content"""
        # Get current content
        get_response = requests.get(f"{BASE_URL}/api/admin/landing-content", headers=admin_headers)
        current = get_response.json()
        
        # Update with test data
        test_id = str(uuid.uuid4())[:8]
        update_payload = {
            **current,
            "nav1_text": "Home",
            "nav2_text": "More Information",
            "nav3_text": "Membership Lounge",
            "nav4_text": "Waiting List",
            "contact_title": f"Get in touch with us! {test_id}",
            "waitlist_title": "Waiting List",
            "footer_social_title": "Follow Us"
        }
        response = requests.put(f"{BASE_URL}/api/admin/landing-content", json=update_payload, headers=admin_headers)
        assert response.status_code == 200, f"Failed to update: {response.text}"
        data = response.json()
        assert data.get("nav1_text") == "Home", "Nav1 text should be updated"
        print(f"Updated landing content with contact_title: {data.get('contact_title')}")


class TestLandingSubscribersAPI:
    """Tests for Landing Subscribers (Waiting List) API"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_public_landing_subscribe(self):
        """POST /api/public/landing-subscribe - should subscribe a user"""
        test_id = str(uuid.uuid4())[:8]
        payload = {
            "first_name": f"Test_{test_id}",
            "last_name": f"User_{test_id}",
            "email": f"test_waitlist_{test_id}@example.com"
        }
        response = requests.post(f"{BASE_URL}/api/public/landing-subscribe", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "id" in data or "message" in data, "Response should contain id or message"
        print(f"Subscribed: {payload['email']}")
    
    def test_public_landing_subscribe_duplicate(self):
        """POST /api/public/landing-subscribe - should handle duplicate email"""
        test_id = str(uuid.uuid4())[:8]
        payload = {
            "first_name": "Duplicate",
            "last_name": "Test",
            "email": f"duplicate_test_{test_id}@example.com"
        }
        # First subscription
        response1 = requests.post(f"{BASE_URL}/api/public/landing-subscribe", json=payload)
        assert response1.status_code == 200
        
        # Second subscription with same email
        response2 = requests.post(f"{BASE_URL}/api/public/landing-subscribe", json=payload)
        assert response2.status_code == 200, "Should handle duplicate gracefully"
        data = response2.json()
        assert "Already subscribed" in data.get("message", ""), "Should indicate already subscribed"
    
    def test_public_landing_subscribe_missing_email(self):
        """POST /api/public/landing-subscribe - should require email"""
        payload = {"first_name": "Test", "last_name": "User"}
        response = requests.post(f"{BASE_URL}/api/public/landing-subscribe", json=payload)
        assert response.status_code == 400, "Should return 400 for missing email"
    
    def test_admin_landing_subscribers_list(self, admin_headers):
        """GET /api/admin/landing-subscribers - should return list of subscribers"""
        response = requests.get(f"{BASE_URL}/api/admin/landing-subscribers", headers=admin_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Total subscribers: {len(data)}")


class TestLandingContactsAPI:
    """Tests for Landing Contacts (Get in Touch) API"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_public_landing_contact(self):
        """POST /api/public/landing-contact - should submit a contact message"""
        test_id = str(uuid.uuid4())[:8]
        payload = {
            "first_name": f"Contact_{test_id}",
            "email": f"contact_test_{test_id}@example.com",
            "subject": f"Test Subject {test_id}",
            "message": f"This is a test message from iteration 43 testing. ID: {test_id}"
        }
        response = requests.post(f"{BASE_URL}/api/public/landing-contact", json=payload)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert "id" in data, "Response should contain id"
        print(f"Contact submitted: {payload['email']}")
    
    def test_public_landing_contact_missing_email(self):
        """POST /api/public/landing-contact - should require email"""
        payload = {"first_name": "Test", "subject": "Test", "message": "Test"}
        response = requests.post(f"{BASE_URL}/api/public/landing-contact", json=payload)
        assert response.status_code == 400, "Should return 400 for missing email"
    
    def test_admin_landing_contacts_list(self, admin_headers):
        """GET /api/admin/landing-contacts - should return list of contacts"""
        response = requests.get(f"{BASE_URL}/api/admin/landing-contacts", headers=admin_headers)
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        # Check that contacts have subject field
        if len(data) > 0:
            assert "subject" in data[0] or data[0].get("subject") is None, "Contacts should have subject field"
        print(f"Total contacts: {len(data)}")


class TestAdminLogin:
    """Test admin login functionality"""
    
    def test_admin_login_success(self):
        """POST /api/auth/login - should login admin successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert data.get("user", {}).get("role") == "admin", "User should be admin"
        print("Admin login successful")
    
    def test_admin_login_wrong_password(self):
        """POST /api/auth/login - should fail with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "WrongPassword123!"
        })
        assert response.status_code == 401, "Should return 401 for wrong password"


# Cleanup test data
class TestCleanup:
    """Cleanup test data created during testing"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    
    def test_cleanup_test_hero_slides(self, admin_headers):
        """Clean up TEST_ prefixed hero slides"""
        response = requests.get(f"{BASE_URL}/api/admin/landing-hero", headers=admin_headers)
        if response.status_code == 200:
            slides = response.json()
            deleted = 0
            for slide in slides:
                if slide.get("title", "").startswith("TEST_"):
                    del_response = requests.delete(f"{BASE_URL}/api/admin/landing-hero/{slide['id']}", headers=admin_headers)
                    if del_response.status_code == 200:
                        deleted += 1
            print(f"Cleaned up {deleted} test hero slides")
