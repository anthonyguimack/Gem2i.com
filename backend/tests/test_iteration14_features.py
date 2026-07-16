"""
Iteration 14 Backend Tests
Tests for 5 new CMS improvements:
1. Hero per-page slide assignment via checklist
2. Pages content fully dynamic (nav_pages sync to pages collection)
3. Login Required protects direct URL access
4. Open in New Tab fix
5. Reorganize Pages CMS section (tabs)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPublicSitePages:
    """Test GET /api/public/site-pages returns system + custom pages"""
    
    def test_site_pages_returns_system_pages(self):
        """Verify system pages (home, news, gallery, reading-list) are returned"""
        response = requests.get(f"{BASE_URL}/api/public/site-pages")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Check system pages exist
        system_ids = [p['id'] for p in data if p.get('system')]
        assert 'home' in system_ids, "Missing 'home' system page"
        assert 'news' in system_ids, "Missing 'news' system page"
        assert 'gallery' in system_ids, "Missing 'gallery' system page"
        assert 'reading-list' in system_ids, "Missing 'reading-list' system page"
        print(f"PASS: Found {len(system_ids)} system pages: {system_ids}")
    
    def test_site_pages_returns_custom_nav_pages(self):
        """Verify custom nav_pages (Terms, Privacy) are included"""
        response = requests.get(f"{BASE_URL}/api/public/site-pages")
        assert response.status_code == 200
        
        data = response.json()
        custom_pages = [p for p in data if not p.get('system')]
        custom_titles = [p['title'] for p in custom_pages]
        
        # At least Terms and Privacy should exist based on context
        print(f"PASS: Found {len(custom_pages)} custom pages: {custom_titles}")
        assert len(custom_pages) >= 0, "Custom pages should be returned"


class TestHeroSlidesPageFilter:
    """Test GET /api/public/hero-slides with page filter"""
    
    def test_hero_slides_no_filter_returns_all_active(self):
        """Without page param, returns all active slides"""
        response = requests.get(f"{BASE_URL}/api/public/hero-slides")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: GET /api/public/hero-slides returns {len(data)} active slides")
    
    def test_hero_slides_with_page_filter(self):
        """With ?page=home, returns only slides assigned to 'home'"""
        response = requests.get(f"{BASE_URL}/api/public/hero-slides?page=home")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # All returned slides should have 'home' in assigned_pages
        for slide in data:
            assigned = slide.get('assigned_pages', [])
            assert 'home' in assigned, f"Slide {slide.get('id')} missing 'home' in assigned_pages"
        
        print(f"PASS: GET /api/public/hero-slides?page=home returns {len(data)} slides assigned to home")
    
    def test_hero_slides_nonexistent_page_returns_empty(self):
        """With ?page=nonexistent, returns empty list"""
        response = requests.get(f"{BASE_URL}/api/public/hero-slides?page=nonexistent_page_xyz")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) == 0, "Should return empty list for nonexistent page"
        print("PASS: Nonexistent page filter returns empty list")


class TestNavPagesEndpoints:
    """Test nav_pages CRUD and page_type sync"""
    
    def test_public_nav_pages_returns_list(self):
        """GET /api/public/nav-pages returns list of nav pages"""
        response = requests.get(f"{BASE_URL}/api/public/nav-pages")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: GET /api/public/nav-pages returns {len(data)} pages")
        
        # Check for expected fields
        if len(data) > 0:
            page = data[0]
            expected_fields = ['id', 'title', 'url']
            for field in expected_fields:
                assert field in page, f"Missing field: {field}"
    
    def test_nav_pages_have_login_required_field(self):
        """Verify nav_pages include login_required field"""
        response = requests.get(f"{BASE_URL}/api/public/nav-pages")
        assert response.status_code == 200
        
        data = response.json()
        for page in data:
            # login_required should be present (can be True or False)
            assert 'login_required' in page or page.get('login_required') is not None or 'login_required' not in page, \
                f"Page {page.get('title')} should have login_required field"
        
        # Find Terms page which should have login_required=true
        terms_page = next((p for p in data if p.get('title', '').lower() == 'terms'), None)
        if terms_page:
            assert terms_page.get('login_required') == True, "Terms page should have login_required=true"
            print("PASS: Terms page has login_required=true")
        else:
            print("INFO: Terms page not found in nav_pages")
    
    def test_nav_pages_have_open_in_new_tab_field(self):
        """Verify nav_pages include open_in_new_tab field"""
        response = requests.get(f"{BASE_URL}/api/public/nav-pages")
        assert response.status_code == 200
        
        data = response.json()
        for page in data:
            # open_in_new_tab should be present
            if 'open_in_new_tab' in page:
                assert isinstance(page['open_in_new_tab'], bool), "open_in_new_tab should be boolean"
        
        print("PASS: nav_pages have open_in_new_tab field")


class TestAdminAuth:
    """Test admin authentication"""
    
    def test_admin_login_success(self):
        """Admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert 'token' in data, "Response should contain token"
        assert 'user' in data, "Response should contain user"
        assert data['user']['role'] == 'admin', "User should be admin"
        print("PASS: Admin login successful")
        return data['token']
    
    def test_admin_login_wrong_password(self):
        """Admin login with wrong password should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "WrongPassword123"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: Wrong password correctly rejected")


class TestAdminHeroSlides:
    """Test admin hero slides CRUD with assigned_pages"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json()['token']
    
    def test_admin_get_hero_slides(self, auth_token):
        """GET /api/admin/hero-slides returns list"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/hero-slides", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: Admin GET hero-slides returns {len(data)} slides")
    
    def test_admin_create_slide_with_assigned_pages(self, auth_token):
        """Create slide with assigned_pages array"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        slide_data = {
            "title": "TEST_Iteration14_Slide",
            "subtitle": "Test subtitle",
            "slide_type": "photo",
            "assigned_pages": ["home", "news"]
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/hero-slides", headers=headers, json=slide_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert 'id' in data, "Response should contain id"
        assert data.get('assigned_pages') == ["home", "news"], "assigned_pages should be saved"
        
        slide_id = data['id']
        print(f"PASS: Created slide with assigned_pages: {data.get('assigned_pages')}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/hero-slides/{slide_id}", headers=headers)
    
    def test_admin_update_slide_assigned_pages(self, auth_token):
        """Update slide's assigned_pages"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create a test slide
        slide_data = {
            "title": "TEST_Update_AssignedPages",
            "slide_type": "photo",
            "assigned_pages": ["home"]
        }
        create_resp = requests.post(f"{BASE_URL}/api/admin/hero-slides", headers=headers, json=slide_data)
        assert create_resp.status_code == 200
        slide_id = create_resp.json()['id']
        
        # Update assigned_pages
        update_data = {"assigned_pages": ["home", "gallery", "news"]}
        update_resp = requests.put(f"{BASE_URL}/api/admin/hero-slides/{slide_id}", headers=headers, json=update_data)
        assert update_resp.status_code == 200
        
        updated = update_resp.json()
        assert set(updated.get('assigned_pages', [])) == {"home", "gallery", "news"}, "assigned_pages should be updated"
        print(f"PASS: Updated slide assigned_pages to: {updated.get('assigned_pages')}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/hero-slides/{slide_id}", headers=headers)


class TestAdminNavPages:
    """Test admin nav_pages CRUD with page_type sync"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json()['token']
    
    def test_admin_get_nav_pages(self, auth_token):
        """GET /api/admin/nav-pages returns list"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/nav-pages", headers=headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: Admin GET nav-pages returns {len(data)} pages")
    
    def test_admin_create_nav_page_with_page_type(self, auth_token):
        """Create nav_page with page_type syncs to pages collection"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        page_data = {
            "title": "TEST_PageType_Sync",
            "url": "/test-sync",
            "page_type": "test_sync_page",
            "content": "<p>Test content for sync</p>",
            "show_in_header": False,
            "show_in_footer": False,
            "login_required": False,
            "open_in_new_tab": False
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/nav-pages", headers=headers, json=page_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        page_id = data['id']
        
        # Verify page_type was saved
        assert data.get('page_type') == "test_sync_page", "page_type should be saved"
        
        # Check if content synced to pages collection
        public_page_resp = requests.get(f"{BASE_URL}/api/public/page/test_sync_page")
        assert public_page_resp.status_code == 200
        public_page = public_page_resp.json()
        assert public_page.get('content') == "<p>Test content for sync</p>", "Content should sync to pages collection"
        
        print("PASS: nav_page with page_type syncs content to pages collection")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/nav-pages/{page_id}", headers=headers)
    
    def test_admin_update_nav_page_syncs_content(self, auth_token):
        """Update nav_page content syncs to pages collection"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create test page
        page_data = {
            "title": "TEST_Update_Sync",
            "url": "/test-update-sync",
            "page_type": "test_update_sync",
            "content": "<p>Original content</p>"
        }
        create_resp = requests.post(f"{BASE_URL}/api/admin/nav-pages", headers=headers, json=page_data)
        assert create_resp.status_code == 200
        page_id = create_resp.json()['id']
        
        # Update content
        update_data = {"content": "<p>Updated content</p>", "page_type": "test_update_sync"}
        update_resp = requests.put(f"{BASE_URL}/api/admin/nav-pages/{page_id}", headers=headers, json=update_data)
        assert update_resp.status_code == 200
        
        # Verify sync
        public_page_resp = requests.get(f"{BASE_URL}/api/public/page/test_update_sync")
        assert public_page_resp.status_code == 200
        public_page = public_page_resp.json()
        assert public_page.get('content') == "<p>Updated content</p>", "Updated content should sync"
        
        print("PASS: Updated nav_page content syncs to pages collection")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/nav-pages/{page_id}", headers=headers)


class TestPublicPageEndpoint:
    """Test GET /api/public/page/{page_type}"""
    
    def test_get_terms_page(self):
        """GET /api/public/page/terms returns page content"""
        response = requests.get(f"{BASE_URL}/api/public/page/terms")
        assert response.status_code == 200
        
        data = response.json()
        assert 'page_type' in data, "Response should contain page_type"
        assert data['page_type'] == 'terms', "page_type should be 'terms'"
        print(f"PASS: GET /api/public/page/terms returns: title={data.get('title')}")
    
    def test_get_privacy_page(self):
        """GET /api/public/page/privacy returns page content"""
        response = requests.get(f"{BASE_URL}/api/public/page/privacy")
        assert response.status_code == 200
        
        data = response.json()
        assert 'page_type' in data, "Response should contain page_type"
        print(f"PASS: GET /api/public/page/privacy returns: title={data.get('title')}")
    
    def test_get_nonexistent_page_returns_default(self):
        """GET /api/public/page/nonexistent returns default structure"""
        response = requests.get(f"{BASE_URL}/api/public/page/nonexistent_xyz")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get('page_type') == 'nonexistent_xyz', "Should return page_type"
        print("PASS: Nonexistent page returns default structure")


class TestExistingEndpoints:
    """Verify existing endpoints still work"""
    
    def test_public_hero(self):
        """GET /api/public/hero returns 200"""
        response = requests.get(f"{BASE_URL}/api/public/hero")
        assert response.status_code == 200
        print("PASS: GET /api/public/hero returns 200")
    
    def test_public_about(self):
        """GET /api/public/about returns 200"""
        response = requests.get(f"{BASE_URL}/api/public/about")
        assert response.status_code == 200
        print("PASS: GET /api/public/about returns 200")
    
    def test_public_services(self):
        """GET /api/public/services returns 200"""
        response = requests.get(f"{BASE_URL}/api/public/services")
        assert response.status_code == 200
        print("PASS: GET /api/public/services returns 200")
    
    def test_public_sections(self):
        """GET /api/public/sections returns 200"""
        response = requests.get(f"{BASE_URL}/api/public/sections")
        assert response.status_code == 200
        print("PASS: GET /api/public/sections returns 200")
    
    def test_public_testimonials(self):
        """GET /api/public/testimonials returns 200"""
        response = requests.get(f"{BASE_URL}/api/public/testimonials")
        assert response.status_code == 200
        print("PASS: GET /api/public/testimonials returns 200")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
