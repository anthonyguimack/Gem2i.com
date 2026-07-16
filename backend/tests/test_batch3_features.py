"""
Test cases for Batch 1-3 features:
- Image upload API
- Search API  
- CSV export for contacts
- Bulk operations (delete, update)
- Section order management
- SEO meta tags
- Analytics dashboard
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@consultant.com"
ADMIN_PASSWORD = "Admin123!"


class TestAuthSetup:
    """Verify auth works before testing admin features"""
    
    def test_admin_login(self):
        """Test admin login and get token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "login_type": "admin"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert data["user"]["role"] == "admin", "User is not admin"
        # Store token for other tests
        TestAuthSetup.admin_token = data["token"]
        print(f"✓ Admin login successful")


class TestSearchAPI:
    """Test the global search endpoint"""
    
    def test_search_blog(self):
        """Search for blog content"""
        response = requests.get(f"{BASE_URL}/api/search?q=business")
        assert response.status_code == 200, f"Search failed: {response.text}"
        data = response.json()
        assert "results" in data, "No results key"
        assert "total" in data, "No total key"
        print(f"✓ Search returned {data['total']} results")
    
    def test_search_empty_query(self):
        """Search with empty query returns empty results"""
        response = requests.get(f"{BASE_URL}/api/search?q=")
        assert response.status_code == 200
        data = response.json()
        assert data["results"] == [], "Empty query should return empty results"
        print("✓ Empty search returns empty results")
    
    def test_search_result_structure(self):
        """Verify search result structure"""
        response = requests.get(f"{BASE_URL}/api/search?q=consulting")
        assert response.status_code == 200
        data = response.json()
        if data["results"]:
            result = data["results"][0]
            assert "type" in result, "Missing type field"
            assert "title" in result, "Missing title field"
            assert "url" in result, "Missing url field"
            print(f"✓ Search result has correct structure: {result['type']}")
        else:
            print("✓ Search works (no results for query)")


class TestImageUploadAPI:
    """Test image upload endpoint"""
    
    def test_upload_requires_auth(self):
        """Upload should require admin authentication"""
        # Create a test image
        files = {'file': ('test.jpg', b'\xff\xd8\xff\xe0\x00\x10JFIF', 'image/jpeg')}
        response = requests.post(f"{BASE_URL}/api/upload", files=files)
        assert response.status_code == 401, "Upload should require auth"
        print("✓ Upload correctly requires authentication")
    
    def test_upload_with_auth(self):
        """Upload image with valid auth"""
        token = getattr(TestAuthSetup, 'admin_token', None)
        if not token:
            pytest.skip("No admin token available")
        
        # Create a minimal valid JPEG
        jpeg_bytes = bytes([
            0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,  # JFIF header
            0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
            0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06,
            0x05, 0x08, 0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c,
            0xff, 0xd9  # EOI marker
        ])
        
        files = {'file': ('test_image.jpg', jpeg_bytes, 'image/jpeg')}
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.post(f"{BASE_URL}/api/upload", files=files, headers=headers)
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert "url" in data, "No url in response"
        assert data["url"].startswith("/api/uploads/"), "Invalid URL format"
        print(f"✓ Image uploaded successfully: {data['url']}")
    
    def test_upload_invalid_type(self):
        """Reject non-image files"""
        token = getattr(TestAuthSetup, 'admin_token', None)
        if not token:
            pytest.skip("No admin token available")
        
        files = {'file': ('test.txt', b'hello world', 'text/plain')}
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.post(f"{BASE_URL}/api/upload", files=files, headers=headers)
        assert response.status_code == 400, "Should reject non-image"
        print("✓ Non-image files correctly rejected")


class TestCSVExport:
    """Test CSV export for contacts"""
    
    def test_export_requires_auth(self):
        """CSV export requires admin auth"""
        response = requests.get(f"{BASE_URL}/api/admin/contacts/export")
        assert response.status_code == 401
        print("✓ CSV export correctly requires auth")
    
    def test_export_contacts_csv(self):
        """Export contacts as CSV"""
        token = getattr(TestAuthSetup, 'admin_token', None)
        if not token:
            pytest.skip("No admin token available")
        
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(f"{BASE_URL}/api/admin/contacts/export", headers=headers)
        assert response.status_code == 200, f"Export failed: {response.text}"
        assert 'text/csv' in response.headers.get('Content-Type', '')
        assert 'attachment' in response.headers.get('Content-Disposition', '')
        # Verify CSV has header row
        content = response.text
        assert 'Name' in content or 'name' in content.lower(), "CSV missing header"
        print("✓ CSV export working correctly")


class TestBulkOperations:
    """Test bulk delete and update operations"""
    
    def test_bulk_delete_requires_auth(self):
        """Bulk delete requires admin auth"""
        response = requests.post(f"{BASE_URL}/api/admin/bulk-delete", json={
            "collection": "contacts", "ids": []
        })
        assert response.status_code == 401
        print("✓ Bulk delete correctly requires auth")
    
    def test_bulk_delete_invalid_collection(self):
        """Reject invalid collections"""
        token = getattr(TestAuthSetup, 'admin_token', None)
        if not token:
            pytest.skip("No admin token available")
        
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.post(f"{BASE_URL}/api/admin/bulk-delete", 
            json={"collection": "users", "ids": ["test"]},  # users not in allowed list
            headers=headers
        )
        assert response.status_code == 400
        print("✓ Invalid collections correctly rejected")
    
    def test_bulk_delete_no_ids(self):
        """Reject empty IDs list"""
        token = getattr(TestAuthSetup, 'admin_token', None)
        if not token:
            pytest.skip("No admin token available")
        
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.post(f"{BASE_URL}/api/admin/bulk-delete", 
            json={"collection": "contacts", "ids": []},
            headers=headers
        )
        assert response.status_code == 400
        print("✓ Empty IDs correctly rejected")
    
    def test_bulk_update_requires_auth(self):
        """Bulk update requires admin auth"""
        response = requests.post(f"{BASE_URL}/api/admin/bulk-update", json={
            "collection": "contacts", "ids": [], "update": {}
        })
        assert response.status_code == 401
        print("✓ Bulk update correctly requires auth")


class TestSectionOrderAPI:
    """Test section order management"""
    
    def test_get_section_order_requires_auth(self):
        """Section order GET requires auth"""
        response = requests.get(f"{BASE_URL}/api/admin/section-order")
        assert response.status_code == 401
        print("✓ Section order GET correctly requires auth")
    
    def test_get_section_order(self):
        """Get current section order"""
        token = getattr(TestAuthSetup, 'admin_token', None)
        if not token:
            pytest.skip("No admin token available")
        
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(f"{BASE_URL}/api/admin/section-order", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Section order should be a list"
        assert "hero" in data, "hero section missing"
        assert "contact" in data, "contact section missing"
        print(f"✓ Section order retrieved: {len(data)} sections")
    
    def test_update_section_order(self):
        """Update section order"""
        token = getattr(TestAuthSetup, 'admin_token', None)
        if not token:
            pytest.skip("No admin token available")
        
        headers = {'Authorization': f'Bearer {token}'}
        
        # First get current order
        get_response = requests.get(f"{BASE_URL}/api/admin/section-order", headers=headers)
        original_order = get_response.json()
        
        # Update with same order (safe test)
        response = requests.put(f"{BASE_URL}/api/admin/section-order", 
            json={"order": original_order},
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "order" in data
        print("✓ Section order update working")


class TestSEOAPI:
    """Test SEO meta management"""
    
    def test_get_seo_requires_auth(self):
        """SEO GET requires admin auth"""
        response = requests.get(f"{BASE_URL}/api/admin/seo")
        assert response.status_code == 401
        print("✓ SEO GET correctly requires auth")
    
    def test_get_all_seo(self):
        """Get all SEO entries"""
        token = getattr(TestAuthSetup, 'admin_token', None)
        if not token:
            pytest.skip("No admin token available")
        
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(f"{BASE_URL}/api/admin/seo", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "SEO data should be a list"
        print(f"✓ SEO entries retrieved: {len(data)} entries")
    
    def test_update_seo_entry(self):
        """Update SEO for a page"""
        token = getattr(TestAuthSetup, 'admin_token', None)
        if not token:
            pytest.skip("No admin token available")
        
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.put(f"{BASE_URL}/api/admin/seo//", 
            json={
                "meta_title": "Test Title",
                "meta_description": "Test description",
                "og_image": ""
            },
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("page_path") == "/"
        print("✓ SEO entry update working")
    
    def test_public_seo_endpoint(self):
        """Public SEO endpoint works"""
        response = requests.get(f"{BASE_URL}/api/public/seo//")
        assert response.status_code == 200
        print("✓ Public SEO endpoint accessible")


class TestAnalyticsAPI:
    """Test analytics dashboard API"""
    
    def test_analytics_requires_auth(self):
        """Analytics requires admin auth"""
        response = requests.get(f"{BASE_URL}/api/admin/analytics")
        assert response.status_code == 401
        print("✓ Analytics correctly requires auth")
    
    def test_get_analytics(self):
        """Get analytics data"""
        token = getattr(TestAuthSetup, 'admin_token', None)
        if not token:
            pytest.skip("No admin token available")
        
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(f"{BASE_URL}/api/admin/analytics", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify data structure
        assert "monthly_contacts" in data, "Missing monthly_contacts"
        assert "monthly_revenue" in data, "Missing monthly_revenue"
        assert "content_stats" in data, "Missing content_stats"
        
        # Verify content_stats has expected fields
        cs = data["content_stats"]
        assert "blog_posts" in cs, "Missing blog_posts count"
        assert "total_contacts" in cs, "Missing total_contacts"
        assert "total_users" in cs, "Missing total_users"
        
        print(f"✓ Analytics data retrieved successfully")
        print(f"  - Blog posts: {cs.get('blog_posts', 0)}")
        print(f"  - Total contacts: {cs.get('total_contacts', 0)}")


class TestBlogPagination:
    """Test blog pagination on public API"""
    
    def test_blog_pagination_page1(self):
        """Get first page of blog posts"""
        response = requests.get(f"{BASE_URL}/api/public/blog?page=1&limit=9")
        assert response.status_code == 200
        data = response.json()
        assert "posts" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data
        print(f"✓ Blog pagination working: {data['total']} total posts, page {data['page']}/{data['pages']}")
    
    def test_blog_pagination_with_limit(self):
        """Test different page sizes"""
        response = requests.get(f"{BASE_URL}/api/public/blog?page=1&limit=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data["posts"]) <= 2
        print(f"✓ Blog limit working: got {len(data['posts'])} posts with limit=2")


class TestPublicSections:
    """Test public sections API (for dynamic ordering)"""
    
    def test_get_public_sections(self):
        """Get sections config and order"""
        response = requests.get(f"{BASE_URL}/api/public/sections")
        assert response.status_code == 200
        data = response.json()
        assert "sections" in data or "section_order" in data
        print(f"✓ Public sections API working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
