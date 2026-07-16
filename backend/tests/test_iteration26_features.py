"""
Iteration 26 Backend Tests
Tests for:
- Gallery Albums CRUD (admin + public)
- Album Photos CRUD (admin)
- Service Detail endpoint
- Nav Pages with layout field
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPublicEndpoints:
    """Test public endpoints for gallery albums and services"""
    
    def test_public_gallery_albums_list(self):
        """GET /api/public/gallery-albums returns albums list"""
        response = requests.get(f"{BASE_URL}/api/public/gallery-albums")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Public gallery albums endpoint works, found {len(data)} albums")
    
    def test_public_services_list(self):
        """GET /api/public/services returns services list"""
        response = requests.get(f"{BASE_URL}/api/public/services")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Public services endpoint works, found {len(data)} services")
    
    def test_public_nav_pages(self):
        """GET /api/public/nav-pages returns pages list"""
        response = requests.get(f"{BASE_URL}/api/public/nav-pages")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Public nav pages endpoint works, found {len(data)} pages")
    
    def test_public_settings(self):
        """GET /api/public/settings returns settings with tagline"""
        response = requests.get(f"{BASE_URL}/api/public/settings")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        # Check for tagline field (used for dynamic page title)
        print(f"✓ Public settings endpoint works, tagline: {data.get('tagline', 'not set')}")


class TestAdminAuth:
    """Test admin authentication"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.status_code}")
        return response.json().get("token")
    
    def test_admin_login(self):
        """Admin can login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data.get("user", {}).get("role") == "admin"
        print("✓ Admin login successful")


class TestGalleryAlbumsCRUD:
    """Test Gallery Albums CRUD operations (admin)"""
    
    @pytest.fixture
    def admin_headers(self):
        """Get admin auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_admin_list_gallery_albums(self, admin_headers):
        """GET /api/admin/gallery-albums returns albums list"""
        response = requests.get(f"{BASE_URL}/api/admin/gallery-albums", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin gallery albums list works, found {len(data)} albums")
    
    def test_admin_create_gallery_album(self, admin_headers):
        """POST /api/admin/gallery-albums creates album"""
        album_data = {
            "title": "TEST_Album_Iteration26",
            "description": "Test album for iteration 26",
            "cover_image": "",
            "order": 0
        }
        response = requests.post(f"{BASE_URL}/api/admin/gallery-albums", json=album_data, headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("title") == album_data["title"]
        assert "id" in data
        print(f"✓ Created album with id: {data['id']}")
        return data["id"]
    
    def test_admin_update_gallery_album(self, admin_headers):
        """PUT /api/admin/gallery-albums/{id} updates album"""
        # First create an album
        create_response = requests.post(f"{BASE_URL}/api/admin/gallery-albums", json={
            "title": "TEST_Album_ToUpdate",
            "description": "Will be updated"
        }, headers=admin_headers)
        assert create_response.status_code == 200
        album_id = create_response.json()["id"]
        
        # Update it
        update_response = requests.put(f"{BASE_URL}/api/admin/gallery-albums/{album_id}", json={
            "title": "TEST_Album_Updated",
            "description": "Updated description"
        }, headers=admin_headers)
        assert update_response.status_code == 200
        data = update_response.json()
        assert data.get("title") == "TEST_Album_Updated"
        print(f"✓ Updated album {album_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/gallery-albums/{album_id}", headers=admin_headers)
    
    def test_admin_delete_gallery_album(self, admin_headers):
        """DELETE /api/admin/gallery-albums/{id} deletes album"""
        # First create an album
        create_response = requests.post(f"{BASE_URL}/api/admin/gallery-albums", json={
            "title": "TEST_Album_ToDelete"
        }, headers=admin_headers)
        assert create_response.status_code == 200
        album_id = create_response.json()["id"]
        
        # Delete it
        delete_response = requests.delete(f"{BASE_URL}/api/admin/gallery-albums/{album_id}", headers=admin_headers)
        assert delete_response.status_code == 200
        print(f"✓ Deleted album {album_id}")
        
        # Verify it's gone from public list
        public_response = requests.get(f"{BASE_URL}/api/public/gallery-albums")
        albums = public_response.json()
        assert not any(a["id"] == album_id for a in albums)


class TestAlbumPhotosCRUD:
    """Test Album Photos CRUD operations (admin)"""
    
    @pytest.fixture
    def admin_headers(self):
        """Get admin auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture
    def test_album(self, admin_headers):
        """Create a test album for photo tests"""
        response = requests.post(f"{BASE_URL}/api/admin/gallery-albums", json={
            "title": "TEST_PhotoAlbum"
        }, headers=admin_headers)
        album_id = response.json()["id"]
        yield album_id
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/gallery-albums/{album_id}", headers=admin_headers)
    
    def test_admin_list_album_photos(self, admin_headers, test_album):
        """GET /api/admin/album-photos/{album_id} returns photos list"""
        response = requests.get(f"{BASE_URL}/api/admin/album-photos/{test_album}", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin album photos list works, found {len(data)} photos")
    
    def test_admin_create_album_photo(self, admin_headers, test_album):
        """POST /api/admin/album-photos creates photo"""
        photo_data = {
            "album_id": test_album,
            "image": "/api/uploads/test.jpg",
            "caption": "Test photo caption",
            "order": 0
        }
        response = requests.post(f"{BASE_URL}/api/admin/album-photos", json=photo_data, headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("caption") == photo_data["caption"]
        assert "id" in data
        print(f"✓ Created photo with id: {data['id']}")
    
    def test_admin_update_album_photo(self, admin_headers, test_album):
        """PUT /api/admin/album-photos/{id} updates photo"""
        # Create photo
        create_response = requests.post(f"{BASE_URL}/api/admin/album-photos", json={
            "album_id": test_album,
            "caption": "Original caption"
        }, headers=admin_headers)
        photo_id = create_response.json()["id"]
        
        # Update it
        update_response = requests.put(f"{BASE_URL}/api/admin/album-photos/{photo_id}", json={
            "caption": "Updated caption"
        }, headers=admin_headers)
        assert update_response.status_code == 200
        data = update_response.json()
        assert data.get("caption") == "Updated caption"
        print(f"✓ Updated photo {photo_id}")
    
    def test_admin_delete_album_photo(self, admin_headers, test_album):
        """DELETE /api/admin/album-photos/{id} deletes photo"""
        # Create photo
        create_response = requests.post(f"{BASE_URL}/api/admin/album-photos", json={
            "album_id": test_album,
            "caption": "To be deleted"
        }, headers=admin_headers)
        photo_id = create_response.json()["id"]
        
        # Delete it
        delete_response = requests.delete(f"{BASE_URL}/api/admin/album-photos/{photo_id}", headers=admin_headers)
        assert delete_response.status_code == 200
        print(f"✓ Deleted photo {photo_id}")


class TestPublicAlbumPhotos:
    """Test public album photos endpoint"""
    
    @pytest.fixture
    def admin_headers(self):
        """Get admin auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_public_album_photos(self, admin_headers):
        """GET /api/public/gallery-albums/{album_id}/photos returns album and photos"""
        # Create test album with photo
        album_response = requests.post(f"{BASE_URL}/api/admin/gallery-albums", json={
            "title": "TEST_PublicAlbum"
        }, headers=admin_headers)
        album_id = album_response.json()["id"]
        
        # Add a photo
        requests.post(f"{BASE_URL}/api/admin/album-photos", json={
            "album_id": album_id,
            "caption": "Test photo"
        }, headers=admin_headers)
        
        # Test public endpoint
        response = requests.get(f"{BASE_URL}/api/public/gallery-albums/{album_id}/photos")
        assert response.status_code == 200
        data = response.json()
        assert "album" in data
        assert "photos" in data
        assert data["album"]["title"] == "TEST_PublicAlbum"
        print(f"✓ Public album photos endpoint works, found {len(data['photos'])} photos")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/gallery-albums/{album_id}", headers=admin_headers)
    
    def test_public_album_photos_404(self):
        """GET /api/public/gallery-albums/{invalid_id}/photos returns 404"""
        response = requests.get(f"{BASE_URL}/api/public/gallery-albums/nonexistent-id/photos")
        assert response.status_code == 404
        print("✓ Public album photos returns 404 for invalid album")


class TestServiceDetail:
    """Test service detail endpoint"""
    
    @pytest.fixture
    def admin_headers(self):
        """Get admin auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_public_service_detail(self, admin_headers):
        """GET /api/public/services/{id} returns service detail"""
        # Create test service with full_content
        service_data = {
            "title": "TEST_Service_Detail",
            "description": "Short description",
            "short_description": "Card view description",
            "full_content": "<h2>Full Content</h2><p>This is the full content for the service detail page.</p>",
            "image": "",
            "price": 99.99,
            "type": "service"
        }
        create_response = requests.post(f"{BASE_URL}/api/admin/services", json=service_data, headers=admin_headers)
        assert create_response.status_code == 200
        service_id = create_response.json()["id"]
        
        # Test public detail endpoint
        response = requests.get(f"{BASE_URL}/api/public/services/{service_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == service_data["title"]
        assert data["full_content"] == service_data["full_content"]
        assert data["short_description"] == service_data["short_description"]
        print(f"✓ Public service detail endpoint works for service {service_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/services/{service_id}", headers=admin_headers)
    
    def test_public_service_detail_404(self):
        """GET /api/public/services/{invalid_id} returns 404"""
        response = requests.get(f"{BASE_URL}/api/public/services/nonexistent-id")
        assert response.status_code == 404
        print("✓ Public service detail returns 404 for invalid service")


class TestNavPagesWithLayout:
    """Test nav pages with layout field"""
    
    @pytest.fixture
    def admin_headers(self):
        """Get admin auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_create_page_with_layout(self, admin_headers):
        """POST /api/admin/nav-pages creates page with layout field"""
        page_data = {
            "title": "TEST_Page_Layout",
            "url": "/test-layout-page",
            "layout": "layout_1",
            "layout_image": "/api/uploads/test.jpg",
            "show_in_header": False,
            "show_in_footer": False
        }
        response = requests.post(f"{BASE_URL}/api/admin/nav-pages", json=page_data, headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("layout") == "layout_1"
        assert data.get("layout_image") == "/api/uploads/test.jpg"
        print(f"✓ Created page with layout: {data['layout']}")
        
        # Verify in public endpoint
        public_response = requests.get(f"{BASE_URL}/api/public/nav-pages")
        pages = public_response.json()
        test_page = next((p for p in pages if p["id"] == data["id"]), None)
        assert test_page is not None
        assert test_page.get("layout") == "layout_1"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/nav-pages/{data['id']}", headers=admin_headers)
    
    def test_update_page_layout(self, admin_headers):
        """PUT /api/admin/nav-pages/{id} updates layout field"""
        # Create page
        create_response = requests.post(f"{BASE_URL}/api/admin/nav-pages", json={
            "title": "TEST_Page_UpdateLayout",
            "url": "/test-update-layout",
            "layout": ""
        }, headers=admin_headers)
        page_id = create_response.json()["id"]
        
        # Update layout
        update_response = requests.put(f"{BASE_URL}/api/admin/nav-pages/{page_id}", json={
            "layout": "layout_3"
        }, headers=admin_headers)
        assert update_response.status_code == 200
        data = update_response.json()
        assert data.get("layout") == "layout_3"
        print(f"✓ Updated page layout to: {data['layout']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/nav-pages/{page_id}", headers=admin_headers)


class TestServicesManagerFields:
    """Test services with new fields (short_description, full_content, image)"""
    
    @pytest.fixture
    def admin_headers(self):
        """Get admin auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_create_service_with_new_fields(self, admin_headers):
        """POST /api/admin/services creates service with all new fields"""
        service_data = {
            "title": "TEST_Service_NewFields",
            "description": "Legacy description",
            "short_description": "Short card description",
            "full_content": "<p>Full HTML content</p>",
            "image": "/api/uploads/service.jpg",
            "price": 150.00,
            "type": "service",
            "icon": "briefcase"
        }
        response = requests.post(f"{BASE_URL}/api/admin/services", json=service_data, headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("short_description") == service_data["short_description"]
        assert data.get("full_content") == service_data["full_content"]
        assert data.get("image") == service_data["image"]
        print(f"✓ Created service with all new fields: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/services/{data['id']}", headers=admin_headers)


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture
    def admin_headers(self):
        """Get admin auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_cleanup_test_albums(self, admin_headers):
        """Clean up TEST_ prefixed albums"""
        response = requests.get(f"{BASE_URL}/api/admin/gallery-albums", headers=admin_headers)
        albums = response.json()
        deleted = 0
        for album in albums:
            if album.get("title", "").startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/admin/gallery-albums/{album['id']}", headers=admin_headers)
                deleted += 1
        print(f"✓ Cleaned up {deleted} test albums")
    
    def test_cleanup_test_services(self, admin_headers):
        """Clean up TEST_ prefixed services"""
        response = requests.get(f"{BASE_URL}/api/admin/services", headers=admin_headers)
        services = response.json()
        deleted = 0
        for service in services:
            if service.get("title", "").startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/admin/services/{service['id']}", headers=admin_headers)
                deleted += 1
        print(f"✓ Cleaned up {deleted} test services")
    
    def test_cleanup_test_pages(self, admin_headers):
        """Clean up TEST_ prefixed pages"""
        response = requests.get(f"{BASE_URL}/api/admin/nav-pages", headers=admin_headers)
        pages = response.json()
        deleted = 0
        for page in pages:
            if page.get("title", "").startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/admin/nav-pages/{page['id']}", headers=admin_headers)
                deleted += 1
        print(f"✓ Cleaned up {deleted} test pages")
