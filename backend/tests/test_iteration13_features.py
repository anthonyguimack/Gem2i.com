"""
Iteration 13 Tests: Hero Section Responsive Layout & Admin CRUD
Tests:
1. GET /api/public/hero-slides returns active slides with coordinate fields
2. Admin hero CRUD endpoints: GET/POST/PUT/DELETE /api/admin/hero-slides
3. Admin login works with admin@consultant.com / Admin123!
4. Public homepage API endpoints work
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPublicHeroSlides:
    """Test public hero slides endpoint"""
    
    def test_get_public_hero_slides_returns_200(self):
        """GET /api/public/hero-slides returns 200"""
        response = requests.get(f"{BASE_URL}/api/public/hero-slides")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("✓ GET /api/public/hero-slides returns 200")
    
    def test_hero_slides_have_coordinate_fields(self):
        """Hero slides contain X/Y coordinate fields"""
        response = requests.get(f"{BASE_URL}/api/public/hero-slides")
        assert response.status_code == 200
        slides = response.json()
        
        if len(slides) > 0:
            slide = slides[0]
            coordinate_fields = ['title_x', 'title_y', 'subtitle_x', 'subtitle_y', 
                               'description_x', 'description_y', 'button_x', 'button_y',
                               'media_x', 'media_y']
            for field in coordinate_fields:
                assert field in slide, f"Missing coordinate field: {field}"
            print(f"✓ Hero slide has all coordinate fields: {coordinate_fields}")
        else:
            print("⚠ No slides found to verify coordinate fields")
    
    def test_hero_slides_have_required_content_fields(self):
        """Hero slides contain required content fields"""
        response = requests.get(f"{BASE_URL}/api/public/hero-slides")
        assert response.status_code == 200
        slides = response.json()
        
        if len(slides) > 0:
            slide = slides[0]
            required_fields = ['id', 'title', 'slide_type']
            for field in required_fields:
                assert field in slide, f"Missing required field: {field}"
            print(f"✓ Hero slide has required fields: {required_fields}")
    
    def test_hero_slides_coordinates_are_numeric(self):
        """Coordinate values are numeric"""
        response = requests.get(f"{BASE_URL}/api/public/hero-slides")
        assert response.status_code == 200
        slides = response.json()
        
        if len(slides) > 0:
            slide = slides[0]
            coord_fields = ['title_x', 'title_y', 'subtitle_x', 'subtitle_y']
            for field in coord_fields:
                if field in slide:
                    assert isinstance(slide[field], (int, float)), f"{field} should be numeric"
            print("✓ Coordinate values are numeric")


class TestAdminAuth:
    """Test admin authentication"""
    
    def test_admin_login_success(self):
        """Admin login with correct credentials returns token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        print(f"✓ Admin login successful, user: {data['user'].get('email')}")
        return data["token"]
    
    def test_admin_login_wrong_password(self):
        """Admin login with wrong password returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "WrongPassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Wrong password correctly rejected with 401")


class TestAdminHeroSlidesCRUD:
    """Test admin hero slides CRUD operations"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    def test_admin_list_hero_slides(self, auth_token):
        """GET /api/admin/hero-slides returns list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/hero-slides",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        slides = response.json()
        assert isinstance(slides, list), "Response should be a list"
        print(f"✓ Admin GET hero-slides returns {len(slides)} slides")
    
    def test_admin_create_hero_slide(self, auth_token):
        """POST /api/admin/hero-slides creates new slide"""
        test_slide = {
            "title": f"<p>TEST_Slide_{uuid.uuid4().hex[:8]}</p>",
            "subtitle": "<p>Test Subtitle</p>",
            "description": "<p>Test Description</p>",
            "slide_type": "photo",
            "button_text": "Test Button",
            "button_url": "/test",
            "title_x": 100,
            "title_y": 50,
            "subtitle_x": 100,
            "subtitle_y": 100,
            "description_x": 100,
            "description_y": 150,
            "button_x": 100,
            "button_y": 200,
            "media_x": 400,
            "media_y": 50,
            "date_start": "2026-01-01T00:00",
            "date_end": "2026-12-31T23:59"
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/hero-slides",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=test_slide
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        created = response.json()
        assert "id" in created, "Created slide should have id"
        assert created["title"] == test_slide["title"], "Title should match"
        print(f"✓ Admin POST hero-slides created slide with id: {created['id']}")
        return created["id"]
    
    def test_admin_update_hero_slide(self, auth_token):
        """PUT /api/admin/hero-slides/{id} updates slide"""
        # First create a slide
        test_slide = {
            "title": f"<p>TEST_Update_{uuid.uuid4().hex[:8]}</p>",
            "slide_type": "photo",
            "title_x": 100,
            "title_y": 50
        }
        create_response = requests.post(
            f"{BASE_URL}/api/admin/hero-slides",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=test_slide
        )
        assert create_response.status_code == 200
        slide_id = create_response.json()["id"]
        
        # Update the slide
        update_data = {
            "title": "<p>Updated Title</p>",
            "title_x": 200,
            "title_y": 100
        }
        update_response = requests.put(
            f"{BASE_URL}/api/admin/hero-slides/{slide_id}",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=update_data
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        updated = update_response.json()
        assert updated["title"] == "<p>Updated Title</p>", "Title should be updated"
        assert updated["title_x"] == 200, "title_x should be updated"
        print(f"✓ Admin PUT hero-slides/{slide_id} updated successfully")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/hero-slides/{slide_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
    
    def test_admin_delete_hero_slide(self, auth_token):
        """DELETE /api/admin/hero-slides/{id} deletes slide"""
        # First create a slide
        test_slide = {
            "title": f"<p>TEST_Delete_{uuid.uuid4().hex[:8]}</p>",
            "slide_type": "photo"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/admin/hero-slides",
            headers={"Authorization": f"Bearer {auth_token}"},
            json=test_slide
        )
        assert create_response.status_code == 200
        slide_id = create_response.json()["id"]
        
        # Delete the slide
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/hero-slides/{slide_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        # Verify deletion
        get_response = requests.get(
            f"{BASE_URL}/api/admin/hero-slides/{slide_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert get_response.status_code == 404, "Deleted slide should return 404"
        print(f"✓ Admin DELETE hero-slides/{slide_id} deleted successfully")


class TestPublicHomepageAPIs:
    """Test public homepage API endpoints"""
    
    def test_get_public_hero(self):
        """GET /api/public/hero returns 200"""
        response = requests.get(f"{BASE_URL}/api/public/hero")
        assert response.status_code == 200
        print("✓ GET /api/public/hero returns 200")
    
    def test_get_public_about(self):
        """GET /api/public/about returns 200"""
        response = requests.get(f"{BASE_URL}/api/public/about")
        assert response.status_code == 200
        print("✓ GET /api/public/about returns 200")
    
    def test_get_public_services(self):
        """GET /api/public/services returns 200"""
        response = requests.get(f"{BASE_URL}/api/public/services")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print("✓ GET /api/public/services returns 200")
    
    def test_get_public_sections(self):
        """GET /api/public/sections returns 200"""
        response = requests.get(f"{BASE_URL}/api/public/sections")
        assert response.status_code == 200
        print("✓ GET /api/public/sections returns 200")
    
    def test_get_public_testimonials(self):
        """GET /api/public/testimonials returns 200"""
        response = requests.get(f"{BASE_URL}/api/public/testimonials")
        assert response.status_code == 200
        print("✓ GET /api/public/testimonials returns 200")


class TestLegacyAdminHero:
    """Test legacy admin hero endpoint (backward compatibility)"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    def test_admin_get_legacy_hero(self, auth_token):
        """GET /api/admin/hero returns 200"""
        response = requests.get(
            f"{BASE_URL}/api/admin/hero",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        print("✓ GET /api/admin/hero (legacy) returns 200")
    
    def test_admin_put_legacy_hero(self, auth_token):
        """PUT /api/admin/hero updates hero"""
        response = requests.put(
            f"{BASE_URL}/api/admin/hero",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"title": "Test Hero Title"}
        )
        assert response.status_code == 200
        print("✓ PUT /api/admin/hero (legacy) returns 200")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
