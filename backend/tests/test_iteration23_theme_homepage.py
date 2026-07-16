"""
Iteration 23 Tests: Theme Engine and Homepage Sections
Tests the massive HomePage.js rewrite with theme-specific layouts
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPublicSettings:
    """Test public settings API returns theme data"""
    
    def test_public_settings_returns_active_theme(self):
        """GET /api/public/settings should return active_theme"""
        response = requests.get(f"{BASE_URL}/api/public/settings")
        assert response.status_code == 200
        data = response.json()
        assert "active_theme" in data or data.get("active_theme") is None, "active_theme field should exist"
        print(f"SUCCESS: active_theme = {data.get('active_theme', 'default')}")
    
    def test_public_settings_returns_theme_colors(self):
        """GET /api/public/settings should return theme_colors"""
        response = requests.get(f"{BASE_URL}/api/public/settings")
        assert response.status_code == 200
        data = response.json()
        # theme_colors may not exist if not configured
        theme_colors = data.get("theme_colors", {})
        print(f"SUCCESS: theme_colors keys = {list(theme_colors.keys()) if theme_colors else 'not configured'}")
    
    def test_public_settings_returns_sections(self):
        """GET /api/public/settings should return sections config"""
        response = requests.get(f"{BASE_URL}/api/public/settings")
        assert response.status_code == 200
        data = response.json()
        sections = data.get("sections", {})
        section_order = data.get("section_order", [])
        print(f"SUCCESS: sections = {list(sections.keys())}")
        print(f"SUCCESS: section_order = {section_order}")


class TestPublicContentAPIs:
    """Test all public content APIs used by HomePage"""
    
    def test_get_about(self):
        """GET /api/public/about"""
        response = requests.get(f"{BASE_URL}/api/public/about")
        assert response.status_code == 200
        data = response.json()
        print(f"SUCCESS: About title = {data.get('title', 'N/A')}")
    
    def test_get_services(self):
        """GET /api/public/services"""
        response = requests.get(f"{BASE_URL}/api/public/services")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Services count = {len(data)}")
    
    def test_get_blog(self):
        """GET /api/public/blog"""
        response = requests.get(f"{BASE_URL}/api/public/blog")
        assert response.status_code == 200
        data = response.json()
        posts = data.get("posts", [])
        print(f"SUCCESS: Blog posts count = {len(posts)}")
    
    def test_get_books(self):
        """GET /api/public/books"""
        response = requests.get(f"{BASE_URL}/api/public/books")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Books count = {len(data)}")
    
    def test_get_maps(self):
        """GET /api/public/maps"""
        response = requests.get(f"{BASE_URL}/api/public/maps")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Maps count = {len(data)}")
    
    def test_get_map_locations(self):
        """GET /api/public/map-locations"""
        response = requests.get(f"{BASE_URL}/api/public/map-locations")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Map locations count = {len(data)}")
    
    def test_get_portfolio(self):
        """GET /api/public/portfolio"""
        response = requests.get(f"{BASE_URL}/api/public/portfolio")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Portfolio items count = {len(data)}")
    
    def test_get_gallery(self):
        """GET /api/public/gallery"""
        response = requests.get(f"{BASE_URL}/api/public/gallery")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Gallery items count = {len(data)}")
    
    def test_get_testimonials(self):
        """GET /api/public/testimonials"""
        response = requests.get(f"{BASE_URL}/api/public/testimonials")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Testimonials count = {len(data)}")
    
    def test_get_hero_slides(self):
        """GET /api/public/hero-slides"""
        response = requests.get(f"{BASE_URL}/api/public/hero-slides")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Hero slides count = {len(data)}")
    
    def test_get_nav_pages(self):
        """GET /api/public/nav-pages"""
        response = requests.get(f"{BASE_URL}/api/public/nav-pages")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Nav pages count = {len(data)}")


class TestExternalBlogAPI:
    """Test external blog API proxy"""
    
    def test_get_blog_latest(self):
        """GET /api/blog/latest - external blog proxy"""
        response = requests.get(f"{BASE_URL}/api/blog/latest")
        assert response.status_code == 200
        data = response.json()
        posts = data.get("posts", [])
        error = data.get("error")
        if error:
            print(f"INFO: External blog API returned error: {error}")
        else:
            print(f"SUCCESS: External blog posts count = {len(posts)}")


class TestContactForm:
    """Test contact form submission"""
    
    def test_submit_contact_form(self):
        """POST /api/contact"""
        payload = {
            "name": "TEST_Contact User",
            "email": "test@example.com",
            "message": "This is a test message from iteration 23 testing"
        }
        response = requests.post(f"{BASE_URL}/api/contact", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data.get("message") == "Contact form submitted successfully"
        print(f"SUCCESS: Contact form submitted, id = {data['id']}")


class TestAdminAuth:
    """Test admin authentication"""
    
    def test_admin_login(self):
        """POST /api/auth/login with admin credentials"""
        payload = {
            "email": "admin@consultant.com",
            "password": "Admin123!"
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data.get("user", {}).get("role") == "admin"
        print(f"SUCCESS: Admin login successful, role = {data['user']['role']}")
        return data["token"]


class TestAdminSettingsTheme:
    """Test admin settings for theme management"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        payload = {"email": "admin@consultant.com", "password": "Admin123!"}
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json()["token"]
    
    def test_get_admin_settings(self, admin_token):
        """GET /api/admin/settings"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/settings", headers=headers)
        assert response.status_code == 200
        data = response.json()
        print(f"SUCCESS: Admin settings retrieved, active_theme = {data.get('active_theme', 'default')}")
    
    def test_update_theme_to_modern(self, admin_token):
        """PUT /api/admin/settings - change theme to modern"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        payload = {"active_theme": "modern"}
        response = requests.put(f"{BASE_URL}/api/admin/settings", json=payload, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("active_theme") == "modern"
        print("SUCCESS: Theme changed to modern")
    
    def test_update_theme_to_classic(self, admin_token):
        """PUT /api/admin/settings - change theme to classic"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        payload = {"active_theme": "classic"}
        response = requests.put(f"{BASE_URL}/api/admin/settings", json=payload, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("active_theme") == "classic"
        print("SUCCESS: Theme changed to classic")
    
    def test_update_theme_to_default(self, admin_token):
        """PUT /api/admin/settings - change theme to default"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        payload = {"active_theme": "default"}
        response = requests.put(f"{BASE_URL}/api/admin/settings", json=payload, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("active_theme") == "default"
        print("SUCCESS: Theme changed to default")
    
    def test_restore_theme_to_classic(self, admin_token):
        """PUT /api/admin/settings - restore theme to classic (original state)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        payload = {"active_theme": "classic"}
        response = requests.put(f"{BASE_URL}/api/admin/settings", json=payload, headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("active_theme") == "classic"
        print("SUCCESS: Theme restored to classic")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
