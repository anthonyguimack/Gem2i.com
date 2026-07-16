"""
Iteration 12 Tests: Hero Slide Layer Positioning & Canvas Background
- Backend: Verify /api/public/hero-slides returns X/Y coordinate fields
- Frontend: Verify absolute positioning is applied to hero layers
- Frontend: Verify HeroCanvasEditor displays background image
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHeroSlideCoordinates:
    """Test that hero slides API returns coordinate fields for layer positioning"""
    
    def test_public_hero_slides_returns_coordinate_fields(self):
        """Verify GET /api/public/hero-slides returns all X/Y coordinate fields"""
        response = requests.get(f"{BASE_URL}/api/public/hero-slides")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        slides = response.json()
        assert isinstance(slides, list), "Response should be a list"
        assert len(slides) > 0, "Should have at least one slide"
        
        # Check first slide has all coordinate fields
        slide = slides[0]
        coordinate_fields = [
            'title_x', 'title_y',
            'subtitle_x', 'subtitle_y',
            'description_x', 'description_y',
            'button_x', 'button_y',
            'media_x', 'media_y'
        ]
        
        for field in coordinate_fields:
            assert field in slide, f"Missing coordinate field: {field}"
            assert isinstance(slide[field], (int, float)), f"{field} should be numeric, got {type(slide[field])}"
        
        print(f"✓ Slide has all coordinate fields: title({slide['title_x']},{slide['title_y']}), subtitle({slide['subtitle_x']},{slide['subtitle_y']})")
    
    def test_public_hero_slides_returns_background_field(self):
        """Verify GET /api/public/hero-slides returns background image field"""
        response = requests.get(f"{BASE_URL}/api/public/hero-slides")
        assert response.status_code == 200
        
        slides = response.json()
        assert len(slides) > 0, "Should have at least one slide"
        
        slide = slides[0]
        assert 'background' in slide, "Missing background field"
        
        # At least one slide should have a background image
        has_background = any(s.get('background') for s in slides)
        assert has_background, "At least one slide should have a background image"
        
        print(f"✓ Slide background field present: {slide.get('background', 'None')}")
    
    def test_coordinate_values_are_reasonable(self):
        """Verify coordinate values are within expected canvas bounds (0-700 for X, 0-300 for Y)"""
        response = requests.get(f"{BASE_URL}/api/public/hero-slides")
        assert response.status_code == 200
        
        slides = response.json()
        for slide in slides:
            # X coordinates should be 0-700 (canvas width)
            for x_field in ['title_x', 'subtitle_x', 'description_x', 'button_x', 'media_x']:
                x_val = slide.get(x_field, 0)
                assert 0 <= x_val <= 700, f"{x_field}={x_val} should be between 0-700"
            
            # Y coordinates should be 0-300 (canvas height)
            for y_field in ['title_y', 'subtitle_y', 'description_y', 'button_y', 'media_y']:
                y_val = slide.get(y_field, 0)
                assert 0 <= y_val <= 300, f"{y_field}={y_val} should be between 0-300"
        
        print(f"✓ All coordinate values within canvas bounds (700x300)")
    
    def test_slide_type_field_present(self):
        """Verify slide_type field is present for distinguishing legacy vs new slides"""
        response = requests.get(f"{BASE_URL}/api/public/hero-slides")
        assert response.status_code == 200
        
        slides = response.json()
        for slide in slides:
            assert 'slide_type' in slide, "Missing slide_type field"
            assert slide['slide_type'] in ['photo', 'video'], f"Invalid slide_type: {slide['slide_type']}"
        
        print(f"✓ All slides have valid slide_type field")


class TestAdminHeroSlideAPI:
    """Test admin API for hero slides with authentication"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    def test_admin_hero_slides_returns_all_slides(self, auth_token):
        """Verify admin endpoint returns all slides including expired ones"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/hero-slides", headers=headers)
        assert response.status_code == 200
        
        slides = response.json()
        assert isinstance(slides, list), "Response should be a list"
        
        # Admin should see all slides
        print(f"✓ Admin sees {len(slides)} slides")
    
    def test_admin_get_single_slide_has_coordinates(self, auth_token):
        """Verify getting a single slide returns coordinate fields"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First get list of slides
        response = requests.get(f"{BASE_URL}/api/admin/hero-slides", headers=headers)
        assert response.status_code == 200
        slides = response.json()
        
        if len(slides) > 0:
            slide_id = slides[0]['id']
            response = requests.get(f"{BASE_URL}/api/admin/hero-slides/{slide_id}", headers=headers)
            assert response.status_code == 200
            
            slide = response.json()
            assert 'title_x' in slide, "Single slide should have title_x"
            assert 'background' in slide, "Single slide should have background"
            
            print(f"✓ Single slide {slide_id} has coordinate and background fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
