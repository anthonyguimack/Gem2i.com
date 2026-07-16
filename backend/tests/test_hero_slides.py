"""
Test Hero Slides CRUD API endpoints
Tests for: GET/POST/PUT/DELETE /api/admin/hero-slides and GET /api/public/hero-slides
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@consultant.com"
ADMIN_PASSWORD = "Admin123!"

@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    data = response.json()
    assert "token" in data, "No token in login response"
    return data["token"]

@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers with admin auth token"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }

class TestHeroSlidesAdminCRUD:
    """Test admin CRUD operations for hero slides"""
    
    created_slide_id = None
    
    def test_01_list_hero_slides(self, admin_headers):
        """GET /api/admin/hero-slides - List all slides"""
        response = requests.get(f"{BASE_URL}/api/admin/hero-slides", headers=admin_headers)
        assert response.status_code == 200, f"Failed to list slides: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} existing hero slides")
    
    def test_02_create_hero_slide_full_fields(self, admin_headers):
        """POST /api/admin/hero-slides - Create slide with all fields"""
        slide_data = {
            "title": "<strong>TEST</strong> Hero Slide",
            "subtitle": "<em>Test</em> Subtitle",
            "description": "<p>Test description with <strong>HTML</strong></p>",
            "date_start": "2025-01-01T00:00:00",
            "date_end": "2025-12-31T23:59:59",
            "slide_type": "photo",
            "button_text": "Learn More",
            "button_url": "https://example.com",
            "window_open": "new",
            "background": "https://example.com/bg.jpg",
            "photo": "https://example.com/photo.jpg",
            "video_embed": "",
            # Animation effects
            "title_effect": "top",
            "subtitle_effect": "right",
            "description_effect": "bottom",
            "button_effect": "left",
            "media_effect": "right",
            # Coordinates
            "title_x": 100,
            "title_y": 50,
            "subtitle_x": 100,
            "subtitle_y": 80,
            "description_x": 100,
            "description_y": 120,
            "button_x": 100,
            "button_y": 180,
            "media_x": 400,
            "media_y": 50,
            # Revolution slider params
            "transition": "fade",
            "slot_amount": 8,
            "master_speed": 700,
            "delay": 9400,
            "speed_per_layer": 400,
            "title_start": 1500,
            "subtitle_start": 2000,
            "description_start": 2500,
            "button_start": 3000,
            "media_start": 1000
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/hero-slides", json=slide_data, headers=admin_headers)
        assert response.status_code == 200, f"Failed to create slide: {response.text}"
        
        data = response.json()
        assert "id" in data, "Created slide should have an id"
        assert data["title"] == slide_data["title"], "Title mismatch"
        assert data["subtitle"] == slide_data["subtitle"], "Subtitle mismatch"
        assert data["slide_type"] == "photo", "Slide type mismatch"
        assert data["button_text"] == "Learn More", "Button text mismatch"
        assert data["window_open"] == "new", "Window open mismatch"
        assert data["title_effect"] == "top", "Title effect mismatch"
        assert data["title_x"] == 100, "Title X coordinate mismatch"
        assert data["transition"] == "fade", "Transition mismatch"
        assert data["delay"] == 9400, "Delay mismatch"
        
        TestHeroSlidesAdminCRUD.created_slide_id = data["id"]
        print(f"Created slide with id: {data['id']}")
    
    def test_03_get_single_hero_slide(self, admin_headers):
        """GET /api/admin/hero-slides/{id} - Get single slide"""
        slide_id = TestHeroSlidesAdminCRUD.created_slide_id
        assert slide_id, "No slide ID from previous test"
        
        response = requests.get(f"{BASE_URL}/api/admin/hero-slides/{slide_id}", headers=admin_headers)
        assert response.status_code == 200, f"Failed to get slide: {response.text}"
        
        data = response.json()
        assert data["id"] == slide_id, "ID mismatch"
        assert "<strong>TEST</strong>" in data["title"], "Title should contain HTML"
        print(f"Retrieved slide: {data['title']}")
    
    def test_04_update_hero_slide(self, admin_headers):
        """PUT /api/admin/hero-slides/{id} - Update slide"""
        slide_id = TestHeroSlidesAdminCRUD.created_slide_id
        assert slide_id, "No slide ID from previous test"
        
        update_data = {
            "title": "<strong>UPDATED</strong> Hero Slide",
            "subtitle": "Updated Subtitle",
            "slide_type": "video",
            "video_embed": '<iframe src="https://youtube.com/embed/test"></iframe>',
            "button_text": "Watch Now",
            "title_effect": "left",
            "delay": 5000
        }
        
        response = requests.put(f"{BASE_URL}/api/admin/hero-slides/{slide_id}", json=update_data, headers=admin_headers)
        assert response.status_code == 200, f"Failed to update slide: {response.text}"
        
        data = response.json()
        assert data["title"] == update_data["title"], "Title not updated"
        assert data["slide_type"] == "video", "Slide type not updated"
        assert data["video_embed"] == update_data["video_embed"], "Video embed not updated"
        assert data["title_effect"] == "left", "Title effect not updated"
        assert data["delay"] == 5000, "Delay not updated"
        print(f"Updated slide: {data['title']}")
    
    def test_05_verify_update_persisted(self, admin_headers):
        """GET after PUT - Verify update was persisted"""
        slide_id = TestHeroSlidesAdminCRUD.created_slide_id
        assert slide_id, "No slide ID from previous test"
        
        response = requests.get(f"{BASE_URL}/api/admin/hero-slides/{slide_id}", headers=admin_headers)
        assert response.status_code == 200, f"Failed to get slide: {response.text}"
        
        data = response.json()
        assert "<strong>UPDATED</strong>" in data["title"], "Update not persisted"
        assert data["slide_type"] == "video", "Slide type update not persisted"
        print("Update verified as persisted")
    
    def test_06_get_nonexistent_slide(self, admin_headers):
        """GET /api/admin/hero-slides/{id} - 404 for nonexistent slide"""
        fake_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/admin/hero-slides/{fake_id}", headers=admin_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Correctly returned 404 for nonexistent slide")


class TestHeroSlidesPublicAPI:
    """Test public API for hero slides"""
    
    def test_01_public_hero_slides_list(self):
        """GET /api/public/hero-slides - Public endpoint returns slides"""
        response = requests.get(f"{BASE_URL}/api/public/hero-slides")
        assert response.status_code == 200, f"Failed to get public slides: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Public API returned {len(data)} slides")
        
        # Verify slides have expected fields
        if len(data) > 0:
            slide = data[0]
            # Check for key fields that frontend needs
            assert "id" in slide, "Slide should have id"
            print(f"First slide title: {slide.get('title', 'N/A')}")


class TestHeroSlidesDelete:
    """Test delete operations - run last"""
    
    def test_01_delete_hero_slide(self, admin_headers):
        """DELETE /api/admin/hero-slides/{id} - Delete slide"""
        slide_id = TestHeroSlidesAdminCRUD.created_slide_id
        assert slide_id, "No slide ID from previous test"
        
        response = requests.delete(f"{BASE_URL}/api/admin/hero-slides/{slide_id}", headers=admin_headers)
        assert response.status_code == 200, f"Failed to delete slide: {response.text}"
        
        data = response.json()
        assert "message" in data, "Delete response should have message"
        print(f"Deleted slide: {slide_id}")
    
    def test_02_verify_delete(self, admin_headers):
        """GET after DELETE - Verify slide was deleted"""
        slide_id = TestHeroSlidesAdminCRUD.created_slide_id
        assert slide_id, "No slide ID from previous test"
        
        response = requests.get(f"{BASE_URL}/api/admin/hero-slides/{slide_id}", headers=admin_headers)
        assert response.status_code == 404, f"Expected 404 after delete, got {response.status_code}"
        print("Verified slide was deleted")
    
    def test_03_delete_nonexistent_slide(self, admin_headers):
        """DELETE /api/admin/hero-slides/{id} - 404 for nonexistent slide"""
        fake_id = str(uuid.uuid4())
        response = requests.delete(f"{BASE_URL}/api/admin/hero-slides/{fake_id}", headers=admin_headers)
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("Correctly returned 404 for deleting nonexistent slide")


class TestHeroSlidesAuth:
    """Test authentication requirements"""
    
    def test_01_list_requires_auth(self):
        """GET /api/admin/hero-slides - Requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/hero-slides")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("List endpoint correctly requires auth")
    
    def test_02_create_requires_auth(self):
        """POST /api/admin/hero-slides - Requires authentication"""
        response = requests.post(f"{BASE_URL}/api/admin/hero-slides", json={"title": "Test"})
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("Create endpoint correctly requires auth")
    
    def test_03_public_endpoint_no_auth(self):
        """GET /api/public/hero-slides - No auth required"""
        response = requests.get(f"{BASE_URL}/api/public/hero-slides")
        assert response.status_code == 200, f"Public endpoint should not require auth, got {response.status_code}"
        print("Public endpoint correctly accessible without auth")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
