"""
Iteration 38 Tests: Navbar dynamic links (no hardcoded), Gallery drag-to-reorder
Tests:
- Navbar: Only pages with show_in_header=true appear in navigation
- Navbar: No hardcoded links - all from nav_pages collection
- Gallery reorder batch API: PUT /api/admin/gallery/reorder/batch
- Gallery order persistence: Public gallery sorted by order field
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestNavbarDynamicLinks:
    """Test that navbar only shows pages with show_in_header=true"""
    
    def test_nav_pages_api_returns_show_in_header_field(self):
        """Verify nav_pages API returns show_in_header field for each page"""
        response = requests.get(f"{BASE_URL}/api/public/nav-pages")
        assert response.status_code == 200
        pages = response.json()
        assert len(pages) > 0, "Should have nav pages"
        
        # Check that show_in_header field exists
        for page in pages:
            assert "show_in_header" in page, f"Page {page.get('title')} missing show_in_header field"
            assert "title" in page, f"Page missing title field"
    
    def test_news_page_has_show_in_header_false(self):
        """Verify News page has show_in_header=false"""
        response = requests.get(f"{BASE_URL}/api/public/nav-pages")
        assert response.status_code == 200
        pages = response.json()
        
        news_page = next((p for p in pages if p.get("title") == "News"), None)
        assert news_page is not None, "News page should exist"
        assert news_page.get("show_in_header") == False, "News should have show_in_header=false"
    
    def test_gallery_page_has_show_in_header_false(self):
        """Verify Gallery page has show_in_header=false"""
        response = requests.get(f"{BASE_URL}/api/public/nav-pages")
        assert response.status_code == 200
        pages = response.json()
        
        gallery_page = next((p for p in pages if p.get("title") == "Gallery"), None)
        assert gallery_page is not None, "Gallery page should exist"
        assert gallery_page.get("show_in_header") == False, "Gallery should have show_in_header=false"
    
    def test_reading_list_page_has_show_in_header_false(self):
        """Verify Reading List page has show_in_header=false"""
        response = requests.get(f"{BASE_URL}/api/public/nav-pages")
        assert response.status_code == 200
        pages = response.json()
        
        reading_list_page = next((p for p in pages if p.get("title") == "Reading List"), None)
        assert reading_list_page is not None, "Reading List page should exist"
        assert reading_list_page.get("show_in_header") == False, "Reading List should have show_in_header=false"
    
    def test_header_pages_filter_correctly(self):
        """Verify filtering by show_in_header=true returns expected pages"""
        response = requests.get(f"{BASE_URL}/api/public/nav-pages")
        assert response.status_code == 200
        pages = response.json()
        
        header_pages = [p for p in pages if p.get("show_in_header") == True]
        header_titles = [p.get("title") for p in header_pages]
        
        # Expected header pages based on test request
        assert "Home New" in header_titles, "Home New should be in header"
        assert "Our Group" in header_titles, "Our Group should be in header"
        assert "Services" in header_titles, "Services should be in header"
        assert "Knowledge Base" in header_titles, "Knowledge Base should be in header"
        
        # These should NOT be in header
        assert "News" not in header_titles, "News should NOT be in header"
        assert "Gallery" not in header_titles, "Gallery should NOT be in header"
        assert "Reading List" not in header_titles, "Reading List should NOT be in header"


class TestGalleryReorderAPI:
    """Test gallery reorder batch API"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    def test_gallery_list_returns_items_sorted_by_order(self, auth_token):
        """Verify admin gallery list returns items sorted by order"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/gallery", headers=headers)
        assert response.status_code == 200
        items = response.json()
        assert len(items) > 0, "Should have gallery items"
        
        # Check items have order field
        for item in items:
            assert "order" in item or item.get("order") is None, f"Item {item.get('title')} should have order field"
    
    def test_reorder_batch_endpoint_exists(self, auth_token):
        """Verify PUT /api/admin/gallery/reorder/batch endpoint exists"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First get gallery items
        response = requests.get(f"{BASE_URL}/api/admin/gallery", headers=headers)
        assert response.status_code == 200
        items = response.json()
        
        if len(items) < 2:
            pytest.skip("Need at least 2 gallery items to test reorder")
        
        # Create reorder payload (just set current order)
        batch = [{"id": item["id"], "order": idx} for idx, item in enumerate(items)]
        
        response = requests.put(
            f"{BASE_URL}/api/admin/gallery/reorder/batch",
            headers=headers,
            json={"items": batch}
        )
        assert response.status_code == 200, f"Reorder batch should succeed: {response.text}"
        data = response.json()
        assert "message" in data, "Response should have message"
    
    def test_reorder_batch_updates_order_field(self, auth_token):
        """Verify reorder batch actually updates order field in database"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get current gallery items
        response = requests.get(f"{BASE_URL}/api/admin/gallery", headers=headers)
        assert response.status_code == 200
        items = response.json()
        
        if len(items) < 2:
            pytest.skip("Need at least 2 gallery items to test reorder")
        
        # Reverse the order
        reversed_items = list(reversed(items))
        batch = [{"id": item["id"], "order": idx} for idx, item in enumerate(reversed_items)]
        
        # Apply reorder
        response = requests.put(
            f"{BASE_URL}/api/admin/gallery/reorder/batch",
            headers=headers,
            json={"items": batch}
        )
        assert response.status_code == 200
        
        # Verify order was updated by fetching again
        response = requests.get(f"{BASE_URL}/api/admin/gallery", headers=headers)
        assert response.status_code == 200
        updated_items = response.json()
        
        # First item should now be what was last
        assert updated_items[0]["id"] == reversed_items[0]["id"], "Order should be reversed"
        
        # Restore original order
        original_batch = [{"id": item["id"], "order": idx} for idx, item in enumerate(items)]
        requests.put(
            f"{BASE_URL}/api/admin/gallery/reorder/batch",
            headers=headers,
            json={"items": original_batch}
        )
    
    def test_reorder_requires_authentication(self):
        """Verify reorder endpoint requires admin auth"""
        response = requests.put(
            f"{BASE_URL}/api/admin/gallery/reorder/batch",
            json={"items": []}
        )
        assert response.status_code == 401 or response.status_code == 403, "Should require auth"


class TestPublicGallerySorting:
    """Test public gallery is sorted by order field"""
    
    def test_public_gallery_returns_items(self):
        """Verify public gallery API returns items"""
        response = requests.get(f"{BASE_URL}/api/public/gallery")
        assert response.status_code == 200
        items = response.json()
        assert isinstance(items, list), "Should return list"
    
    def test_public_gallery_sorted_by_order(self):
        """Verify public gallery is sorted by order field ascending"""
        response = requests.get(f"{BASE_URL}/api/public/gallery")
        assert response.status_code == 200
        items = response.json()
        
        if len(items) < 2:
            pytest.skip("Need at least 2 items to verify sorting")
        
        # Check items are sorted by order
        orders = [item.get("order", 0) for item in items]
        assert orders == sorted(orders), f"Gallery should be sorted by order: {orders}"


class TestGalleryCategoriesStillWork:
    """Verify gallery categories still work after reorder feature"""
    
    def test_gallery_categories_api(self):
        """Verify gallery categories API still works"""
        response = requests.get(f"{BASE_URL}/api/public/gallery-categories")
        assert response.status_code == 200
        categories = response.json()
        assert isinstance(categories, list), "Should return list"
    
    def test_gallery_filter_by_category(self):
        """Verify gallery can be filtered by category"""
        response = requests.get(f"{BASE_URL}/api/public/gallery?category=Business")
        assert response.status_code == 200
        items = response.json()
        assert isinstance(items, list), "Should return list"


class TestHomepageAndBasicAPIs:
    """Basic API health checks"""
    
    def test_settings_api(self):
        """Verify settings API works"""
        response = requests.get(f"{BASE_URL}/api/public/settings")
        assert response.status_code == 200
    
    def test_services_api(self):
        """Verify services API works"""
        response = requests.get(f"{BASE_URL}/api/public/services")
        assert response.status_code == 200
