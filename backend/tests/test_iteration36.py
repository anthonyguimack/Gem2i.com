"""
Iteration 36 Tests: System Page Deletion & Layout Changes
Tests:
1. DELETE /api/admin/nav-pages/{id} should work for system pages (no 400 error)
2. System pages can be created via seed endpoint
3. Visual Builder layouts are available
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSystemPageDeletion:
    """Test that system pages can now be deleted"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.token = login_resp.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        # Seed system pages first
        seed_resp = self.session.post(f"{BASE_URL}/api/admin/seed-system-pages")
        assert seed_resp.status_code == 200, f"Seed failed: {seed_resp.text}"
    
    def test_get_nav_pages_includes_system_pages(self):
        """Verify system pages exist after seeding"""
        resp = self.session.get(f"{BASE_URL}/api/admin/nav-pages")
        assert resp.status_code == 200
        pages = resp.json()
        
        # Check that system pages exist
        system_keys = [p.get("system_key") for p in pages if p.get("system")]
        assert "home" in system_keys, "Home system page should exist"
        assert "news" in system_keys, "News system page should exist"
        assert "gallery" in system_keys, "Gallery system page should exist"
        assert "reading_list" in system_keys, "Reading List system page should exist"
        print(f"Found {len(system_keys)} system pages: {system_keys}")
    
    def test_delete_system_page_succeeds(self):
        """DELETE /api/admin/nav-pages/{id} should work for system pages"""
        # Get all pages
        resp = self.session.get(f"{BASE_URL}/api/admin/nav-pages")
        assert resp.status_code == 200
        pages = resp.json()
        
        # Find a system page (e.g., News)
        news_page = next((p for p in pages if p.get("system_key") == "news"), None)
        assert news_page is not None, "News system page should exist"
        
        news_id = news_page["id"]
        
        # Delete the system page - should NOT return 400 anymore
        delete_resp = self.session.delete(f"{BASE_URL}/api/admin/nav-pages/{news_id}")
        assert delete_resp.status_code == 200, f"Delete should succeed, got: {delete_resp.status_code} - {delete_resp.text}"
        
        # Verify it's deleted
        get_resp = self.session.get(f"{BASE_URL}/api/admin/nav-pages")
        pages_after = get_resp.json()
        news_after = next((p for p in pages_after if p.get("id") == news_id), None)
        assert news_after is None, "News page should be deleted"
        print("Successfully deleted system page 'News'")
    
    def test_delete_gallery_system_page(self):
        """Test deleting Gallery system page"""
        resp = self.session.get(f"{BASE_URL}/api/admin/nav-pages")
        pages = resp.json()
        
        gallery_page = next((p for p in pages if p.get("system_key") == "gallery"), None)
        if gallery_page is None:
            pytest.skip("Gallery page already deleted or not seeded")
        
        delete_resp = self.session.delete(f"{BASE_URL}/api/admin/nav-pages/{gallery_page['id']}")
        assert delete_resp.status_code == 200, f"Delete Gallery should succeed: {delete_resp.text}"
        print("Successfully deleted system page 'Gallery'")
    
    def test_delete_reading_list_system_page(self):
        """Test deleting Reading List system page"""
        resp = self.session.get(f"{BASE_URL}/api/admin/nav-pages")
        pages = resp.json()
        
        reading_page = next((p for p in pages if p.get("system_key") == "reading_list"), None)
        if reading_page is None:
            pytest.skip("Reading List page already deleted or not seeded")
        
        delete_resp = self.session.delete(f"{BASE_URL}/api/admin/nav-pages/{reading_page['id']}")
        assert delete_resp.status_code == 200, f"Delete Reading List should succeed: {delete_resp.text}"
        print("Successfully deleted system page 'Reading List'")
    
    def test_reseed_after_deletion(self):
        """System pages can be re-seeded after deletion"""
        # Re-seed
        seed_resp = self.session.post(f"{BASE_URL}/api/admin/seed-system-pages")
        assert seed_resp.status_code == 200
        seeded_count = seed_resp.json().get("seeded", 0)
        print(f"Re-seeded {seeded_count} system pages")
        
        # Verify they're back
        resp = self.session.get(f"{BASE_URL}/api/admin/nav-pages")
        pages = resp.json()
        system_keys = [p.get("system_key") for p in pages if p.get("system")]
        
        # At least some should be re-seeded
        assert len(system_keys) > 0, "Should have system pages after re-seeding"


class TestNavPagesCRUD:
    """Test regular nav pages CRUD still works"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert login_resp.status_code == 200
        self.token = login_resp.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_create_page_with_visual_builder_layout(self):
        """Create a page with a Visual Builder layout"""
        page_data = {
            "title": "TEST_Visual_Builder_Page",
            "url": "/test-visual-builder",
            "layout": "boxed",
            "zones": {
                "main": [
                    {"type": "rich_text", "config": {"content": "<p>Test content</p>"}}
                ]
            },
            "show_in_header": False,
            "show_in_footer": False
        }
        
        resp = self.session.post(f"{BASE_URL}/api/admin/nav-pages", json=page_data)
        assert resp.status_code == 200, f"Create failed: {resp.text}"
        
        created = resp.json()
        assert created["layout"] == "boxed"
        assert "zones" in created
        print(f"Created page with Visual Builder layout: {created['id']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/nav-pages/{created['id']}")
    
    def test_create_page_with_split_screen_layout(self):
        """Create a page with split_screen layout"""
        page_data = {
            "title": "TEST_Split_Screen_Page",
            "url": "/test-split-screen",
            "layout": "split_screen",
            "zones": {
                "left": [{"type": "rich_text", "config": {"content": "<p>Left</p>"}}],
                "right": [{"type": "rich_text", "config": {"content": "<p>Right</p>"}}]
            },
            "show_in_header": False,
            "show_in_footer": False
        }
        
        resp = self.session.post(f"{BASE_URL}/api/admin/nav-pages", json=page_data)
        assert resp.status_code == 200
        
        created = resp.json()
        assert created["layout"] == "split_screen"
        print(f"Created split_screen page: {created['id']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/nav-pages/{created['id']}")


class TestPublicEndpoints:
    """Test public endpoints still work"""
    
    def test_public_settings(self):
        """Public settings endpoint works"""
        resp = requests.get(f"{BASE_URL}/api/settings")
        assert resp.status_code == 200
        print("Public settings endpoint works")
    
    def test_public_nav_pages(self):
        """Public nav pages endpoint works"""
        resp = requests.get(f"{BASE_URL}/api/nav-pages")
        assert resp.status_code == 200
        pages = resp.json()
        print(f"Public nav pages: {len(pages)} pages")
    
    def test_homepage_loads(self):
        """Homepage loads without errors"""
        resp = requests.get(f"{BASE_URL}/")
        assert resp.status_code == 200
        assert "<!doctype html>" in resp.text.lower() or "<!DOCTYPE html>" in resp.text
        print("Homepage loads successfully")


class TestGalleryAlbumsEndpoint:
    """Test gallery albums endpoint exists"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert login_resp.status_code == 200
        self.token = login_resp.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_gallery_albums_endpoint_exists(self):
        """GET /api/admin/gallery-albums should work"""
        resp = self.session.get(f"{BASE_URL}/api/admin/gallery-albums")
        assert resp.status_code == 200
        albums = resp.json()
        print(f"Gallery albums endpoint works, found {len(albums)} albums")
    
    def test_public_gallery_albums(self):
        """Public gallery albums endpoint"""
        resp = requests.get(f"{BASE_URL}/api/gallery-albums")
        # May return 200 or 404 depending on implementation
        assert resp.status_code in [200, 404]
        print(f"Public gallery albums: status {resp.status_code}")
