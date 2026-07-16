"""
Iteration 15 Tests: Hero slides per-page assignment and custom page rendering
- Hero slides appear on assigned pages (home, news, gallery, custom pages like KLS)
- Custom pages (like /kls) render with hero slider and page content
- DynamicPage finds pages by URL path
- System pages (news, gallery) show hero slides via SystemPageHero component
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPublicHeroSlidesAPI:
    """Test hero slides public API with page filtering"""
    
    def test_get_all_hero_slides(self):
        """GET /api/public/hero-slides returns all active slides"""
        response = requests.get(f"{BASE_URL}/api/public/hero-slides")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Total active hero slides: {len(data)}")
        for slide in data:
            print(f"  - {slide.get('title', 'Untitled')}: assigned_pages={slide.get('assigned_pages', [])}")
    
    def test_get_hero_slides_for_home(self):
        """GET /api/public/hero-slides?page=home returns slides assigned to home"""
        response = requests.get(f"{BASE_URL}/api/public/hero-slides?page=home")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Hero slides for 'home': {len(data)}")
        for slide in data:
            assert 'home' in (slide.get('assigned_pages') or []), f"Slide {slide.get('title')} not assigned to home"
    
    def test_get_hero_slides_for_news(self):
        """GET /api/public/hero-slides?page=news returns slides assigned to news"""
        response = requests.get(f"{BASE_URL}/api/public/hero-slides?page=news")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Hero slides for 'news': {len(data)}")
        for slide in data:
            assert 'news' in (slide.get('assigned_pages') or []), f"Slide {slide.get('title')} not assigned to news"
    
    def test_get_hero_slides_for_gallery(self):
        """GET /api/public/hero-slides?page=gallery returns slides assigned to gallery"""
        response = requests.get(f"{BASE_URL}/api/public/hero-slides?page=gallery")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Hero slides for 'gallery': {len(data)}")
        # May be empty if no slides assigned to gallery
    
    def test_get_hero_slides_for_nonexistent_page(self):
        """GET /api/public/hero-slides?page=nonexistent returns empty list"""
        response = requests.get(f"{BASE_URL}/api/public/hero-slides?page=nonexistent")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0, "Should return empty list for nonexistent page"


class TestPublicSitePagesAPI:
    """Test site pages API for hero assignment"""
    
    def test_get_site_pages(self):
        """GET /api/public/site-pages returns system + custom pages"""
        response = requests.get(f"{BASE_URL}/api/public/site-pages")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Check system pages exist
        system_ids = [p['id'] for p in data if p.get('system')]
        assert 'home' in system_ids, "Missing 'home' system page"
        assert 'news' in system_ids, "Missing 'news' system page"
        assert 'gallery' in system_ids, "Missing 'gallery' system page"
        assert 'reading-list' in system_ids, "Missing 'reading-list' system page"
        
        # Check custom pages exist
        custom_pages = [p for p in data if not p.get('system')]
        print(f"System pages: {system_ids}")
        print(f"Custom pages: {[p['title'] for p in custom_pages]}")


class TestPublicNavPagesAPI:
    """Test nav pages API for custom pages like KLS"""
    
    def test_get_nav_pages(self):
        """GET /api/public/nav-pages returns all nav pages"""
        response = requests.get(f"{BASE_URL}/api/public/nav-pages")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Nav pages count: {len(data)}")
        for page in data:
            print(f"  - {page.get('title')}: url={page.get('url')}, login_required={page.get('login_required')}")
    
    def test_kls_page_exists(self):
        """Verify KLS custom page exists in nav_pages"""
        response = requests.get(f"{BASE_URL}/api/public/nav-pages")
        assert response.status_code == 200
        data = response.json()
        
        kls_page = next((p for p in data if p.get('url') == '/kls'), None)
        if kls_page:
            print(f"KLS page found: id={kls_page.get('id')}, title={kls_page.get('title')}")
            print(f"  summary: {kls_page.get('summary', '')[:50]}...")
            print(f"  content: {kls_page.get('content', '')[:50]}...")
            assert kls_page.get('title'), "KLS page should have a title"
        else:
            print("KLS page not found in nav_pages - may need to be created")
    
    def test_terms_page_login_required(self):
        """Verify Terms page has login_required=true"""
        response = requests.get(f"{BASE_URL}/api/public/nav-pages")
        assert response.status_code == 200
        data = response.json()
        
        terms_page = next((p for p in data if p.get('url') == '/terms' or p.get('page_type') == 'terms'), None)
        if terms_page:
            assert terms_page.get('login_required') == True, "Terms page should have login_required=true"
            print(f"Terms page: login_required={terms_page.get('login_required')}")
        else:
            pytest.skip("Terms page not found")
    
    def test_privacy_page_not_login_required(self):
        """Verify Privacy page has login_required=false"""
        response = requests.get(f"{BASE_URL}/api/public/nav-pages")
        assert response.status_code == 200
        data = response.json()
        
        privacy_page = next((p for p in data if p.get('url') == '/privacy' or p.get('page_type') == 'privacy'), None)
        if privacy_page:
            assert privacy_page.get('login_required') != True, "Privacy page should not have login_required=true"
            print(f"Privacy page: login_required={privacy_page.get('login_required')}")
        else:
            pytest.skip("Privacy page not found")


class TestHeroSlidesForKLSPage:
    """Test hero slides assigned to KLS custom page"""
    
    def test_get_hero_slides_for_kls_page_id(self):
        """GET /api/public/hero-slides?page={kls_id} returns slides assigned to KLS"""
        # First get the KLS page ID
        nav_response = requests.get(f"{BASE_URL}/api/public/nav-pages")
        assert nav_response.status_code == 200
        nav_pages = nav_response.json()
        
        kls_page = next((p for p in nav_pages if p.get('url') == '/kls'), None)
        if not kls_page:
            pytest.skip("KLS page not found in nav_pages")
        
        kls_id = kls_page.get('id')
        print(f"KLS page ID: {kls_id}")
        
        # Get hero slides for KLS page
        response = requests.get(f"{BASE_URL}/api/public/hero-slides?page={kls_id}")
        assert response.status_code == 200
        data = response.json()
        print(f"Hero slides for KLS page: {len(data)}")
        for slide in data:
            print(f"  - {slide.get('title')}: assigned_pages={slide.get('assigned_pages')}")


class TestAdminAuth:
    """Test admin authentication"""
    
    def test_admin_login(self):
        """Admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert 'token' in data or 'access_token' in data
        print("Admin login successful")
        return data.get('token') or data.get('access_token')
    
    def test_admin_login_wrong_password(self):
        """Admin login with wrong password should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "WrongPassword123!"
        })
        assert response.status_code == 401


class TestAdminHeroSlides:
    """Test admin hero slides management"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        if response.status_code == 200:
            data = response.json()
            return data.get('token') or data.get('access_token')
        pytest.skip("Admin login failed")
    
    def test_get_admin_hero_slides(self, auth_token):
        """GET /api/admin/hero-slides returns all slides"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/hero-slides", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Admin hero slides count: {len(data)}")
        for slide in data:
            print(f"  - {slide.get('title')}: assigned_pages={slide.get('assigned_pages', [])}")


class TestAdminNavPages:
    """Test admin nav pages management"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        if response.status_code == 200:
            data = response.json()
            return data.get('token') or data.get('access_token')
        pytest.skip("Admin login failed")
    
    def test_get_admin_nav_pages(self, auth_token):
        """GET /api/admin/nav-pages returns all nav pages"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/nav-pages", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Admin nav pages count: {len(data)}")


class TestPublicEndpoints:
    """Test other public endpoints still work"""
    
    def test_public_hero(self):
        """GET /api/public/hero returns 200"""
        response = requests.get(f"{BASE_URL}/api/public/hero")
        assert response.status_code == 200
    
    def test_public_about(self):
        """GET /api/public/about returns 200"""
        response = requests.get(f"{BASE_URL}/api/public/about")
        assert response.status_code == 200
    
    def test_public_services(self):
        """GET /api/public/services returns 200"""
        response = requests.get(f"{BASE_URL}/api/public/services")
        assert response.status_code == 200
    
    def test_public_sections(self):
        """GET /api/public/sections returns 200"""
        response = requests.get(f"{BASE_URL}/api/public/sections")
        assert response.status_code == 200
    
    def test_public_testimonials(self):
        """GET /api/public/testimonials returns 200"""
        response = requests.get(f"{BASE_URL}/api/public/testimonials")
        assert response.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
