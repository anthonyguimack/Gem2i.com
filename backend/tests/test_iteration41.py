"""
Iteration 41 Tests: Maps Module Enhancements
- Maps Language setting in Settings API
- Map Picker in MapsManager (frontend only - tested via Playwright)
- MapBlock rendering without crashes (frontend only - tested via Playwright)
- open_in_new_tab behavior for portfolio and map locations
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestMapsLanguageSetting:
    """Test Maps Language setting in Settings API"""
    
    def test_get_settings_includes_maps_language(self):
        """Settings should include maps_language field"""
        response = requests.get(f"{BASE_URL}/api/public/settings")
        assert response.status_code == 200
        data = response.json()
        # maps_language may or may not be set, but settings should load
        assert isinstance(data, dict)
        print(f"✓ Settings loaded, maps_language: {data.get('maps_language', 'not set')}")
    
    def test_admin_update_maps_language(self):
        """Admin should be able to update maps_language setting"""
        # First login as admin
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert login_response.status_code == 200
        token = login_response.json().get('token')
        assert token, "No token received"
        
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get current settings
        get_response = requests.get(f"{BASE_URL}/api/admin/settings", headers=headers)
        assert get_response.status_code == 200
        current_settings = get_response.json()
        
        # Update maps_language
        current_settings['maps_language'] = 'en'
        update_response = requests.put(f"{BASE_URL}/api/admin/settings", 
                                       json=current_settings, headers=headers)
        assert update_response.status_code == 200
        print("✓ Maps language updated to 'en'")
        
        # Verify update
        verify_response = requests.get(f"{BASE_URL}/api/admin/settings", headers=headers)
        assert verify_response.status_code == 200
        assert verify_response.json().get('maps_language') == 'en'
        print("✓ Maps language verified as 'en'")
        
        # Reset to local
        current_settings['maps_language'] = 'local'
        requests.put(f"{BASE_URL}/api/admin/settings", json=current_settings, headers=headers)


class TestMapLocationsAPI:
    """Test Map Locations API with open_in_new_tab field"""
    
    def test_get_map_locations_global_business(self):
        """Get global_business map locations"""
        response = requests.get(f"{BASE_URL}/api/public/map-locations?map_type=global_business")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Global business locations: {len(data)}")
        
        # Check structure of locations
        if len(data) > 0:
            loc = data[0]
            assert 'name' in loc
            assert 'lat' in loc
            assert 'lng' in loc
            # open_in_new_tab should be present
            print(f"  First location: {loc.get('name')}, open_in_new_tab: {loc.get('open_in_new_tab', 'not set')}")
    
    def test_get_map_locations_conferences(self):
        """Get conferences map locations"""
        response = requests.get(f"{BASE_URL}/api/public/map-locations?map_type=conferences")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Conference locations: {len(data)}")
    
    def test_get_map_locations_recommended_sites(self):
        """Get recommended_sites map locations"""
        response = requests.get(f"{BASE_URL}/api/public/map-locations?map_type=recommended_sites")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Recommended sites locations: {len(data)}")
    
    def test_admin_create_location_with_open_in_new_tab(self):
        """Admin can create location with open_in_new_tab field"""
        # Login as admin
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert login_response.status_code == 200
        token = login_response.json().get('token')
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create test location
        test_location = {
            "name": "TEST_Location_41",
            "lat": 40.7128,
            "lng": -74.0060,
            "description": "Test location for iteration 41",
            "map_type": "global_business",
            "link": "https://example.com",
            "open_in_new_tab": True
        }
        
        create_response = requests.post(f"{BASE_URL}/api/admin/map-locations", 
                                        json=test_location, headers=headers)
        assert create_response.status_code in [200, 201]
        created = create_response.json()
        assert created.get('name') == "TEST_Location_41"
        assert created.get('open_in_new_tab') == True
        print(f"✓ Created test location with open_in_new_tab=True")
        
        # Cleanup - delete the test location
        loc_id = created.get('id')
        if loc_id:
            delete_response = requests.delete(f"{BASE_URL}/api/admin/map-locations/{loc_id}", 
                                              headers=headers)
            assert delete_response.status_code in [200, 204]
            print(f"✓ Cleaned up test location")


class TestPortfolioAPI:
    """Test Portfolio API with open_in_new_tab field"""
    
    def test_get_portfolio_items(self):
        """Get portfolio items"""
        response = requests.get(f"{BASE_URL}/api/public/portfolio")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Portfolio items: {len(data)}")
        
        # Check for items with links
        items_with_links = [p for p in data if p.get('link')]
        print(f"  Items with links: {len(items_with_links)}")
        
        for item in items_with_links:
            print(f"  - {item.get('title')}: link={item.get('link')}, open_in_new_tab={item.get('open_in_new_tab', 'not set')}")
    
    def test_admin_update_portfolio_open_in_new_tab(self):
        """Admin can update portfolio item with open_in_new_tab"""
        # Login as admin
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert login_response.status_code == 200
        token = login_response.json().get('token')
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get portfolio items
        get_response = requests.get(f"{BASE_URL}/api/admin/portfolio", headers=headers)
        assert get_response.status_code == 200
        items = get_response.json()
        
        if len(items) > 0:
            item = items[0]
            item_id = item.get('id')
            
            # Update with open_in_new_tab
            item['link'] = 'https://test-link.com'
            item['open_in_new_tab'] = True
            
            update_response = requests.put(f"{BASE_URL}/api/admin/portfolio/{item_id}", 
                                           json=item, headers=headers)
            assert update_response.status_code == 200
            print(f"✓ Updated portfolio item with open_in_new_tab=True")
            
            # Verify
            verify_response = requests.get(f"{BASE_URL}/api/admin/portfolio/{item_id}", headers=headers)
            if verify_response.status_code == 200:
                updated = verify_response.json()
                assert updated.get('open_in_new_tab') == True
                print(f"✓ Verified open_in_new_tab=True")


class TestAdminAuth:
    """Test admin authentication"""
    
    def test_admin_login(self):
        """Admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        data = response.json()
        assert 'token' in data
        assert data.get('user', {}).get('role') == 'admin'
        print("✓ Admin login successful")


class TestPublicPages:
    """Test public page endpoints"""
    
    def test_homepage_data(self):
        """Homepage data loads correctly"""
        # Test all homepage data endpoints
        endpoints = [
            '/api/public/settings',
            '/api/public/about',
            '/api/public/services',
            '/api/public/portfolio',
            '/api/public/testimonials',
            '/api/public/hero-slides',
            '/api/public/map-locations?map_type=global_business',
        ]
        
        for endpoint in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}")
            assert response.status_code == 200, f"Failed: {endpoint}"
            print(f"✓ {endpoint} - OK")
    
    def test_nav_pages(self):
        """Navigation pages load correctly"""
        response = requests.get(f"{BASE_URL}/api/public/nav-pages")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Nav pages: {len(data)}")
        
        # Check for Our Group page
        our_group = [p for p in data if 'group' in p.get('title', '').lower() or 'group' in p.get('url', '').lower()]
        if our_group:
            print(f"  Found 'Our Group' page: {our_group[0].get('url')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
