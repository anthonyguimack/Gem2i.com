"""
Test suite to verify NO REGRESSIONS after backend refactoring.
Backend was split from monolithic server.py into:
- models/database.py
- routes/auth.py
- routes/public.py
- routes/admin_content.py
- routes/admin_tools.py
- routes/payments.py

Tests cover all Batch 1-4 features:
- WYSIWYG editor, image upload, drag-and-drop section reordering
- Map clustering, search, SEO, analytics
- CSV export, bulk operations
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthEndpoints:
    """Test auth routes (routes/auth.py)"""
    
    def test_admin_login(self):
        """Admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!",
            "login_type": "admin"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
        
    def test_user_login(self):
        """User login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "user@example.com",
            "password": "User123!",
            "login_type": "user"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "user"
        
    def test_admin_login_as_user_fails(self):
        """Admin cannot login through user login type"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!",
            "login_type": "user"
        })
        assert response.status_code == 403
        
    def test_invalid_credentials(self):
        """Invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "fake@email.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        
    def test_auth_me_unauthorized(self):
        """Auth me without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401


class TestPublicEndpoints:
    """Test public routes (routes/public.py)"""
    
    def test_get_public_settings(self):
        """Public settings endpoint works"""
        response = requests.get(f"{BASE_URL}/api/public/settings")
        assert response.status_code == 200
        data = response.json()
        assert "brand_name" in data
        assert "social_links" in data or "social_media" in data
        
    def test_get_public_hero(self):
        """Public hero endpoint works"""
        response = requests.get(f"{BASE_URL}/api/public/hero")
        assert response.status_code == 200
        data = response.json()
        assert "title" in data
        
    def test_get_public_about(self):
        """Public about endpoint works"""
        response = requests.get(f"{BASE_URL}/api/public/about")
        assert response.status_code == 200
        data = response.json()
        assert "title" in data or "label" in data
        
    def test_get_public_services(self):
        """Public services endpoint returns list"""
        response = requests.get(f"{BASE_URL}/api/public/services")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        
    def test_get_public_blog(self):
        """Public blog endpoint with pagination"""
        response = requests.get(f"{BASE_URL}/api/public/blog?page=1&limit=3")
        assert response.status_code == 200
        data = response.json()
        assert "posts" in data
        assert "total" in data
        assert "pages" in data
        
    def test_get_public_books(self):
        """Public books endpoint works"""
        response = requests.get(f"{BASE_URL}/api/public/books")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
    def test_get_public_maps(self):
        """Public maps endpoint works"""
        response = requests.get(f"{BASE_URL}/api/public/maps")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
    def test_get_public_map_locations(self):
        """Public map locations endpoint works"""
        response = requests.get(f"{BASE_URL}/api/public/map-locations")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
    def test_get_public_gallery(self):
        """Public gallery endpoint works"""
        response = requests.get(f"{BASE_URL}/api/public/gallery")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
    def test_get_public_portfolio(self):
        """Public portfolio endpoint works"""
        response = requests.get(f"{BASE_URL}/api/public/portfolio")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
    def test_get_public_testimonials(self):
        """Public testimonials endpoint works"""
        response = requests.get(f"{BASE_URL}/api/public/testimonials")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
    def test_get_public_sections(self):
        """Public sections with section_order"""
        response = requests.get(f"{BASE_URL}/api/public/sections")
        assert response.status_code == 200
        data = response.json()
        assert "sections" in data
        assert "section_order" in data
        
    def test_get_public_nav_pages(self):
        """Public nav pages endpoint works"""
        response = requests.get(f"{BASE_URL}/api/public/nav-pages")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
    def test_blog_latest_external_api(self):
        """External blog API proxy works"""
        response = requests.get(f"{BASE_URL}/api/blog/latest")
        assert response.status_code == 200
        data = response.json()
        assert "posts" in data


class TestSearchEndpoint:
    """Test search functionality (routes/public.py)"""
    
    def test_search_with_query(self):
        """Search with query returns results"""
        response = requests.get(f"{BASE_URL}/api/search?q=business")
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert "total" in data
        
    def test_search_empty_query(self):
        """Search with empty query returns empty results"""
        response = requests.get(f"{BASE_URL}/api/search?q=")
        assert response.status_code == 200
        data = response.json()
        assert data["results"] == []
        assert data["total"] == 0
        
    def test_search_returns_multiple_types(self):
        """Search returns results from multiple content types"""
        response = requests.get(f"{BASE_URL}/api/search?q=strategy")
        assert response.status_code == 200
        data = response.json()
        types_found = set(r["type"] for r in data["results"])
        # Should find at least one type (blog, service, portfolio, or book)
        assert len(types_found) >= 1


class TestAdminContentEndpoints:
    """Test admin CRUD routes (routes/admin_content.py)"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!",
            "login_type": "admin"
        })
        return response.json()["token"]
    
    def test_admin_dashboard(self, admin_token):
        """Admin dashboard returns stats"""
        response = requests.get(
            f"{BASE_URL}/api/admin/dashboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "blog_count" in data
        assert "users_count" in data
        assert "pages_count" in data
        
    def test_admin_get_settings(self, admin_token):
        """Admin can get full settings"""
        response = requests.get(
            f"{BASE_URL}/api/admin/settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "brand_name" in data
        
    def test_admin_list_blog(self, admin_token):
        """Admin can list all blog posts"""
        response = requests.get(
            f"{BASE_URL}/api/admin/blog",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
    def test_admin_list_services(self, admin_token):
        """Admin can list all services"""
        response = requests.get(
            f"{BASE_URL}/api/admin/services",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
    def test_admin_list_gallery(self, admin_token):
        """Admin can list all gallery items"""
        response = requests.get(
            f"{BASE_URL}/api/admin/gallery",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
    def test_admin_list_contacts(self, admin_token):
        """Admin can list all contacts"""
        response = requests.get(
            f"{BASE_URL}/api/admin/contacts",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
    def test_admin_list_users(self, admin_token):
        """Admin can list all users (non-admin)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should not include admin users
        for user in data:
            assert user.get("role") != "admin"
            
    def test_admin_list_nav_pages(self, admin_token):
        """Admin can list nav pages"""
        response = requests.get(
            f"{BASE_URL}/api/admin/nav-pages",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
    def test_admin_get_hero(self, admin_token):
        """Admin can get hero section"""
        response = requests.get(
            f"{BASE_URL}/api/admin/hero",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
    def test_admin_get_about(self, admin_token):
        """Admin can get about section"""
        response = requests.get(
            f"{BASE_URL}/api/admin/about",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200


class TestAdminToolsEndpoints:
    """Test admin tools routes (routes/admin_tools.py)"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!",
            "login_type": "admin"
        })
        return response.json()["token"]
    
    def test_get_section_order(self, admin_token):
        """Admin can get section order"""
        response = requests.get(
            f"{BASE_URL}/api/admin/section-order",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert "hero" in data
        
    def test_update_section_order(self, admin_token):
        """Admin can update section order"""
        # First get current order
        response = requests.get(
            f"{BASE_URL}/api/admin/section-order",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        original_order = response.json()
        
        # Update (same order to not break anything)
        response = requests.put(
            f"{BASE_URL}/api/admin/section-order",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"order": original_order}
        )
        assert response.status_code == 200
        data = response.json()
        assert "order" in data
        
    def test_get_seo_meta(self, admin_token):
        """Admin can get SEO meta list"""
        response = requests.get(
            f"{BASE_URL}/api/admin/seo",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
    def test_update_seo_meta(self, admin_token):
        """Admin can update SEO meta for a page"""
        response = requests.put(
            f"{BASE_URL}/api/admin/seo/test-page",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "title": "Test Page Title",
                "description": "Test description",
                "keywords": "test,seo"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["page_path"] == "test-page"
        assert data["title"] == "Test Page Title"
        
    def test_get_analytics(self, admin_token):
        """Admin can get analytics data"""
        response = requests.get(
            f"{BASE_URL}/api/admin/analytics",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "monthly_contacts" in data
        assert "monthly_revenue" in data
        assert "content_stats" in data
        assert "top_services" in data
        
    def test_csv_export_contacts(self, admin_token):
        """Admin can export contacts as CSV"""
        response = requests.get(
            f"{BASE_URL}/api/admin/contacts/export",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        assert "attachment" in response.headers.get("content-disposition", "")
        
    def test_bulk_delete_validation(self, admin_token):
        """Bulk delete validates collection name"""
        response = requests.post(
            f"{BASE_URL}/api/admin/bulk-delete",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"collection": "invalid_collection", "ids": ["test"]}
        )
        assert response.status_code == 400
        
    def test_bulk_update_validation(self, admin_token):
        """Bulk update validates collection name"""
        response = requests.post(
            f"{BASE_URL}/api/admin/bulk-update",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"collection": "invalid_collection", "ids": ["test"], "update": {"read": True}}
        )
        assert response.status_code == 400


class TestImageUpload:
    """Test image upload endpoint (routes/admin_tools.py)"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!",
            "login_type": "admin"
        })
        return response.json()["token"]
    
    def test_upload_requires_auth(self):
        """Upload requires admin authentication"""
        # Create a small test image
        from io import BytesIO
        image_data = BytesIO()
        # Minimal PNG header (1x1 transparent pixel)
        image_data.write(b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82')
        image_data.seek(0)
        
        response = requests.post(
            f"{BASE_URL}/api/upload",
            files={"file": ("test.png", image_data, "image/png")}
        )
        assert response.status_code == 401 or response.status_code == 403
        
    def test_upload_with_auth(self, admin_token):
        """Upload works with admin authentication"""
        from io import BytesIO
        image_data = BytesIO()
        # Minimal PNG header (1x1 transparent pixel)
        image_data.write(b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82')
        image_data.seek(0)
        
        response = requests.post(
            f"{BASE_URL}/api/upload",
            headers={"Authorization": f"Bearer {admin_token}"},
            files={"file": ("test.png", image_data, "image/png")}
        )
        assert response.status_code == 200
        data = response.json()
        assert "url" in data
        assert "filename" in data


class TestContactForm:
    """Test contact form submission (routes/public.py)"""
    
    def test_submit_contact_form(self):
        """Contact form submission works"""
        response = requests.post(f"{BASE_URL}/api/contact", json={
            "name": "TEST_Contact Person",
            "email": "test@test.com",
            "phone": "123-456-7890",
            "subject": "Test Subject",
            "message": "This is a test message from automated testing."
        })
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "message" in data


class TestAdminRequiresAuth:
    """Verify admin endpoints require authentication"""
    
    def test_admin_endpoints_require_auth(self):
        """All admin endpoints return 401 without auth"""
        endpoints = [
            "/api/admin/dashboard",
            "/api/admin/blog",
            "/api/admin/services",
            "/api/admin/gallery",
            "/api/admin/contacts",
            "/api/admin/users",
            "/api/admin/settings",
            "/api/admin/section-order",
            "/api/admin/seo",
            "/api/admin/analytics",
        ]
        for endpoint in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}")
            assert response.status_code in [401, 403], f"{endpoint} should require auth"
