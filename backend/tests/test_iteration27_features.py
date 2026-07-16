"""
Iteration 27 Tests: Footer 4-column structure, DynamicPage duplicate resolution, Layout rendering
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestFooterStructure:
    """Tests for 4-column footer structure requirements"""
    
    def test_nav_pages_returns_footer_pages(self):
        """GET /api/public/nav-pages returns pages with show_in_footer flag"""
        response = requests.get(f"{BASE_URL}/api/public/nav-pages")
        assert response.status_code == 200
        pages = response.json()
        assert isinstance(pages, list)
        
        # Check that footer pages exist
        footer_pages = [p for p in pages if p.get('show_in_footer')]
        assert len(footer_pages) > 0, "Should have pages marked for footer"
        print(f"Found {len(footer_pages)} footer pages")
    
    def test_nav_pages_include_layout_field(self):
        """GET /api/public/nav-pages returns layout field for pages"""
        response = requests.get(f"{BASE_URL}/api/public/nav-pages")
        assert response.status_code == 200
        pages = response.json()
        
        # Find page with layout set
        pages_with_layout = [p for p in pages if p.get('layout')]
        print(f"Pages with layout: {len(pages_with_layout)}")
        
        # Verify Events page has layout_1
        events_page = next((p for p in pages if 'events' in p.get('url', '').lower()), None)
        if events_page:
            assert events_page.get('layout') == 'layout_1', f"Events page should have layout_1, got {events_page.get('layout')}"
            print(f"Events page layout: {events_page.get('layout')}")
    
    def test_settings_returns_social_links(self):
        """GET /api/public/settings returns social_links for footer Connect column"""
        response = requests.get(f"{BASE_URL}/api/public/settings")
        assert response.status_code == 200
        settings = response.json()
        
        social_links = settings.get('social_links', [])
        assert isinstance(social_links, list)
        print(f"Social links count: {len(social_links)}")
        
        # Verify social link structure
        if social_links:
            link = social_links[0]
            assert 'url' in link, "Social link should have url"
            assert 'icon' in link, "Social link should have icon"
    
    def test_settings_returns_footer_copyright(self):
        """GET /api/public/settings returns footer_copyright for footer"""
        response = requests.get(f"{BASE_URL}/api/public/settings")
        assert response.status_code == 200
        settings = response.json()
        
        footer_copyright = settings.get('footer_copyright', '')
        print(f"Footer copyright: {footer_copyright}")
        # Should have some copyright text
        assert footer_copyright or settings.get('brand_name'), "Should have footer copyright or brand name"
    
    def test_settings_returns_footer_description(self):
        """GET /api/public/settings returns footer_description"""
        response = requests.get(f"{BASE_URL}/api/public/settings")
        assert response.status_code == 200
        settings = response.json()
        
        footer_description = settings.get('footer_description', '')
        print(f"Footer description: {footer_description[:50]}..." if footer_description else "No footer description")


class TestHeroSlidesFiltering:
    """Tests for hero slides page filtering"""
    
    def test_hero_slides_returns_all_active(self):
        """GET /api/public/hero-slides returns active slides"""
        response = requests.get(f"{BASE_URL}/api/public/hero-slides")
        assert response.status_code == 200
        slides = response.json()
        assert isinstance(slides, list)
        print(f"Total active hero slides: {len(slides)}")
    
    def test_hero_slides_filter_by_page(self):
        """GET /api/public/hero-slides?page={pageId} filters by assigned page"""
        # First get the events page ID
        nav_response = requests.get(f"{BASE_URL}/api/public/nav-pages")
        pages = nav_response.json()
        events_page = next((p for p in pages if 'events' in p.get('url', '').lower()), None)
        
        if events_page:
            page_id = events_page['id']
            response = requests.get(f"{BASE_URL}/api/public/hero-slides?page={page_id}")
            assert response.status_code == 200
            slides = response.json()
            print(f"Hero slides for events page: {len(slides)}")
            
            # Verify all returned slides have this page in assigned_pages
            for slide in slides:
                assigned = slide.get('assigned_pages', [])
                assert page_id in assigned, f"Slide should be assigned to page {page_id}"
    
    def test_hero_slides_filter_by_home(self):
        """GET /api/public/hero-slides?page=home filters for homepage"""
        response = requests.get(f"{BASE_URL}/api/public/hero-slides?page=home")
        assert response.status_code == 200
        slides = response.json()
        print(f"Hero slides for home: {len(slides)}")
        
        for slide in slides:
            assigned = slide.get('assigned_pages', [])
            assert 'home' in assigned, "Slide should be assigned to home"


class TestDynamicPageLayout:
    """Tests for dynamic page layout rendering"""
    
    def test_events_page_has_layout_1(self):
        """Events page should have layout_1 (About/Bio layout)"""
        response = requests.get(f"{BASE_URL}/api/public/nav-pages")
        assert response.status_code == 200
        pages = response.json()
        
        events_page = next((p for p in pages if 'events' in p.get('url', '').lower()), None)
        assert events_page is not None, "Events page should exist"
        assert events_page.get('layout') == 'layout_1', f"Events page should have layout_1"
        print(f"Events page: {events_page.get('title')} - layout: {events_page.get('layout')}")
    
    def test_events_page_has_layout_image(self):
        """Events page should have layout_image for About/Bio layout"""
        response = requests.get(f"{BASE_URL}/api/public/nav-pages")
        assert response.status_code == 200
        pages = response.json()
        
        events_page = next((p for p in pages if 'events' in p.get('url', '').lower()), None)
        assert events_page is not None, "Events page should exist"
        
        layout_image = events_page.get('layout_image', '')
        assert layout_image, f"Events page should have layout_image, got: {layout_image}"
        print(f"Events page layout_image: {layout_image}")
    
    def test_no_duplicate_events_pages(self):
        """Should not have duplicate pages with same URL"""
        response = requests.get(f"{BASE_URL}/api/public/nav-pages")
        assert response.status_code == 200
        pages = response.json()
        
        # Check for duplicates by URL
        urls = [p.get('url', '') for p in pages if p.get('url')]
        unique_urls = set(urls)
        
        if len(urls) != len(unique_urls):
            duplicates = [url for url in urls if urls.count(url) > 1]
            print(f"Warning: Duplicate URLs found: {set(duplicates)}")
        
        # Specifically check events page
        events_pages = [p for p in pages if 'events' in p.get('url', '').lower()]
        assert len(events_pages) == 1, f"Should have exactly 1 events page, found {len(events_pages)}"


class TestThemeConsistency:
    """Tests for theme settings"""
    
    def test_active_theme_setting(self):
        """GET /api/public/settings returns active_theme"""
        response = requests.get(f"{BASE_URL}/api/public/settings")
        assert response.status_code == 200
        settings = response.json()
        
        active_theme = settings.get('active_theme', 'default')
        assert active_theme in ['default', 'modern', 'classic'], f"Invalid theme: {active_theme}"
        print(f"Active theme: {active_theme}")
    
    def test_colors_settings(self):
        """GET /api/public/settings returns colors for theming"""
        response = requests.get(f"{BASE_URL}/api/public/settings")
        assert response.status_code == 200
        settings = response.json()
        
        colors = settings.get('colors', {})
        print(f"Colors configured: {list(colors.keys())}")
        
        # Check essential color keys
        essential_keys = ['primary', 'accent', 'footer_bg', 'footer_text']
        for key in essential_keys:
            if key in colors:
                print(f"  {key}: {colors[key]}")


class TestHomepageEndpoints:
    """Tests for homepage data endpoints"""
    
    def test_public_hero(self):
        """GET /api/public/hero returns hero data"""
        response = requests.get(f"{BASE_URL}/api/public/hero")
        assert response.status_code == 200
        print("Hero endpoint OK")
    
    def test_public_about(self):
        """GET /api/public/about returns about data"""
        response = requests.get(f"{BASE_URL}/api/public/about")
        assert response.status_code == 200
        print("About endpoint OK")
    
    def test_public_services(self):
        """GET /api/public/services returns services"""
        response = requests.get(f"{BASE_URL}/api/public/services")
        assert response.status_code == 200
        services = response.json()
        assert isinstance(services, list)
        print(f"Services count: {len(services)}")
    
    def test_public_testimonials(self):
        """GET /api/public/testimonials returns testimonials"""
        response = requests.get(f"{BASE_URL}/api/public/testimonials")
        assert response.status_code == 200
        testimonials = response.json()
        assert isinstance(testimonials, list)
        print(f"Testimonials count: {len(testimonials)}")


class TestAdminAuth:
    """Tests for admin authentication"""
    
    def test_admin_login(self):
        """POST /api/auth/login with admin credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert 'token' in data, "Should return token"
        assert 'user' in data, "Should return user"
        assert data['user'].get('role') == 'admin', "Should be admin role"
        print(f"Admin login successful: {data['user'].get('email')}")
        return data['token']
    
    def test_admin_settings_access(self):
        """GET /api/admin/settings requires auth"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        token = login_response.json().get('token')
        
        # Access admin settings
        response = requests.get(
            f"{BASE_URL}/api/admin/settings",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        print("Admin settings access OK")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
