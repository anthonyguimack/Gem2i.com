"""
Iteration 46 Tests: Geo Data & Enrollment Page Fixes
- GET /api/geo/countries returns 249 real countries
- GET /api/geo/states?country_id=<US_ID> returns US states (50+)
- GET /api/geo/cities?state_id=<FL_ID> returns Florida cities
- POST/PUT/DELETE /api/admin/geo/countries CRUD works
- POST/PUT/DELETE /api/admin/geo/states CRUD works
- POST/PUT/DELETE /api/admin/geo/cities CRUD works
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestGeoPublicAPI:
    """Test public geo endpoints for countries, states, cities"""
    
    def test_get_countries_returns_249(self):
        """GET /api/geo/countries should return 249 real countries"""
        response = requests.get(f"{BASE_URL}/api/geo/countries")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        countries = response.json()
        assert isinstance(countries, list), "Response should be a list"
        assert len(countries) == 249, f"Expected 249 countries, got {len(countries)}"
        
        # Verify structure
        first = countries[0]
        assert "id" in first, "Country should have id"
        assert "name" in first, "Country should have name"
        assert "code" in first, "Country should have code"
        
        # Verify some known countries exist
        country_names = [c['name'] for c in countries]
        assert "United States" in country_names, "US should be in countries"
        assert "Canada" in country_names, "Canada should be in countries"
        assert "United Kingdom" in country_names, "UK should be in countries"
        print(f"✓ GET /api/geo/countries returns {len(countries)} countries")
    
    def test_get_us_states_returns_50_plus(self):
        """GET /api/geo/states?country_id=<US_ID> should return 50+ US states"""
        # First get US country ID
        countries_resp = requests.get(f"{BASE_URL}/api/geo/countries")
        assert countries_resp.status_code == 200
        countries = countries_resp.json()
        us = next((c for c in countries if c['code'] == 'US'), None)
        assert us is not None, "US country should exist"
        
        # Get US states
        response = requests.get(f"{BASE_URL}/api/geo/states?country_id={us['id']}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        states = response.json()
        assert isinstance(states, list), "Response should be a list"
        assert len(states) >= 50, f"Expected 50+ US states, got {len(states)}"
        
        # Verify structure
        first = states[0]
        assert "id" in first, "State should have id"
        assert "name" in first, "State should have name"
        assert "country_id" in first, "State should have country_id"
        
        # Verify some known states exist
        state_names = [s['name'] for s in states]
        assert "California" in state_names, "California should be in states"
        assert "Florida" in state_names, "Florida should be in states"
        assert "Texas" in state_names, "Texas should be in states"
        print(f"✓ GET /api/geo/states returns {len(states)} US states")
    
    def test_get_florida_cities(self):
        """GET /api/geo/cities?state_id=<FL_ID> should return Florida cities"""
        # Get US country ID
        countries_resp = requests.get(f"{BASE_URL}/api/geo/countries")
        countries = countries_resp.json()
        us = next((c for c in countries if c['code'] == 'US'), None)
        
        # Get Florida state ID
        states_resp = requests.get(f"{BASE_URL}/api/geo/states?country_id={us['id']}")
        states = states_resp.json()
        florida = next((s for s in states if s['name'] == 'Florida'), None)
        assert florida is not None, "Florida state should exist"
        
        # Get Florida cities
        response = requests.get(f"{BASE_URL}/api/geo/cities?state_id={florida['id']}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        cities = response.json()
        assert isinstance(cities, list), "Response should be a list"
        assert len(cities) > 100, f"Expected 100+ Florida cities, got {len(cities)}"
        
        # Verify structure
        first = cities[0]
        assert "id" in first, "City should have id"
        assert "name" in first, "City should have name"
        assert "state_id" in first, "City should have state_id"
        
        # Verify some known cities exist
        city_names = [c['name'] for c in cities]
        assert "Miami" in city_names, "Miami should be in Florida cities"
        print(f"✓ GET /api/geo/cities returns {len(cities)} Florida cities")


class TestGeoAdminCRUD:
    """Test admin CRUD operations for geo data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin auth token"""
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        if login_resp.status_code == 200:
            self.token = login_resp.json().get("token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Admin login failed")
    
    def test_admin_country_crud(self):
        """Test POST/PUT/DELETE /api/admin/geo/countries"""
        # CREATE
        create_resp = requests.post(
            f"{BASE_URL}/api/admin/geo/countries",
            json={"name": "TEST_Country", "code": "TC", "alpha3": "TCO"},
            headers=self.headers
        )
        assert create_resp.status_code == 200, f"Create failed: {create_resp.text}"
        created = create_resp.json()
        assert created["name"] == "TEST_Country"
        assert created["code"] == "TC"
        country_id = created["id"]
        print(f"✓ Created test country: {country_id}")
        
        # UPDATE
        update_resp = requests.put(
            f"{BASE_URL}/api/admin/geo/countries/{country_id}",
            json={"name": "TEST_Country_Updated"},
            headers=self.headers
        )
        assert update_resp.status_code == 200, f"Update failed: {update_resp.text}"
        updated = update_resp.json()
        assert updated["name"] == "TEST_Country_Updated"
        print(f"✓ Updated test country")
        
        # DELETE
        delete_resp = requests.delete(
            f"{BASE_URL}/api/admin/geo/countries/{country_id}",
            headers=self.headers
        )
        assert delete_resp.status_code == 200, f"Delete failed: {delete_resp.text}"
        print(f"✓ Deleted test country")
    
    def test_admin_state_crud(self):
        """Test POST/PUT/DELETE /api/admin/geo/states"""
        # Get US country ID for testing
        countries_resp = requests.get(f"{BASE_URL}/api/geo/countries")
        countries = countries_resp.json()
        us = next((c for c in countries if c['code'] == 'US'), None)
        
        # CREATE
        create_resp = requests.post(
            f"{BASE_URL}/api/admin/geo/states",
            json={"name": "TEST_State", "code": "TS", "country_id": us['id'], "country_code": "US"},
            headers=self.headers
        )
        assert create_resp.status_code == 200, f"Create failed: {create_resp.text}"
        created = create_resp.json()
        assert created["name"] == "TEST_State"
        state_id = created["id"]
        print(f"✓ Created test state: {state_id}")
        
        # UPDATE
        update_resp = requests.put(
            f"{BASE_URL}/api/admin/geo/states/{state_id}",
            json={"name": "TEST_State_Updated"},
            headers=self.headers
        )
        assert update_resp.status_code == 200, f"Update failed: {update_resp.text}"
        updated = update_resp.json()
        assert updated["name"] == "TEST_State_Updated"
        print(f"✓ Updated test state")
        
        # DELETE
        delete_resp = requests.delete(
            f"{BASE_URL}/api/admin/geo/states/{state_id}",
            headers=self.headers
        )
        assert delete_resp.status_code == 200, f"Delete failed: {delete_resp.text}"
        print(f"✓ Deleted test state")
    
    def test_admin_city_crud(self):
        """Test POST/PUT/DELETE /api/admin/geo/cities"""
        # Get US country and Florida state for testing
        countries_resp = requests.get(f"{BASE_URL}/api/geo/countries")
        countries = countries_resp.json()
        us = next((c for c in countries if c['code'] == 'US'), None)
        
        states_resp = requests.get(f"{BASE_URL}/api/geo/states?country_id={us['id']}")
        states = states_resp.json()
        florida = next((s for s in states if s['name'] == 'Florida'), None)
        
        # CREATE
        create_resp = requests.post(
            f"{BASE_URL}/api/admin/geo/cities",
            json={"name": "TEST_City", "state_id": florida['id'], "country_id": us['id'], "country_code": "US"},
            headers=self.headers
        )
        assert create_resp.status_code == 200, f"Create failed: {create_resp.text}"
        created = create_resp.json()
        assert created["name"] == "TEST_City"
        city_id = created["id"]
        print(f"✓ Created test city: {city_id}")
        
        # UPDATE
        update_resp = requests.put(
            f"{BASE_URL}/api/admin/geo/cities/{city_id}",
            json={"name": "TEST_City_Updated"},
            headers=self.headers
        )
        assert update_resp.status_code == 200, f"Update failed: {update_resp.text}"
        updated = update_resp.json()
        assert updated["name"] == "TEST_City_Updated"
        print(f"✓ Updated test city")
        
        # DELETE
        delete_resp = requests.delete(
            f"{BASE_URL}/api/admin/geo/cities/{city_id}",
            headers=self.headers
        )
        assert delete_resp.status_code == 200, f"Delete failed: {delete_resp.text}"
        print(f"✓ Deleted test city")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
