"""
Iteration 44: Landing Hero Clone from Website Hero
Tests for:
1. Landing Hero CRUD endpoints with new fields (buttons array, background_overlay)
2. Public landing-hero endpoint
3. Landing page content endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestLandingHeroCRUD:
    """Test Landing Hero CRUD with new fields: buttons array, background_overlay"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Auth headers for admin requests"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_01_list_landing_hero_slides(self, auth_headers):
        """GET /api/admin/landing-hero - List all landing hero slides"""
        response = requests.get(f"{BASE_URL}/api/admin/landing-hero", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} existing landing hero slides")
    
    def test_02_create_landing_hero_with_buttons_and_overlay(self, auth_headers):
        """POST /api/admin/landing-hero - Create slide with buttons array and background_overlay"""
        unique_id = str(uuid.uuid4())[:8]
        slide_data = {
            "title": f"<p>TEST_Title_{unique_id}</p>",
            "subtitle": f"<p>TEST_Subtitle_{unique_id}</p>",
            "description": f"<p>TEST_Description with membership-based content</p>",
            "date_start": "2026-01-01T00:00",
            "date_end": "2026-12-31T23:59",
            "slide_type": "video",
            "video_embed": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
            "background": "",
            "background_overlay": True,
            "buttons": [
                {"text": "Learn More", "url": "#contact", "window_open": "same", "style": "outline"},
                {"text": "Join Now", "url": "https://example.com", "window_open": "new", "style": "filled"}
            ],
            "title_effect": "top",
            "subtitle_effect": "right",
            "description_effect": "bottom",
            "button_effect": "left",
            "media_effect": "right",
            "title_x": 100, "title_y": 50,
            "subtitle_x": 100, "subtitle_y": 80,
            "description_x": 100, "description_y": 120,
            "button_x": 100, "button_y": 180,
            "media_x": 400, "media_y": 50,
            "transition": "fade",
            "slot_amount": 8,
            "master_speed": 700,
            "delay": 9400,
            "speed_per_layer": 400,
            "title_start": 1500,
            "subtitle_start": 2000,
            "description_start": 2500,
            "button_start": 3000,
            "media_start": 1000,
            "assigned_pages": [],
            "media_width": 420,
            "media_height": 280
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/landing-hero", json=slide_data, headers=auth_headers)
        assert response.status_code == 200, f"Create failed: {response.text}"
        
        created = response.json()
        assert "id" in created
        assert created["title"] == slide_data["title"]
        assert created["background_overlay"] == True
        assert len(created.get("buttons", [])) == 2
        assert created["buttons"][0]["text"] == "Learn More"
        assert created["buttons"][1]["style"] == "filled"
        
        # Store for later tests
        TestLandingHeroCRUD.created_slide_id = created["id"]
        print(f"Created landing hero slide: {created['id']}")
    
    def test_03_get_landing_hero_slide(self, auth_headers):
        """GET /api/admin/landing-hero/:id - Get single slide"""
        slide_id = getattr(TestLandingHeroCRUD, 'created_slide_id', None)
        if not slide_id:
            pytest.skip("No slide created in previous test")
        
        response = requests.get(f"{BASE_URL}/api/admin/landing-hero/{slide_id}", headers=auth_headers)
        assert response.status_code == 200
        
        slide = response.json()
        assert slide["id"] == slide_id
        assert "buttons" in slide
        assert "background_overlay" in slide
        print(f"Retrieved slide with {len(slide.get('buttons', []))} buttons")
    
    def test_04_update_landing_hero_overlay_false(self, auth_headers):
        """PUT /api/admin/landing-hero/:id - Update background_overlay to false"""
        slide_id = getattr(TestLandingHeroCRUD, 'created_slide_id', None)
        if not slide_id:
            pytest.skip("No slide created in previous test")
        
        update_data = {
            "background_overlay": False,
            "buttons": [
                {"text": "Updated Button", "url": "#waitlist", "window_open": "same", "style": "filled"}
            ]
        }
        
        response = requests.put(f"{BASE_URL}/api/admin/landing-hero/{slide_id}", json=update_data, headers=auth_headers)
        assert response.status_code == 200
        
        updated = response.json()
        assert updated["background_overlay"] == False
        assert len(updated.get("buttons", [])) == 1
        assert updated["buttons"][0]["text"] == "Updated Button"
        print("Updated slide: overlay=False, 1 button")
    
    def test_05_public_landing_hero_endpoint(self):
        """GET /api/public/landing-hero - Public endpoint returns slides"""
        response = requests.get(f"{BASE_URL}/api/public/landing-hero")
        assert response.status_code == 200
        
        slides = response.json()
        assert isinstance(slides, list)
        print(f"Public endpoint returned {len(slides)} slides")
        
        # Check that our test slide is in the list
        slide_id = getattr(TestLandingHeroCRUD, 'created_slide_id', None)
        if slide_id:
            found = any(s.get("id") == slide_id for s in slides)
            assert found, "Created slide should be in public list"
    
    def test_06_create_slide_with_overlay_no(self, auth_headers):
        """Create slide with background_overlay=false"""
        unique_id = str(uuid.uuid4())[:8]
        slide_data = {
            "title": f"<p>TEST_NoOverlay_{unique_id}</p>",
            "subtitle": "",
            "description": "",
            "slide_type": "photo",
            "background_overlay": False,
            "buttons": []
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/landing-hero", json=slide_data, headers=auth_headers)
        assert response.status_code == 200
        
        created = response.json()
        assert created["background_overlay"] == False
        TestLandingHeroCRUD.no_overlay_slide_id = created["id"]
        print(f"Created no-overlay slide: {created['id']}")
    
    def test_07_delete_landing_hero_slide(self, auth_headers):
        """DELETE /api/admin/landing-hero/:id - Delete slide"""
        slide_id = getattr(TestLandingHeroCRUD, 'created_slide_id', None)
        if not slide_id:
            pytest.skip("No slide to delete")
        
        response = requests.delete(f"{BASE_URL}/api/admin/landing-hero/{slide_id}", headers=auth_headers)
        assert response.status_code == 200
        
        # Verify deletion
        response = requests.get(f"{BASE_URL}/api/admin/landing-hero/{slide_id}", headers=auth_headers)
        assert response.status_code == 404
        print(f"Deleted slide: {slide_id}")
    
    def test_08_cleanup_no_overlay_slide(self, auth_headers):
        """Cleanup: Delete the no-overlay test slide"""
        slide_id = getattr(TestLandingHeroCRUD, 'no_overlay_slide_id', None)
        if slide_id:
            requests.delete(f"{BASE_URL}/api/admin/landing-hero/{slide_id}", headers=auth_headers)
            print(f"Cleaned up no-overlay slide: {slide_id}")


class TestLandingContentEndpoints:
    """Test landing content endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_01_get_landing_content(self, auth_headers):
        """GET /api/admin/landing-content"""
        response = requests.get(f"{BASE_URL}/api/admin/landing-content", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        print(f"Landing content keys: {list(data.keys())[:10]}...")
    
    def test_02_public_landing_content(self):
        """GET /api/public/landing-content"""
        response = requests.get(f"{BASE_URL}/api/public/landing-content")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        print("Public landing content accessible")


class TestLandingSubscribersAndContacts:
    """Test landing subscribers and contacts endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_01_subscribe_to_waitlist(self):
        """POST /api/public/landing-subscribe"""
        unique_id = str(uuid.uuid4())[:8]
        response = requests.post(f"{BASE_URL}/api/public/landing-subscribe", json={
            "first_name": f"Test_{unique_id}",
            "last_name": "User",
            "email": f"test_{unique_id}@example.com"
        })
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        TestLandingSubscribersAndContacts.subscriber_id = data["id"]
        print(f"Subscribed: {data['id']}")
    
    def test_02_submit_contact_form(self):
        """POST /api/public/landing-contact"""
        unique_id = str(uuid.uuid4())[:8]
        response = requests.post(f"{BASE_URL}/api/public/landing-contact", json={
            "first_name": f"Contact_{unique_id}",
            "email": f"contact_{unique_id}@example.com",
            "subject": "Test Subject",
            "message": "Test message content"
        })
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        TestLandingSubscribersAndContacts.contact_id = data["id"]
        print(f"Contact submitted: {data['id']}")
    
    def test_03_list_subscribers(self, auth_headers):
        """GET /api/admin/landing-subscribers"""
        response = requests.get(f"{BASE_URL}/api/admin/landing-subscribers", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} subscribers")
    
    def test_04_list_contacts(self, auth_headers):
        """GET /api/admin/landing-contacts"""
        response = requests.get(f"{BASE_URL}/api/admin/landing-contacts", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} contacts")
    
    def test_05_cleanup_subscriber(self, auth_headers):
        """DELETE /api/admin/landing-subscribers/:id"""
        sub_id = getattr(TestLandingSubscribersAndContacts, 'subscriber_id', None)
        if sub_id:
            response = requests.delete(f"{BASE_URL}/api/admin/landing-subscribers/{sub_id}", headers=auth_headers)
            assert response.status_code == 200
            print(f"Cleaned up subscriber: {sub_id}")
    
    def test_06_cleanup_contact(self, auth_headers):
        """DELETE /api/admin/landing-contacts/:id"""
        contact_id = getattr(TestLandingSubscribersAndContacts, 'contact_id', None)
        if contact_id:
            response = requests.delete(f"{BASE_URL}/api/admin/landing-contacts/{contact_id}", headers=auth_headers)
            assert response.status_code == 200
            print(f"Cleaned up contact: {contact_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
