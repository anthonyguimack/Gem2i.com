"""
Iteration 40 Tests: Maps Module Refactor, Featured Projects, Quill Alignment CSS
Tests for:
1. Quill text alignment CSS classes in index.css
2. Featured Projects Page at /featured-projects
3. Homepage Portfolio View All link
4. Admin Maps Manager with map_type dropdown and link fields
5. Backend API map-locations filtering by map_type
6. Conferences and Recommended Sites pages
7. Visual Builder map block types
8. Homepage sections manager with map sections
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestMapLocationsAPI:
    """Test map-locations API with map_type filtering"""
    
    def test_get_all_map_locations(self):
        """GET /api/public/map-locations returns all locations"""
        response = requests.get(f"{BASE_URL}/api/public/map-locations")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Total locations: {len(data)}")
    
    def test_get_global_business_locations(self):
        """GET /api/public/map-locations?map_type=global_business returns only global_business locations"""
        response = requests.get(f"{BASE_URL}/api/public/map-locations?map_type=global_business")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Global Business locations: {len(data)}")
        # Verify all returned locations have map_type=global_business
        for loc in data:
            assert loc.get('map_type') == 'global_business', f"Location {loc.get('name')} has wrong map_type: {loc.get('map_type')}"
    
    def test_get_conferences_locations(self):
        """GET /api/public/map-locations?map_type=conferences returns only conference locations"""
        response = requests.get(f"{BASE_URL}/api/public/map-locations?map_type=conferences")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Conferences locations: {len(data)}")
        # Verify all returned locations have map_type=conferences
        for loc in data:
            assert loc.get('map_type') == 'conferences', f"Location {loc.get('name')} has wrong map_type: {loc.get('map_type')}"
    
    def test_get_recommended_sites_locations(self):
        """GET /api/public/map-locations?map_type=recommended_sites returns only recommended_sites locations"""
        response = requests.get(f"{BASE_URL}/api/public/map-locations?map_type=recommended_sites")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Recommended Sites locations: {len(data)}")
        # Verify all returned locations have map_type=recommended_sites
        for loc in data:
            assert loc.get('map_type') == 'recommended_sites', f"Location {loc.get('name')} has wrong map_type: {loc.get('map_type')}"


class TestPortfolioAPI:
    """Test portfolio API for Featured Projects page"""
    
    def test_get_portfolio_items(self):
        """GET /api/public/portfolio returns portfolio items"""
        response = requests.get(f"{BASE_URL}/api/public/portfolio")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Portfolio items: {len(data)}")
        
        # Check if any items have links
        items_with_links = [p for p in data if p.get('link')]
        print(f"Items with links: {len(items_with_links)}")
        
        # Verify portfolio item structure
        if data:
            item = data[0]
            assert 'id' in item
            assert 'title' in item
            print(f"First item: {item.get('title')}, link: {item.get('link')}")


class TestSettingsSections:
    """Test settings API for homepage sections including map sections"""
    
    def test_get_settings_with_sections(self):
        """GET /api/public/settings returns sections with map_global, map_conferences, map_recommended"""
        response = requests.get(f"{BASE_URL}/api/public/settings")
        assert response.status_code == 200
        data = response.json()
        
        sections = data.get('sections', {})
        section_order = data.get('section_order', [])
        
        print(f"Section order: {section_order}")
        
        # Check for map sections in section_order
        assert 'map_global' in section_order, "map_global not in section_order"
        assert 'map_conferences' in section_order, "map_conferences not in section_order"
        assert 'map_recommended' in section_order, "map_recommended not in section_order"
        
        # Check sections config
        assert 'map_global' in sections, "map_global not in sections config"
        assert 'map_conferences' in sections, "map_conferences not in sections config"
        assert 'map_recommended' in sections, "map_recommended not in sections config"
        
        print(f"map_global enabled: {sections.get('map_global', {}).get('enabled')}")
        print(f"map_conferences enabled: {sections.get('map_conferences', {}).get('enabled')}")
        print(f"map_recommended enabled: {sections.get('map_recommended', {}).get('enabled')}")


class TestAdminMapsAPI:
    """Test admin maps API for location CRUD with map_type and link fields"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Authentication failed")
    
    def test_get_admin_map_locations(self, auth_token):
        """GET /api/admin/map-locations returns all locations with map_type and link fields"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/map-locations", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Admin locations: {len(data)}")
        
        # Check location structure includes map_type and link fields
        if data:
            loc = data[0]
            print(f"Location fields: {list(loc.keys())}")
            # map_type should be present
            assert 'map_type' in loc or 'category' in loc, "Location missing map_type field"
    
    def test_create_location_with_map_type_and_link(self, auth_token):
        """POST /api/admin/map-locations creates location with map_type and link"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create a test location
        test_location = {
            "name": "TEST_Conference_Location",
            "lat": 48.8566,
            "lng": 2.3522,
            "description": "Test conference in Paris",
            "map_type": "conferences",
            "link": "https://example.com/conference",
            "open_in_new_tab": True
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/map-locations", json=test_location, headers=headers)
        assert response.status_code in [200, 201], f"Create failed: {response.text}"
        
        created = response.json()
        assert created.get('name') == test_location['name']
        assert created.get('map_type') == 'conferences'
        assert created.get('link') == test_location['link']
        assert created.get('open_in_new_tab') == True
        
        print(f"Created location: {created.get('name')} with map_type={created.get('map_type')}")
        
        # Cleanup - delete the test location
        loc_id = created.get('id')
        if loc_id:
            requests.delete(f"{BASE_URL}/api/admin/map-locations/{loc_id}", headers=headers)
            print(f"Cleaned up test location: {loc_id}")


class TestFrontendRoutes:
    """Test frontend routes exist and return 200 (React SPA - content rendered client-side)"""
    
    def test_homepage_loads(self):
        """Homepage loads successfully"""
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200
        print("Homepage loads OK")
    
    def test_featured_projects_page_loads(self):
        """Featured Projects page at /featured-projects loads (React SPA)"""
        response = requests.get(f"{BASE_URL}/featured-projects")
        assert response.status_code == 200
        # React SPA returns shell HTML, content rendered client-side
        assert '<!doctype html>' in response.text.lower()
        print("Featured Projects page loads OK (React SPA)")
    
    def test_conferences_page_loads(self):
        """Conferences page at /conferences loads (React SPA)"""
        response = requests.get(f"{BASE_URL}/conferences")
        assert response.status_code == 200
        # React SPA returns shell HTML, content rendered client-side
        assert '<!doctype html>' in response.text.lower()
        print("Conferences page loads OK (React SPA)")
    
    def test_recommended_sites_page_loads(self):
        """Recommended Sites page at /recommended_sites loads (React SPA)"""
        response = requests.get(f"{BASE_URL}/recommended_sites")
        assert response.status_code == 200
        # React SPA returns shell HTML, content rendered client-side
        assert '<!doctype html>' in response.text.lower()
        print("Recommended Sites page loads OK (React SPA)")


class TestQuillAlignmentCSS:
    """Test that Quill alignment CSS classes are present in the frontend"""
    
    def test_index_css_has_alignment_classes(self):
        """Verify index.css contains Quill alignment classes"""
        css_path = '/app/frontend/src/index.css'
        with open(css_path, 'r') as f:
            css_content = f.read()
        
        # Check for alignment classes
        assert '.ql-align-center' in css_content, "Missing .ql-align-center class"
        assert '.ql-align-right' in css_content, "Missing .ql-align-right class"
        assert '.ql-align-justify' in css_content, "Missing .ql-align-justify class"
        assert 'text-align: center' in css_content, "Missing text-align: center rule"
        assert 'text-align: right' in css_content, "Missing text-align: right rule"
        assert 'text-align: justify' in css_content, "Missing text-align: justify rule"
        
        print("PASS: All Quill alignment CSS classes present in index.css")


class TestLayoutDefinitions:
    """Test that layout definitions include map block types"""
    
    def test_layout_definitions_has_map_blocks(self):
        """Verify layoutDefinitions.js contains map block types"""
        layout_path = '/app/frontend/src/lib/layoutDefinitions.js'
        with open(layout_path, 'r') as f:
            content = f.read()
        
        # Check for map block types
        assert 'map_global' in content, "Missing map_global block type"
        assert 'map_conferences' in content, "Missing map_conferences block type"
        assert 'map_recommended' in content, "Missing map_recommended block type"
        assert 'Global Business Map' in content, "Missing Global Business Map label"
        assert 'Conferences Map' in content, "Missing Conferences Map label"
        assert 'Recommended Sites Map' in content, "Missing Recommended Sites Map label"
        
        print("PASS: All map block types present in layoutDefinitions.js")


class TestBlockRenderer:
    """Test that BlockRenderer handles map block types"""
    
    def test_block_renderer_has_map_blocks(self):
        """Verify BlockRenderer.js handles map block types"""
        renderer_path = '/app/frontend/src/components/layouts/BlockRenderer.js'
        with open(renderer_path, 'r') as f:
            content = f.read()
        
        # Check for map block handling
        assert "case 'map_global'" in content, "Missing map_global case in BlockRenderer"
        assert "case 'map_conferences'" in content, "Missing map_conferences case in BlockRenderer"
        assert "case 'map_recommended'" in content, "Missing map_recommended case in BlockRenderer"
        assert 'MapBlock' in content, "Missing MapBlock component"
        
        print("PASS: BlockRenderer handles all map block types")


class TestMapsManager:
    """Test that MapsManager has map_type dropdown and link fields"""
    
    def test_maps_manager_has_map_type_dropdown(self):
        """Verify MapsManager.js has map_type dropdown with 3 options"""
        manager_path = '/app/frontend/src/pages/admin/MapsManager.js'
        with open(manager_path, 'r') as f:
            content = f.read()
        
        # Check for MAP_TYPES constant
        assert 'MAP_TYPES' in content, "Missing MAP_TYPES constant"
        assert 'global_business' in content, "Missing global_business option"
        assert 'conferences' in content, "Missing conferences option"
        assert 'recommended_sites' in content, "Missing recommended_sites option"
        
        # Check for link and open_in_new_tab fields
        assert 'location-link-input' in content, "Missing link input field"
        assert 'location-newtab-toggle' in content or 'open_in_new_tab' in content, "Missing open_in_new_tab toggle"
        assert 'location-maptype-select' in content, "Missing map_type select"
        
        print("PASS: MapsManager has map_type dropdown and link fields")


class TestFeaturedProjectsPage:
    """Test FeaturedProjectsPage component"""
    
    def test_featured_projects_page_component(self):
        """Verify FeaturedProjectsPage.js exists and has correct structure"""
        page_path = '/app/frontend/src/pages/FeaturedProjectsPage.js'
        with open(page_path, 'r') as f:
            content = f.read()
        
        # Check for key elements
        assert 'featured-projects-page' in content, "Missing data-testid"
        assert 'project-card-' in content, "Missing project card testid"
        assert 'View Project' in content, "Missing View Project link"
        assert 'publicAPI.getPortfolio' in content, "Missing portfolio API call"
        
        print("PASS: FeaturedProjectsPage component has correct structure")


class TestMapTypePage:
    """Test MapTypePage component for Conferences and Recommended Sites"""
    
    def test_map_type_page_component(self):
        """Verify MapTypePage.js exists and exports ConferencesPage and RecommendedSitesPage"""
        page_path = '/app/frontend/src/pages/MapTypePage.js'
        with open(page_path, 'r') as f:
            content = f.read()
        
        # Check for exports
        assert 'ConferencesPage' in content, "Missing ConferencesPage export"
        assert 'RecommendedSitesPage' in content, "Missing RecommendedSitesPage export"
        
        # Check for map_type props
        assert "mapType=\"conferences\"" in content or 'mapType="conferences"' in content, "Missing conferences mapType"
        assert "mapType=\"recommended_sites\"" in content or 'mapType="recommended_sites"' in content, "Missing recommended_sites mapType"
        
        # Check for react-leaflet usage
        assert 'MapContainer' in content, "Missing MapContainer from react-leaflet"
        assert 'TileLayer' in content, "Missing TileLayer from react-leaflet"
        assert 'Marker' in content, "Missing Marker from react-leaflet"
        
        print("PASS: MapTypePage component has correct structure")


class TestHomePage:
    """Test HomePage component for portfolio View All link and map sections"""
    
    def test_homepage_portfolio_view_all(self):
        """Verify HomePage.js has View All link in portfolio section"""
        page_path = '/app/frontend/src/pages/HomePage.js'
        with open(page_path, 'r') as f:
            content = f.read()
        
        # Check for View All link to /featured-projects
        assert '/featured-projects' in content, "Missing /featured-projects link"
        assert 'portfolio-view-all' in content, "Missing portfolio-view-all testid"
        
        # Check for map sections
        assert 'map_global' in content, "Missing map_global section key"
        assert 'map_conferences' in content, "Missing map_conferences section key"
        assert 'map_recommended' in content, "Missing map_recommended section key"
        
        print("PASS: HomePage has portfolio View All link and map sections")


class TestAppRoutes:
    """Test App.js has correct routes"""
    
    def test_app_routes(self):
        """Verify App.js has routes for featured-projects, conferences, recommended_sites"""
        app_path = '/app/frontend/src/App.js'
        with open(app_path, 'r') as f:
            content = f.read()
        
        # Check for routes
        assert '/featured-projects' in content, "Missing /featured-projects route"
        assert '/conferences' in content, "Missing /conferences route"
        assert '/recommended_sites' in content, "Missing /recommended_sites route"
        
        # Check for component imports
        assert 'FeaturedProjectsPage' in content, "Missing FeaturedProjectsPage import"
        assert 'ConferencesPage' in content, "Missing ConferencesPage import"
        assert 'RecommendedSitesPage' in content, "Missing RecommendedSitesPage import"
        
        print("PASS: App.js has all required routes")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
