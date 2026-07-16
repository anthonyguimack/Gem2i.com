"""
Iteration 39 Backend Tests
Testing 6 bug fixes:
1. Rich Text Editor - text alignment options (frontend only)
2. Reading List Block - book detail modal (frontend only)
3. Page Delete - persistence (seedSystemPages no longer auto-runs)
4. Blog Categories - CRUD with select dropdown
5. Gallery Categories - sorted A→Z
6. Homepage News Links - using slug instead of id
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
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed")

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Auth headers for admin requests"""
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestBlogCategoriesCRUD:
    """Test blog categories CRUD endpoints - Issue #4"""
    
    def test_get_blog_categories_sorted_az(self, auth_headers):
        """GET /api/admin/blog-categories returns categories sorted A→Z by name"""
        response = requests.get(f"{BASE_URL}/api/admin/blog-categories", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        categories = response.json()
        assert isinstance(categories, list), "Expected list of categories"
        
        # Verify A→Z sorting
        if len(categories) >= 2:
            names = [c.get("name", "") for c in categories]
            sorted_names = sorted(names, key=str.lower)
            assert names == sorted_names, f"Categories not sorted A→Z: {names}"
        print(f"Blog categories (sorted A→Z): {[c.get('name') for c in categories]}")
    
    def test_create_blog_category(self, auth_headers):
        """POST /api/admin/blog-categories creates a new category"""
        response = requests.post(f"{BASE_URL}/api/admin/blog-categories", 
            headers=auth_headers,
            json={"name": "TEST_ZZZ_Category"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "id" in data, "Response should contain id"
        assert data.get("name") == "TEST_ZZZ_Category"
        print(f"Created blog category: {data}")
        return data.get("id")
    
    def test_update_blog_category(self, auth_headers):
        """PUT /api/admin/blog-categories/{id} updates a category"""
        # First create a category
        create_resp = requests.post(f"{BASE_URL}/api/admin/blog-categories",
            headers=auth_headers,
            json={"name": "TEST_Update_Category"})
        assert create_resp.status_code == 200
        cat_id = create_resp.json().get("id")
        
        # Update it
        update_resp = requests.put(f"{BASE_URL}/api/admin/blog-categories/{cat_id}",
            headers=auth_headers,
            json={"name": "TEST_Updated_Category"})
        assert update_resp.status_code == 200, f"Expected 200, got {update_resp.status_code}"
        data = update_resp.json()
        assert data.get("name") == "TEST_Updated_Category"
        print(f"Updated blog category: {data}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/blog-categories/{cat_id}", headers=auth_headers)
    
    def test_delete_blog_category(self, auth_headers):
        """DELETE /api/admin/blog-categories/{id} deletes a category"""
        # First create a category
        create_resp = requests.post(f"{BASE_URL}/api/admin/blog-categories",
            headers=auth_headers,
            json={"name": "TEST_Delete_Category"})
        assert create_resp.status_code == 200
        cat_id = create_resp.json().get("id")
        
        # Delete it
        delete_resp = requests.delete(f"{BASE_URL}/api/admin/blog-categories/{cat_id}",
            headers=auth_headers)
        assert delete_resp.status_code == 200, f"Expected 200, got {delete_resp.status_code}"
        
        # Verify it's gone
        get_resp = requests.get(f"{BASE_URL}/api/admin/blog-categories", headers=auth_headers)
        categories = get_resp.json()
        cat_ids = [c.get("id") for c in categories]
        assert cat_id not in cat_ids, "Category should be deleted"
        print(f"Deleted blog category: {cat_id}")


class TestGalleryCategoriesSorting:
    """Test gallery categories A→Z sorting - Issue #5"""
    
    def test_admin_gallery_categories_sorted_az(self, auth_headers):
        """GET /api/admin/gallery-categories returns categories sorted A→Z"""
        response = requests.get(f"{BASE_URL}/api/admin/gallery-categories", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        categories = response.json()
        assert isinstance(categories, list), "Expected list of categories"
        
        # Verify A→Z sorting
        if len(categories) >= 2:
            names = [c.get("name", "") for c in categories]
            sorted_names = sorted(names, key=str.lower)
            assert names == sorted_names, f"Admin gallery categories not sorted A→Z: {names}"
        print(f"Admin gallery categories (sorted A→Z): {[c.get('name') for c in categories]}")
    
    def test_public_gallery_categories_sorted_az(self):
        """GET /api/public/gallery-categories returns categories sorted A→Z"""
        response = requests.get(f"{BASE_URL}/api/public/gallery-categories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        categories = response.json()
        assert isinstance(categories, list), "Expected list of categories"
        
        # Verify A→Z sorting
        if len(categories) >= 2:
            names = [c.get("name", "") for c in categories]
            sorted_names = sorted(names, key=str.lower)
            assert names == sorted_names, f"Public gallery categories not sorted A→Z: {names}"
        print(f"Public gallery categories (sorted A→Z): {[c.get('name') for c in categories]}")


class TestBlogPostsWithSlug:
    """Test blog posts have slug field for homepage links - Issue #6"""
    
    def test_blog_posts_have_slug(self):
        """GET /api/public/blog returns posts with slug field"""
        response = requests.get(f"{BASE_URL}/api/public/blog")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        posts = data.get("posts", [])
        
        for post in posts:
            assert "slug" in post, f"Post {post.get('id')} missing slug field"
            assert post.get("slug"), f"Post {post.get('title')} has empty slug"
            print(f"Post '{post.get('title')}' has slug: {post.get('slug')}")
    
    def test_blog_detail_by_slug(self):
        """GET /api/public/blog/{slug} returns post by slug"""
        # First get a post to get its slug
        list_resp = requests.get(f"{BASE_URL}/api/public/blog")
        assert list_resp.status_code == 200
        posts = list_resp.json().get("posts", [])
        
        if not posts:
            pytest.skip("No blog posts to test")
        
        slug = posts[0].get("slug")
        assert slug, "First post should have a slug"
        
        # Get by slug
        detail_resp = requests.get(f"{BASE_URL}/api/public/blog/{slug}")
        assert detail_resp.status_code == 200, f"Expected 200, got {detail_resp.status_code}"
        post = detail_resp.json()
        assert post.get("slug") == slug
        print(f"Successfully fetched post by slug: {slug}")


class TestPageDeletion:
    """Test page deletion persistence - Issue #3"""
    
    def test_seed_system_pages_endpoint_exists(self, auth_headers):
        """POST /api/admin/seed-system-pages endpoint exists"""
        response = requests.post(f"{BASE_URL}/api/admin/seed-system-pages", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "seeded" in data, "Response should contain 'seeded' count"
        print(f"Seed system pages response: {data}")
    
    def test_delete_page_persists(self, auth_headers):
        """Deleted pages should not reappear after refresh"""
        # Create a test page
        create_resp = requests.post(f"{BASE_URL}/api/admin/nav-pages",
            headers=auth_headers,
            json={
                "title": "TEST_Delete_Page",
                "url": "/test-delete-page",
                "show_in_header": False,
                "show_in_footer": False,
                "order": 999
            })
        assert create_resp.status_code == 200, f"Failed to create page: {create_resp.text}"
        page_id = create_resp.json().get("id")
        
        # Delete the page
        delete_resp = requests.delete(f"{BASE_URL}/api/admin/nav-pages/{page_id}", headers=auth_headers)
        assert delete_resp.status_code == 200, f"Failed to delete page: {delete_resp.text}"
        
        # Verify it's gone
        list_resp = requests.get(f"{BASE_URL}/api/admin/nav-pages", headers=auth_headers)
        pages = list_resp.json()
        page_ids = [p.get("id") for p in pages]
        assert page_id not in page_ids, "Deleted page should not exist"
        
        # Call seed-system-pages (simulating what used to happen on mount)
        seed_resp = requests.post(f"{BASE_URL}/api/admin/seed-system-pages", headers=auth_headers)
        assert seed_resp.status_code == 200
        
        # Verify the test page is still gone (it wasn't a system page)
        list_resp2 = requests.get(f"{BASE_URL}/api/admin/nav-pages", headers=auth_headers)
        pages2 = list_resp2.json()
        page_ids2 = [p.get("id") for p in pages2]
        assert page_id not in page_ids2, "Deleted page should still be gone after seed"
        print("Page deletion persistence verified")


class TestBooksAPI:
    """Test books API for reading list modal - Issue #2"""
    
    def test_get_books(self):
        """GET /api/public/books returns books with all required fields"""
        response = requests.get(f"{BASE_URL}/api/public/books")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        books = response.json()
        assert isinstance(books, list), "Expected list of books"
        
        if books:
            book = books[0]
            # Check for fields needed by BookDetailModal
            expected_fields = ["id", "title", "author"]
            for field in expected_fields:
                assert field in book, f"Book missing required field: {field}"
            
            # Optional fields that modal displays
            optional_fields = ["description", "synopsis", "who_is_it_for", "about_author", "amazon_link", "image"]
            present_optional = [f for f in optional_fields if f in book]
            print(f"Book '{book.get('title')}' has fields: {list(book.keys())}")
            print(f"Optional fields present: {present_optional}")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_categories(self, auth_headers):
        """Remove TEST_ prefixed blog categories"""
        response = requests.get(f"{BASE_URL}/api/admin/blog-categories", headers=auth_headers)
        if response.status_code == 200:
            categories = response.json()
            for cat in categories:
                if cat.get("name", "").startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/admin/blog-categories/{cat['id']}", headers=auth_headers)
                    print(f"Cleaned up category: {cat.get('name')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
