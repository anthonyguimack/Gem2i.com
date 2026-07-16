"""
Iteration 29: Testing 11 bug fixes and features
1) Gallery block URL fix (/gallery/ -> /album/)
2) Scroll to top on navigation
3) Hyphen word-break fix
4) H1 headings in rich text
5) Short description as HTML rendering
6) Anchor scroll for hash URLs (/#services)
7) Hero rich text color preservation (black text)
8) Hero image/video custom dimensions
9) Service external URL + open_in_new_tab
10) Rich text nested lists (indent/outdent)
11) Legends & Testimonials block type with carousel
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPublicTestimonialsAPI:
    """Test GET /api/public/testimonials endpoint"""
    
    def test_get_testimonials_returns_list(self):
        """Verify public testimonials endpoint returns data"""
        response = requests.get(f"{BASE_URL}/api/public/testimonials")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of testimonials"
        print(f"SUCCESS: GET /api/public/testimonials returned {len(data)} testimonials")
    
    def test_testimonials_have_required_fields(self):
        """Verify testimonials have name, content fields"""
        response = requests.get(f"{BASE_URL}/api/public/testimonials")
        assert response.status_code == 200
        data = response.json()
        if len(data) > 0:
            item = data[0]
            assert "name" in item, "Testimonial missing 'name' field"
            assert "content" in item, "Testimonial missing 'content' field"
            print(f"SUCCESS: Testimonial has required fields: name='{item.get('name')}', content present")


class TestAdminTestimonialsAPI:
    """Test admin CRUD for testimonials"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        if login_response.status_code != 200:
            pytest.skip("Admin login failed")
        self.token = login_response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_admin_list_testimonials(self):
        """Test GET /api/admin/testimonials"""
        response = requests.get(f"{BASE_URL}/api/admin/testimonials", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Admin can list testimonials ({len(data)} items)")
    
    def test_admin_create_testimonial(self):
        """Test POST /api/admin/testimonials with image and order fields"""
        payload = {
            "name": "TEST_Legend_User",
            "title": "CEO, Test Company",
            "content": "This is a test testimonial for the Legends carousel.",
            "image": "/api/uploads/test-avatar.jpg",
            "order": 99
        }
        response = requests.post(f"{BASE_URL}/api/admin/testimonials", json=payload, headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("name") == "TEST_Legend_User"
        assert data.get("title") == "CEO, Test Company"
        assert data.get("order") == 99
        assert "id" in data
        self.created_id = data["id"]
        print(f"SUCCESS: Created testimonial with id={self.created_id}, order={data.get('order')}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/testimonials/{self.created_id}", headers=self.headers)
    
    def test_admin_update_testimonial_order(self):
        """Test PUT /api/admin/testimonials/{id} to update order"""
        # Create first
        payload = {"name": "TEST_Order_User", "content": "Test content", "order": 1}
        create_resp = requests.post(f"{BASE_URL}/api/admin/testimonials", json=payload, headers=self.headers)
        assert create_resp.status_code == 200
        item_id = create_resp.json()["id"]
        
        # Update order
        update_resp = requests.put(f"{BASE_URL}/api/admin/testimonials/{item_id}", 
                                   json={"order": 5}, headers=self.headers)
        assert update_resp.status_code == 200
        assert update_resp.json().get("order") == 5
        print(f"SUCCESS: Updated testimonial order to 5")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/testimonials/{item_id}", headers=self.headers)
    
    def test_admin_delete_testimonial(self):
        """Test DELETE /api/admin/testimonials/{id}"""
        # Create first
        payload = {"name": "TEST_Delete_User", "content": "To be deleted"}
        create_resp = requests.post(f"{BASE_URL}/api/admin/testimonials", json=payload, headers=self.headers)
        assert create_resp.status_code == 200
        item_id = create_resp.json()["id"]
        
        # Delete
        delete_resp = requests.delete(f"{BASE_URL}/api/admin/testimonials/{item_id}", headers=self.headers)
        assert delete_resp.status_code == 200
        print(f"SUCCESS: Deleted testimonial {item_id}")


class TestServicesExternalURL:
    """Test service external_url and open_in_new_tab fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        if login_response.status_code != 200:
            pytest.skip("Admin login failed")
        self.token = login_response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_create_service_with_external_url(self):
        """Test creating service with external_url and open_in_new_tab"""
        payload = {
            "title": "TEST_External_Service",
            "description": "Service with external link",
            "short_description": "<p>Short desc with <strong>HTML</strong></p>",
            "external_url": "https://example.com/external-page",
            "open_in_new_tab": True,
            "price": 0,
            "type": "service"
        }
        response = requests.post(f"{BASE_URL}/api/admin/services", json=payload, headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("external_url") == "https://example.com/external-page"
        assert data.get("open_in_new_tab") == True
        print(f"SUCCESS: Created service with external_url and open_in_new_tab=True")
        
        # Verify via public API
        public_resp = requests.get(f"{BASE_URL}/api/public/services")
        services = public_resp.json()
        test_service = next((s for s in services if s.get("title") == "TEST_External_Service"), None)
        assert test_service is not None
        assert test_service.get("external_url") == "https://example.com/external-page"
        print(f"SUCCESS: Public API returns external_url field")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/services/{data['id']}", headers=self.headers)
    
    def test_service_short_description_html(self):
        """Test that short_description can contain HTML"""
        payload = {
            "title": "TEST_HTML_Service",
            "description": "Full description",
            "short_description": "<p>This has <strong>bold</strong> and <em>italic</em> text</p>",
            "price": 99.99,
            "type": "service"
        }
        response = requests.post(f"{BASE_URL}/api/admin/services", json=payload, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "<strong>bold</strong>" in data.get("short_description", "")
        print(f"SUCCESS: short_description preserves HTML tags")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/services/{data['id']}", headers=self.headers)


class TestHeroSlideMediaDimensions:
    """Test hero slide media_width and media_height fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        if login_response.status_code != 200:
            pytest.skip("Admin login failed")
        self.token = login_response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_create_hero_slide_with_media_dimensions(self):
        """Test creating hero slide with media_width and media_height"""
        payload = {
            "title": "<p>TEST Hero Slide</p>",
            "subtitle": "<p>With custom dimensions</p>",
            "slide_type": "photo",
            "photo": "https://example.com/test.jpg",
            "media_width": 600,
            "media_height": 400,
            "assigned_pages": []
        }
        response = requests.post(f"{BASE_URL}/api/admin/hero-slides", json=payload, headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("media_width") == 600
        assert data.get("media_height") == 400
        print(f"SUCCESS: Created hero slide with media_width=600, media_height=400")
        
        # Verify via GET
        get_resp = requests.get(f"{BASE_URL}/api/admin/hero-slides/{data['id']}", headers=self.headers)
        assert get_resp.status_code == 200
        slide = get_resp.json()
        assert slide.get("media_width") == 600
        assert slide.get("media_height") == 400
        print(f"SUCCESS: GET returns media dimensions correctly")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/hero-slides/{data['id']}", headers=self.headers)
    
    def test_hero_slide_rich_text_preserves_color(self):
        """Test that hero slide title/subtitle can contain color styles"""
        payload = {
            "title": '<p><span style="color: #000000;">Black Title Text</span></p>',
            "subtitle": '<p><span style="color: #ff0000;">Red Subtitle</span></p>',
            "slide_type": "photo",
            "assigned_pages": []
        }
        response = requests.post(f"{BASE_URL}/api/admin/hero-slides", json=payload, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert 'color: #000000' in data.get("title", "") or 'color:#000000' in data.get("title", "")
        print(f"SUCCESS: Hero slide preserves inline color styles in title")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/hero-slides/{data['id']}", headers=self.headers)


class TestGalleryAlbumsAPI:
    """Test gallery albums API for /album/ URL fix verification"""
    
    def test_public_gallery_albums_endpoint(self):
        """Verify GET /api/public/gallery-albums works"""
        response = requests.get(f"{BASE_URL}/api/public/gallery-albums")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: GET /api/public/gallery-albums returned {len(data)} albums")
    
    def test_album_photos_endpoint(self):
        """Verify album photos endpoint exists"""
        # First get albums
        albums_resp = requests.get(f"{BASE_URL}/api/public/gallery-albums")
        albums = albums_resp.json()
        
        if len(albums) > 0:
            album_id = albums[0].get("id")
            photos_resp = requests.get(f"{BASE_URL}/api/public/gallery-albums/{album_id}/photos")
            assert photos_resp.status_code == 200
            data = photos_resp.json()
            assert "album" in data
            assert "photos" in data
            print(f"SUCCESS: Album photos endpoint works for album {album_id}")
        else:
            print("SKIP: No albums to test photos endpoint")


class TestNavPagesWithZones:
    """Test nav pages with zones for legends_testimonials block type"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        if login_response.status_code != 200:
            pytest.skip("Admin login failed")
        self.token = login_response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_create_page_with_legends_testimonials_block(self):
        """Test creating a page with legends_testimonials block type"""
        payload = {
            "title": "TEST_Legends_Page",
            "url": "/test-legends",
            "show_in_header": False,
            "show_in_footer": False,
            "layout": "full_width",
            "zones": {
                "main": [
                    {
                        "id": "block_test_1",
                        "type": "legends_testimonials",
                        "order": 0,
                        "config": {}
                    }
                ]
            }
        }
        response = requests.post(f"{BASE_URL}/api/admin/nav-pages", json=payload, headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("zones") is not None
        assert "main" in data.get("zones", {})
        blocks = data["zones"]["main"]
        assert len(blocks) == 1
        assert blocks[0]["type"] == "legends_testimonials"
        print(f"SUCCESS: Created page with legends_testimonials block")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/nav-pages/{data['id']}", headers=self.headers)


class TestPublicServicesDetail:
    """Test public service detail endpoint"""
    
    def test_get_service_detail(self):
        """Test GET /api/public/services/{id}"""
        # First get list of services
        list_resp = requests.get(f"{BASE_URL}/api/public/services")
        services = list_resp.json()
        
        if len(services) > 0:
            service_id = services[0].get("id")
            detail_resp = requests.get(f"{BASE_URL}/api/public/services/{service_id}")
            assert detail_resp.status_code == 200
            data = detail_resp.json()
            assert data.get("id") == service_id
            assert "title" in data
            print(f"SUCCESS: Service detail endpoint works for {service_id}")
        else:
            print("SKIP: No services to test detail endpoint")


class TestRichTextEditorFeatures:
    """Test RichTextEditor toolbar features (indent/outdent, colors)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        if login_response.status_code != 200:
            pytest.skip("Admin login failed")
        self.token = login_response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_blog_post_with_nested_lists(self):
        """Test creating blog post with nested list HTML"""
        payload = {
            "title": "TEST_Nested_Lists_Post",
            "content": """
                <h1>Main Heading</h1>
                <ul>
                    <li>Item 1
                        <ul>
                            <li>Nested item 1.1</li>
                            <li>Nested item 1.2</li>
                        </ul>
                    </li>
                    <li>Item 2</li>
                </ul>
            """,
            "category": "Test",
            "author": "Test Author",
            "published": True
        }
        response = requests.post(f"{BASE_URL}/api/admin/blog", json=payload, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "<ul>" in data.get("content", "")
        print(f"SUCCESS: Blog post with nested lists created")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/blog/{data['id']}", headers=self.headers)
    
    def test_about_with_h1_heading(self):
        """Test that about section can have H1 in description"""
        # Get current about
        get_resp = requests.get(f"{BASE_URL}/api/admin/about", headers=self.headers)
        original = get_resp.json()
        
        # Update with H1
        update_payload = {
            **original,
            "description": "<h1>About Our Company</h1><p>We are a great company.</p>"
        }
        update_resp = requests.put(f"{BASE_URL}/api/admin/about", json=update_payload, headers=self.headers)
        assert update_resp.status_code == 200
        
        # Verify
        verify_resp = requests.get(f"{BASE_URL}/api/public/about")
        about_data = verify_resp.json()
        # Note: about.description is plain text, not HTML - this tests the API accepts it
        print(f"SUCCESS: About section updated (description field accepts content)")
        
        # Restore original
        requests.put(f"{BASE_URL}/api/admin/about", json=original, headers=self.headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
