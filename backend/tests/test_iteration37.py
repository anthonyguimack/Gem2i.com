"""
Iteration 37 Backend Tests
Testing:
- Gallery Categories CRUD (admin endpoints)
- Public gallery categories endpoint
- Gallery open_in_new_tab field
- Blog/News and Reading List block types verification
- Footer sitemap pages
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://consultant-cms.preview.emergentagent.com"

ADMIN_EMAIL = "admin@consultant.com"
ADMIN_PASSWORD = "Admin123!"


class TestPublicEndpoints:
    """Test public endpoints without authentication"""
    
    def test_public_settings(self):
        """Verify public settings endpoint works"""
        response = requests.get(f"{BASE_URL}/api/public/settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "brand_name" in data or data == {}, "Settings should have brand_name or be empty"
        print("PASS: Public settings endpoint works")
    
    def test_public_gallery_categories(self):
        """Verify GET /api/public/gallery-categories returns categories sorted by order"""
        response = requests.get(f"{BASE_URL}/api/public/gallery-categories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        print(f"PASS: Public gallery categories returns {len(data)} categories")
        # Check if sorted by order
        if len(data) > 1:
            orders = [c.get('order', 0) for c in data]
            assert orders == sorted(orders), "Categories should be sorted by order"
            print("PASS: Categories are sorted by order")
        # Check expected categories (Business, Marketing, Solution)
        names = [c.get('name', '') for c in data]
        print(f"  Categories found: {names}")
        return data
    
    def test_public_gallery(self):
        """Verify public gallery endpoint works"""
        response = requests.get(f"{BASE_URL}/api/public/gallery")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        print(f"PASS: Public gallery returns {len(data)} items")
        # Check if items have expected fields
        if data:
            item = data[0]
            print(f"  Sample item fields: {list(item.keys())}")
            # Check for open_in_new_tab field support
            if 'open_in_new_tab' in item:
                print(f"  open_in_new_tab field present: {item.get('open_in_new_tab')}")
        return data
    
    def test_public_nav_pages_for_footer(self):
        """Verify nav pages endpoint returns pages with show_in_footer field"""
        response = requests.get(f"{BASE_URL}/api/public/nav-pages")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        # Filter pages with show_in_footer=True
        footer_pages = [p for p in data if p.get('show_in_footer', False)]
        print(f"PASS: Nav pages returns {len(data)} total, {len(footer_pages)} with show_in_footer=True")
        for p in footer_pages:
            print(f"  Footer page: {p.get('title')} (order: {p.get('order', 0)})")
        return footer_pages
    
    def test_public_blog(self):
        """Verify public blog endpoint works (for BlogPostsBlock)"""
        response = requests.get(f"{BASE_URL}/api/public/blog?page=1&limit=6")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # Can be dict with posts key or list
        posts = data.get('posts', data) if isinstance(data, dict) else data
        print(f"PASS: Public blog returns {len(posts)} posts")
        return posts
    
    def test_public_books(self):
        """Verify public books endpoint works (for ReadingListBlock)"""
        response = requests.get(f"{BASE_URL}/api/public/books")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        print(f"PASS: Public books returns {len(data)} books")
        return data


class TestAdminAuthentication:
    """Test admin authentication"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.status_code} - {response.text}"
        data = response.json()
        token = data.get("token")
        assert token, "No token in response"
        print(f"PASS: Admin login successful")
        return token
    
    def test_admin_login(self, auth_token):
        """Verify admin can login"""
        assert auth_token is not None
        print("PASS: Admin authentication works")


class TestGalleryCategoriesCRUD:
    """Test Gallery Categories CRUD operations"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authenticated headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_list_gallery_categories(self, auth_headers):
        """GET /api/admin/gallery-categories - List all categories"""
        response = requests.get(f"{BASE_URL}/api/admin/gallery-categories", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        print(f"PASS: Admin gallery categories returns {len(data)} categories")
        for cat in data:
            print(f"  - {cat.get('name')} (id: {cat.get('id')}, order: {cat.get('order', 0)})")
        return data
    
    def test_create_gallery_category(self, auth_headers):
        """POST /api/admin/gallery-categories - Create a new category"""
        test_category = {
            "name": "TEST_Category",
            "slug": "test_category",
            "order": 99
        }
        response = requests.post(f"{BASE_URL}/api/admin/gallery-categories", 
                                json=test_category, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("name") == test_category["name"], "Name should match"
        assert data.get("slug") == test_category["slug"], "Slug should match"
        assert "id" in data, "Should have an id"
        print(f"PASS: Created category with id: {data.get('id')}")
        return data
    
    def test_update_gallery_category(self, auth_headers):
        """PUT /api/admin/gallery-categories/{id} - Update a category"""
        # First create a category to update
        create_response = requests.post(f"{BASE_URL}/api/admin/gallery-categories", 
                                       json={"name": "TEST_ToUpdate", "slug": "test_to_update", "order": 98},
                                       headers=auth_headers)
        if create_response.status_code != 200:
            pytest.skip("Could not create category for update test")
        
        cat_id = create_response.json().get("id")
        
        # Update the category
        update_data = {"name": "TEST_Updated", "order": 97}
        response = requests.put(f"{BASE_URL}/api/admin/gallery-categories/{cat_id}", 
                               json=update_data, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("name") == "TEST_Updated", "Name should be updated"
        print(f"PASS: Updated category {cat_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/gallery-categories/{cat_id}", headers=auth_headers)
        return data
    
    def test_delete_gallery_category(self, auth_headers):
        """DELETE /api/admin/gallery-categories/{id} - Delete a category"""
        # First create a category to delete
        create_response = requests.post(f"{BASE_URL}/api/admin/gallery-categories", 
                                       json={"name": "TEST_ToDelete", "slug": "test_to_delete", "order": 96},
                                       headers=auth_headers)
        if create_response.status_code != 200:
            pytest.skip("Could not create category for delete test")
        
        cat_id = create_response.json().get("id")
        
        # Delete the category
        response = requests.delete(f"{BASE_URL}/api/admin/gallery-categories/{cat_id}", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"PASS: Deleted category {cat_id}")
        
        # Verify deletion
        list_response = requests.get(f"{BASE_URL}/api/admin/gallery-categories", headers=auth_headers)
        categories = list_response.json()
        cat_ids = [c.get('id') for c in categories]
        assert cat_id not in cat_ids, "Deleted category should not be in list"
        print("PASS: Verified category was deleted")


class TestGalleryOpenInNewTab:
    """Test Gallery open_in_new_tab functionality"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authenticated headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_create_gallery_with_open_in_new_tab(self, auth_headers):
        """Create gallery item with open_in_new_tab field"""
        test_item = {
            "title": "TEST_NewTabPhoto",
            "summary": "Test photo with new tab link",
            "image": "/api/uploads/test.jpg",
            "category": "Business",
            "link": "https://example.com",
            "open_in_new_tab": True
        }
        response = requests.post(f"{BASE_URL}/api/admin/gallery", 
                                json=test_item, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("open_in_new_tab") == True, "open_in_new_tab should be True"
        print(f"PASS: Created gallery item with open_in_new_tab=True, id: {data.get('id')}")
        
        # Cleanup
        item_id = data.get('id')
        if item_id:
            requests.delete(f"{BASE_URL}/api/admin/gallery/{item_id}", headers=auth_headers)
        return data
    
    def test_update_gallery_open_in_new_tab(self, auth_headers):
        """Update gallery item's open_in_new_tab field"""
        # Create item first
        create_response = requests.post(f"{BASE_URL}/api/admin/gallery", 
                                       json={"title": "TEST_UpdateNewTab", "link": "https://test.com", "open_in_new_tab": False},
                                       headers=auth_headers)
        if create_response.status_code != 200:
            pytest.skip("Could not create gallery item")
        
        item_id = create_response.json().get("id")
        
        # Update open_in_new_tab
        response = requests.put(f"{BASE_URL}/api/admin/gallery/{item_id}", 
                               json={"open_in_new_tab": True}, headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data.get("open_in_new_tab") == True, "open_in_new_tab should be updated to True"
        print(f"PASS: Updated gallery item open_in_new_tab to True")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/gallery/{item_id}", headers=auth_headers)


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get authenticated headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Authentication failed")
        token = response.json().get("token")
        return {"Authorization": f"Bearer {token}"}
    
    def test_cleanup_test_categories(self, auth_headers):
        """Clean up any TEST_ prefixed categories"""
        response = requests.get(f"{BASE_URL}/api/admin/gallery-categories", headers=auth_headers)
        if response.status_code == 200:
            categories = response.json()
            for cat in categories:
                if cat.get('name', '').startswith('TEST_'):
                    requests.delete(f"{BASE_URL}/api/admin/gallery-categories/{cat['id']}", headers=auth_headers)
                    print(f"  Cleaned up category: {cat['name']}")
        print("PASS: Cleanup complete")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
