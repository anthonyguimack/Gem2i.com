"""
Test suite for Visual Page Builder CMS features
Tests: Admin Pages Manager, Layout selection, Zone-based blocks, CRUD operations
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@consultant.com",
        "password": "Admin123!"
    })
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]

@pytest.fixture(scope="module")
def auth_headers(auth_token):
    """Headers with auth token"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }

class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """Test admin can login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
        print("PASS: Admin login successful")

    def test_admin_login_invalid_credentials(self):
        """Test login fails with wrong credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "wrongpassword"
        })
        assert response.status_code in [401, 400]
        print("PASS: Invalid credentials rejected")


class TestNavPagesAPI:
    """Nav Pages CRUD API tests"""
    
    def test_list_nav_pages(self, auth_headers):
        """Test listing all nav pages"""
        response = requests.get(f"{BASE_URL}/api/admin/nav-pages", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Listed {len(data)} nav pages")

    def test_create_page_with_default_layout(self, auth_headers):
        """Test creating a page with default layout (no layout specified)"""
        test_id = str(uuid.uuid4())[:8]
        page_data = {
            "title": f"TEST_Default_Page_{test_id}",
            "url": f"/test-default-{test_id}",
            "show_in_header": False,
            "show_in_footer": False,
            "content": "<p>Test content for default layout</p>",
            "layout": ""  # Default layout
        }
        response = requests.post(f"{BASE_URL}/api/admin/nav-pages", headers=auth_headers, json=page_data)
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == page_data["title"]
        assert data["url"] == page_data["url"]
        assert "id" in data
        print(f"PASS: Created default layout page with id: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/nav-pages/{data['id']}", headers=auth_headers)

    def test_create_page_with_builder_layout_and_zones(self, auth_headers):
        """Test creating a page with builder layout (split_screen) and zones with blocks"""
        test_id = str(uuid.uuid4())[:8]
        page_data = {
            "title": f"TEST_Builder_Page_{test_id}",
            "url": f"/test-builder-{test_id}",
            "show_in_header": False,
            "show_in_footer": False,
            "layout": "split_screen",  # Builder layout with left/right zones
            "zones": {
                "left": [
                    {
                        "id": f"block_{uuid.uuid4().hex[:8]}",
                        "type": "rich_text",
                        "order": 0,
                        "config": {"content": "<h2>Left Column</h2><p>This is the left side content.</p>"}
                    }
                ],
                "right": [
                    {
                        "id": f"block_{uuid.uuid4().hex[:8]}",
                        "type": "image",
                        "order": 0,
                        "config": {"src": "/api/uploads/test.jpg", "alt": "Test image", "caption": "Test caption"}
                    },
                    {
                        "id": f"block_{uuid.uuid4().hex[:8]}",
                        "type": "button",
                        "order": 1,
                        "config": {"text": "Click Me", "url": "/contact", "style": "primary", "open_in_new_tab": False}
                    }
                ]
            }
        }
        response = requests.post(f"{BASE_URL}/api/admin/nav-pages", headers=auth_headers, json=page_data)
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == page_data["title"]
        assert data["layout"] == "split_screen"
        assert "zones" in data
        assert "left" in data["zones"]
        assert "right" in data["zones"]
        assert len(data["zones"]["left"]) == 1
        assert len(data["zones"]["right"]) == 2
        print(f"PASS: Created builder layout page with zones, id: {data['id']}")
        
        # Verify GET returns the same data
        get_response = requests.get(f"{BASE_URL}/api/admin/nav-pages", headers=auth_headers)
        pages = get_response.json()
        created_page = next((p for p in pages if p["id"] == data["id"]), None)
        assert created_page is not None
        assert created_page["zones"]["left"][0]["type"] == "rich_text"
        print("PASS: Verified zones data persisted correctly")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/nav-pages/{data['id']}", headers=auth_headers)

    def test_create_page_with_legacy_layout(self, auth_headers):
        """Test creating a page with legacy layout (layout_1 - About/Bio)"""
        test_id = str(uuid.uuid4())[:8]
        page_data = {
            "title": f"TEST_Legacy_Page_{test_id}",
            "url": f"/test-legacy-{test_id}",
            "show_in_header": False,
            "show_in_footer": False,
            "layout": "layout_1",  # Legacy About/Bio layout
            "layout_image": "/api/uploads/bio-image.jpg",
            "content": "<p>Additional content for legacy layout</p>"
        }
        response = requests.post(f"{BASE_URL}/api/admin/nav-pages", headers=auth_headers, json=page_data)
        assert response.status_code == 200
        data = response.json()
        assert data["layout"] == "layout_1"
        assert data["layout_image"] == page_data["layout_image"]
        print(f"PASS: Created legacy layout page with id: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/nav-pages/{data['id']}", headers=auth_headers)

    def test_update_page_with_zones(self, auth_headers):
        """Test updating a page's zones via PUT"""
        test_id = str(uuid.uuid4())[:8]
        # Create page first
        page_data = {
            "title": f"TEST_Update_Page_{test_id}",
            "url": f"/test-update-{test_id}",
            "layout": "full_width",
            "zones": {"main": []}
        }
        create_response = requests.post(f"{BASE_URL}/api/admin/nav-pages", headers=auth_headers, json=page_data)
        assert create_response.status_code == 200
        page_id = create_response.json()["id"]
        
        # Update with blocks
        update_data = {
            **page_data,
            "zones": {
                "main": [
                    {"id": f"block_{uuid.uuid4().hex[:8]}", "type": "rich_text", "order": 0, "config": {"content": "<p>Updated content</p>"}},
                    {"id": f"block_{uuid.uuid4().hex[:8]}", "type": "separator", "order": 1, "config": {"style": "line"}},
                    {"id": f"block_{uuid.uuid4().hex[:8]}", "type": "service_list", "order": 2, "config": {}}
                ]
            }
        }
        update_response = requests.put(f"{BASE_URL}/api/admin/nav-pages/{page_id}", headers=auth_headers, json=update_data)
        assert update_response.status_code == 200
        updated = update_response.json()
        assert len(updated["zones"]["main"]) == 3
        assert updated["zones"]["main"][0]["type"] == "rich_text"
        assert updated["zones"]["main"][1]["type"] == "separator"
        assert updated["zones"]["main"][2]["type"] == "service_list"
        print(f"PASS: Updated page zones successfully")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/nav-pages/{page_id}", headers=auth_headers)

    def test_delete_page(self, auth_headers):
        """Test deleting a page"""
        test_id = str(uuid.uuid4())[:8]
        page_data = {
            "title": f"TEST_Delete_Page_{test_id}",
            "url": f"/test-delete-{test_id}",
            "layout": "boxed"
        }
        create_response = requests.post(f"{BASE_URL}/api/admin/nav-pages", headers=auth_headers, json=page_data)
        page_id = create_response.json()["id"]
        
        delete_response = requests.delete(f"{BASE_URL}/api/admin/nav-pages/{page_id}", headers=auth_headers)
        assert delete_response.status_code == 200
        
        # Verify deleted
        list_response = requests.get(f"{BASE_URL}/api/admin/nav-pages", headers=auth_headers)
        pages = list_response.json()
        assert not any(p["id"] == page_id for p in pages)
        print("PASS: Page deleted successfully")


class TestAllBuilderLayouts:
    """Test all 14 builder layouts can be created"""
    
    BUILDER_LAYOUTS = [
        ("full_width", ["main"]),
        ("boxed", ["main"]),
        ("split_screen", ["left", "right"]),
        ("grid", ["cell_1", "cell_2", "cell_3", "cell_4"]),
        ("masonry", ["main"]),
        ("list", ["main"]),
        ("carousel", ["main"]),
        ("two_column", ["main", "sidebar"]),
        ("three_column", ["col_1", "col_2", "col_3"]),
        ("profile", ["sidebar", "main"]),
        ("card_based", ["main"]),
        ("hero_banner", ["hero", "main"]),
        ("sidebar_layout", ["sidebar", "main"]),
        ("landing", ["hero", "features", "cta"]),
    ]
    
    @pytest.mark.parametrize("layout,zones", BUILDER_LAYOUTS)
    def test_create_builder_layout(self, auth_headers, layout, zones):
        """Test creating page with each builder layout"""
        test_id = str(uuid.uuid4())[:8]
        zones_data = {zone: [] for zone in zones}
        page_data = {
            "title": f"TEST_{layout}_{test_id}",
            "url": f"/test-{layout}-{test_id}",
            "layout": layout,
            "zones": zones_data
        }
        response = requests.post(f"{BASE_URL}/api/admin/nav-pages", headers=auth_headers, json=page_data)
        assert response.status_code == 200, f"Failed to create {layout} layout: {response.text}"
        data = response.json()
        assert data["layout"] == layout
        print(f"PASS: Created {layout} layout page")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/nav-pages/{data['id']}", headers=auth_headers)


class TestAllBlockTypes:
    """Test all 9 block types can be saved"""
    
    BLOCK_CONFIGS = [
        ("rich_text", {"content": "<p>Test rich text content</p>"}),
        ("image", {"src": "/api/uploads/test.jpg", "alt": "Test", "caption": "Caption", "link": ""}),
        ("video", {"url": "https://youtube.com/watch?v=test123"}),
        ("service_list", {}),
        ("gallery", {}),
        ("profile_card", {"name": "John Doe", "title": "CEO", "image": "", "bio": "Test bio"}),
        ("button", {"text": "Click", "url": "/test", "style": "primary", "open_in_new_tab": False}),
        ("separator", {"style": "line"}),
        ("custom_html", {"html": "<div class='custom'>Custom HTML</div>"}),
    ]
    
    @pytest.mark.parametrize("block_type,config", BLOCK_CONFIGS)
    def test_save_block_type(self, auth_headers, block_type, config):
        """Test saving each block type in a page"""
        test_id = str(uuid.uuid4())[:8]
        page_data = {
            "title": f"TEST_Block_{block_type}_{test_id}",
            "url": f"/test-block-{block_type}-{test_id}",
            "layout": "full_width",
            "zones": {
                "main": [{
                    "id": f"block_{uuid.uuid4().hex[:8]}",
                    "type": block_type,
                    "order": 0,
                    "config": config
                }]
            }
        }
        response = requests.post(f"{BASE_URL}/api/admin/nav-pages", headers=auth_headers, json=page_data)
        assert response.status_code == 200, f"Failed to save {block_type} block: {response.text}"
        data = response.json()
        assert data["zones"]["main"][0]["type"] == block_type
        assert data["zones"]["main"][0]["config"] == config
        print(f"PASS: Saved {block_type} block successfully")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/nav-pages/{data['id']}", headers=auth_headers)


class TestPublicPageRendering:
    """Test public page rendering endpoints"""
    
    def test_public_nav_pages_list(self):
        """Test public nav pages endpoint"""
        response = requests.get(f"{BASE_URL}/api/public/nav-pages")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Public nav pages returns {len(data)} pages")

    def test_public_services_endpoint(self):
        """Test services endpoint for ServiceList block"""
        response = requests.get(f"{BASE_URL}/api/public/services")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Services endpoint returns {len(data)} services")

    def test_public_gallery_albums_endpoint(self):
        """Test gallery albums endpoint for Gallery block"""
        response = requests.get(f"{BASE_URL}/api/public/gallery-albums")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Gallery albums endpoint returns {len(data)} albums")


class TestServiceReadMoreLinks:
    """Test service detail pages for Read More links"""
    
    def test_service_detail_endpoint(self):
        """Test service detail endpoint exists"""
        # First get services list
        list_response = requests.get(f"{BASE_URL}/api/public/services")
        services = list_response.json()
        
        if services:
            service_id = services[0]["id"]
            detail_response = requests.get(f"{BASE_URL}/api/public/services/{service_id}")
            assert detail_response.status_code == 200
            data = detail_response.json()
            assert "id" in data
            assert "title" in data
            print(f"PASS: Service detail endpoint works for id: {service_id}")
        else:
            print("SKIP: No services to test detail endpoint")


class TestLegacyLayouts:
    """Test legacy layout pages"""
    
    LEGACY_LAYOUTS = ["layout_1", "layout_2", "layout_3", "layout_5"]
    
    @pytest.mark.parametrize("layout", LEGACY_LAYOUTS)
    def test_create_legacy_layout(self, auth_headers, layout):
        """Test creating page with legacy layout"""
        test_id = str(uuid.uuid4())[:8]
        page_data = {
            "title": f"TEST_Legacy_{layout}_{test_id}",
            "url": f"/test-legacy-{layout}-{test_id}",
            "layout": layout,
            "content": "<p>Legacy layout content</p>"
        }
        if layout == "layout_1":
            page_data["layout_image"] = "/api/uploads/bio.jpg"
            
        response = requests.post(f"{BASE_URL}/api/admin/nav-pages", headers=auth_headers, json=page_data)
        assert response.status_code == 200, f"Failed to create {layout}: {response.text}"
        data = response.json()
        assert data["layout"] == layout
        print(f"PASS: Created legacy {layout} page")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/nav-pages/{data['id']}", headers=auth_headers)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
