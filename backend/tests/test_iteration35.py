"""
Iteration 35 Tests: 4 New Features
1. Hero Slide Form - Live Preview position (frontend only)
2. Hero Live Preview - Background gradient behavior (frontend only)
3. Pages Manager - Unified single table with system pages
4. Contact Settings Manager - CMS editable contact section text
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@consultant.com",
        "password": "Admin123!"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json().get("token")

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Auth headers for admin requests"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestContactSettingsAPI:
    """Test contact settings GET/PUT endpoints"""
    
    def test_get_contact_settings_requires_auth(self):
        """GET /api/admin/contact-settings should require auth"""
        response = requests.get(f"{BASE_URL}/api/admin/contact-settings")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: GET /api/admin/contact-settings requires auth")
    
    def test_get_contact_settings_returns_defaults(self, auth_headers):
        """GET /api/admin/contact-settings should return title, subtitle, description"""
        response = requests.get(f"{BASE_URL}/api/admin/contact-settings", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "title" in data, "Response should contain 'title'"
        assert "subtitle" in data, "Response should contain 'subtitle'"
        assert "description" in data, "Response should contain 'description'"
        print(f"PASS: GET /api/admin/contact-settings returns: {data}")
    
    def test_update_contact_settings_requires_auth(self):
        """PUT /api/admin/contact-settings should require auth"""
        response = requests.put(f"{BASE_URL}/api/admin/contact-settings", json={
            "title": "Test", "subtitle": "Test", "description": "Test"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: PUT /api/admin/contact-settings requires auth")
    
    def test_update_contact_settings(self, auth_headers):
        """PUT /api/admin/contact-settings should update and persist"""
        update_data = {
            "title": "TEST_Contact",
            "subtitle": "TEST_Let's Collaborate",
            "description": "TEST_Have a project? Let's talk about it"
        }
        response = requests.put(f"{BASE_URL}/api/admin/contact-settings", json=update_data, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["title"] == update_data["title"], f"Title mismatch: {data['title']}"
        assert data["subtitle"] == update_data["subtitle"], f"Subtitle mismatch: {data['subtitle']}"
        assert data["description"] == update_data["description"], f"Description mismatch: {data['description']}"
        print(f"PASS: PUT /api/admin/contact-settings updated: {data}")
        
        # Verify persistence with GET
        get_response = requests.get(f"{BASE_URL}/api/admin/contact-settings", headers=auth_headers)
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["title"] == update_data["title"], "Title not persisted"
        assert get_data["subtitle"] == update_data["subtitle"], "Subtitle not persisted"
        assert get_data["description"] == update_data["description"], "Description not persisted"
        print("PASS: Contact settings persisted correctly")
    
    def test_contact_settings_in_public_settings(self, auth_headers):
        """Public settings should include contact_settings for homepage"""
        # First update contact settings
        update_data = {
            "title": "TEST_Public_Contact",
            "subtitle": "TEST_Public_Subtitle",
            "description": "TEST_Public_Description"
        }
        requests.put(f"{BASE_URL}/api/admin/contact-settings", json=update_data, headers=auth_headers)
        
        # Check public settings endpoint
        response = requests.get(f"{BASE_URL}/api/public/settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        # contact_settings should be in the public settings
        assert "contact_settings" in data, "Public settings should include contact_settings"
        cs = data["contact_settings"]
        assert cs["title"] == update_data["title"], f"Public contact title mismatch: {cs}"
        assert cs["subtitle"] == update_data["subtitle"], f"Public contact subtitle mismatch: {cs}"
        assert cs["description"] == update_data["description"], f"Public contact description mismatch: {cs}"
        print(f"PASS: Public settings includes contact_settings: {cs}")


class TestSystemPagesAPI:
    """Test system pages seeding and protection"""
    
    def test_seed_system_pages_requires_auth(self):
        """POST /api/admin/seed-system-pages should require auth"""
        response = requests.post(f"{BASE_URL}/api/admin/seed-system-pages")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("PASS: POST /api/admin/seed-system-pages requires auth")
    
    def test_seed_system_pages(self, auth_headers):
        """POST /api/admin/seed-system-pages should seed Home, News, Gallery, Reading List"""
        response = requests.post(f"{BASE_URL}/api/admin/seed-system-pages", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "seeded" in data, "Response should contain 'seeded' count"
        print(f"PASS: Seed system pages returned: {data}")
    
    def test_nav_pages_include_system_pages(self, auth_headers):
        """GET /api/admin/nav-pages should include system pages with system flag"""
        # First seed
        requests.post(f"{BASE_URL}/api/admin/seed-system-pages", headers=auth_headers)
        
        response = requests.get(f"{BASE_URL}/api/admin/nav-pages", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        pages = response.json()
        
        # Check for system pages
        system_pages = [p for p in pages if p.get("system") == True]
        system_keys = [p.get("system_key") for p in system_pages]
        
        expected_keys = ["home", "news", "gallery", "reading_list"]
        for key in expected_keys:
            assert key in system_keys, f"System page '{key}' not found in nav_pages"
        
        print(f"PASS: Found system pages: {system_keys}")
        
        # Verify system pages have correct URLs
        for page in system_pages:
            if page["system_key"] == "home":
                assert page["url"] == "/", f"Home page URL should be '/': {page['url']}"
            elif page["system_key"] == "news":
                assert page["url"] == "/news", f"News page URL should be '/news': {page['url']}"
            elif page["system_key"] == "gallery":
                assert page["url"] == "/gallery", f"Gallery page URL should be '/gallery': {page['url']}"
            elif page["system_key"] == "reading_list":
                assert page["url"] == "/reading-list", f"Reading List page URL should be '/reading-list': {page['url']}"
        
        print("PASS: System pages have correct URLs")
    
    def test_system_page_cannot_be_deleted(self, auth_headers):
        """DELETE /api/admin/nav-pages/{id} should fail for system pages"""
        # Get system pages
        response = requests.get(f"{BASE_URL}/api/admin/nav-pages", headers=auth_headers)
        pages = response.json()
        system_page = next((p for p in pages if p.get("system") == True), None)
        
        if system_page:
            delete_response = requests.delete(f"{BASE_URL}/api/admin/nav-pages/{system_page['id']}", headers=auth_headers)
            assert delete_response.status_code == 400, f"Expected 400 for system page delete, got {delete_response.status_code}"
            print(f"PASS: System page '{system_page['title']}' cannot be deleted (400 returned)")
        else:
            pytest.skip("No system pages found to test deletion protection")
    
    def test_system_page_can_be_edited(self, auth_headers):
        """PUT /api/admin/nav-pages/{id} should work for system pages"""
        # Get system pages
        response = requests.get(f"{BASE_URL}/api/admin/nav-pages", headers=auth_headers)
        pages = response.json()
        system_page = next((p for p in pages if p.get("system") == True), None)
        
        if system_page:
            # Try to update show_in_header
            original_header = system_page.get("show_in_header", False)
            update_data = {**system_page, "show_in_header": not original_header}
            
            update_response = requests.put(
                f"{BASE_URL}/api/admin/nav-pages/{system_page['id']}", 
                json=update_data, 
                headers=auth_headers
            )
            assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
            
            # Verify update
            updated = update_response.json()
            assert updated["show_in_header"] == (not original_header), "System page update failed"
            print(f"PASS: System page '{system_page['title']}' can be edited")
            
            # Restore original
            requests.put(
                f"{BASE_URL}/api/admin/nav-pages/{system_page['id']}", 
                json={**system_page, "show_in_header": original_header}, 
                headers=auth_headers
            )
        else:
            pytest.skip("No system pages found to test editing")


class TestHeroSlidesAPI:
    """Test hero slides API for preview functionality"""
    
    def test_hero_slides_crud(self, auth_headers):
        """Basic CRUD for hero slides still works"""
        # Create
        slide_data = {
            "title": "TEST_Preview_Slide",
            "subtitle": "Testing preview",
            "description": "Test description",
            "background": "",
            "slide_type": "photo",
            "assigned_pages": []
        }
        create_response = requests.post(f"{BASE_URL}/api/admin/hero-slides", json=slide_data, headers=auth_headers)
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        created = create_response.json()
        slide_id = created["id"]
        print(f"PASS: Created hero slide: {slide_id}")
        
        # Read
        get_response = requests.get(f"{BASE_URL}/api/admin/hero-slides/{slide_id}", headers=auth_headers)
        assert get_response.status_code == 200
        print("PASS: Read hero slide")
        
        # Update with background
        update_data = {**created, "background": "/api/uploads/test-bg.jpg"}
        update_response = requests.put(f"{BASE_URL}/api/admin/hero-slides/{slide_id}", json=update_data, headers=auth_headers)
        assert update_response.status_code == 200
        updated = update_response.json()
        assert updated["background"] == "/api/uploads/test-bg.jpg"
        print("PASS: Updated hero slide with background")
        
        # Delete
        delete_response = requests.delete(f"{BASE_URL}/api/admin/hero-slides/{slide_id}", headers=auth_headers)
        assert delete_response.status_code == 200
        print("PASS: Deleted hero slide")


class TestCleanup:
    """Cleanup test data"""
    
    def test_restore_contact_settings(self, auth_headers):
        """Restore default contact settings"""
        default_data = {
            "title": "Contact",
            "subtitle": "Let's Work Together",
            "description": "Have a project in mind? Let's discuss how we can help"
        }
        response = requests.put(f"{BASE_URL}/api/admin/contact-settings", json=default_data, headers=auth_headers)
        assert response.status_code == 200
        print("PASS: Restored default contact settings")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
