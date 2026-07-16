"""
Iteration 8 Testing: My Account & Portfolio UI/UX Updates
Tests for:
1. Geo API endpoints (countries, states, cities)
2. Member API endpoints (sectors, industries, companies)
3. Auth login
4. Mentor endpoint
5. Portfolio CRUD with rank and cost fields
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@consultant.com"
ADMIN_PASSWORD = "Admin123!"


class TestGeoAPI:
    """Test geo endpoints for cascading Country/State/City selects"""
    
    def test_get_countries(self):
        """GET /api/geo/countries should return list of countries"""
        response = requests.get(f"{BASE_URL}/api/geo/countries")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of countries"
        print(f"✓ GET /api/geo/countries returned {len(data)} countries")
        if len(data) > 0:
            # Check structure
            country = data[0]
            assert 'id' in country, "Country should have 'id'"
            assert 'name' in country, "Country should have 'name'"
            print(f"  Sample country: {country}")
    
    def test_get_states_with_country_id(self):
        """GET /api/geo/states?country_id=ca should return states for Canada"""
        # First get countries to find Canada
        countries_resp = requests.get(f"{BASE_URL}/api/geo/countries")
        countries = countries_resp.json()
        canada = next((c for c in countries if c.get('name', '').lower() == 'canada' or c.get('id') == 'ca'), None)
        
        if canada:
            country_id = canada['id']
            response = requests.get(f"{BASE_URL}/api/geo/states?country_id={country_id}")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            data = response.json()
            assert isinstance(data, list), "Expected list of states"
            print(f"✓ GET /api/geo/states?country_id={country_id} returned {len(data)} states")
            if len(data) > 0:
                state = data[0]
                assert 'id' in state, "State should have 'id'"
                assert 'name' in state, "State should have 'name'"
                print(f"  Sample state: {state}")
        else:
            # Try with 'ca' directly
            response = requests.get(f"{BASE_URL}/api/geo/states?country_id=ca")
            assert response.status_code == 200
            print(f"✓ GET /api/geo/states?country_id=ca returned {len(response.json())} states")
    
    def test_get_cities_with_state_id(self):
        """GET /api/geo/cities?state_id=on should return cities for Ontario"""
        # First get states to find Ontario
        states_resp = requests.get(f"{BASE_URL}/api/geo/states?country_id=ca")
        states = states_resp.json()
        ontario = next((s for s in states if s.get('name', '').lower() == 'ontario' or s.get('id') == 'on'), None)
        
        if ontario:
            state_id = ontario['id']
            response = requests.get(f"{BASE_URL}/api/geo/cities?state_id={state_id}")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            data = response.json()
            assert isinstance(data, list), "Expected list of cities"
            print(f"✓ GET /api/geo/cities?state_id={state_id} returned {len(data)} cities")
            if len(data) > 0:
                city = data[0]
                assert 'id' in city, "City should have 'id'"
                assert 'name' in city, "City should have 'name'"
                print(f"  Sample city: {city}")
        else:
            # Try with 'on' directly
            response = requests.get(f"{BASE_URL}/api/geo/cities?state_id=on")
            assert response.status_code == 200
            print(f"✓ GET /api/geo/cities?state_id=on returned {len(response.json())} cities")


class TestMemberDataAPI:
    """Test member data endpoints (sectors, industries, companies)"""
    
    def test_get_sectors(self):
        """GET /api/member/sectors should return list of sectors"""
        response = requests.get(f"{BASE_URL}/api/member/sectors")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of sectors"
        assert len(data) > 0, "Expected at least one sector"
        print(f"✓ GET /api/member/sectors returned {len(data)} sectors")
        # Check structure
        sector = data[0]
        assert 'id' in sector, "Sector should have 'id'"
        assert 'name' in sector, "Sector should have 'name'"
        print(f"  Sectors: {[s['name'] for s in data]}")
    
    def test_get_industries(self):
        """GET /api/member/industries should return list of industries"""
        response = requests.get(f"{BASE_URL}/api/member/industries")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of industries"
        assert len(data) > 0, "Expected at least one industry"
        print(f"✓ GET /api/member/industries returned {len(data)} industries")
    
    def test_get_companies(self):
        """GET /api/member/companies should return list of companies"""
        response = requests.get(f"{BASE_URL}/api/member/companies")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of companies"
        assert len(data) > 0, "Expected at least one company"
        print(f"✓ GET /api/member/companies returned {len(data)} companies")


class TestAuthLogin:
    """Test authentication login"""
    
    def test_admin_login(self):
        """POST /api/auth/login with admin credentials should succeed"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert 'token' in data, "Response should contain 'token'"
        assert 'user' in data, "Response should contain 'user'"
        print(f"✓ POST /api/auth/login succeeded for {ADMIN_EMAIL}")
        print(f"  User role: {data['user'].get('role')}")
        return data['token']


class TestMentorEndpoint:
    """Test mentor endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()['token']
        pytest.skip("Could not authenticate")
    
    def test_get_my_mentor(self, auth_token):
        """GET /api/member/my-mentor should work when authenticated"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/member/my-mentor", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # Can be null if no mentor assigned
        print(f"✓ GET /api/member/my-mentor returned: {data if data else 'null (no mentor assigned)'}")


class TestPortfolioCRUD:
    """Test portfolio CRUD with rank and cost fields"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()['token']
        pytest.skip("Could not authenticate")
    
    @pytest.fixture
    def sectors(self):
        """Get sectors for creating holdings"""
        response = requests.get(f"{BASE_URL}/api/member/sectors")
        return response.json() if response.status_code == 200 else []
    
    def test_create_portfolio_with_rank_and_cost(self, auth_token, sectors):
        """POST /api/member/portfolios should accept rank and cost fields in holdings"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get a sector ID for the holding
        sector_id = sectors[0]['id'] if sectors else 'sect_tech'
        
        portfolio_data = {
            "title": "TEST_Iteration8_Portfolio",
            "description": "<p>Test portfolio with rank and cost fields</p>",
            "as_of_date": "2025-01-15",
            "cash_balance": 5000.00,
            "holdings": [
                {
                    "sector_id": sector_id,
                    "industry_id": "ind_software",
                    "symbol": "AAPL",
                    "security": "Apple Inc.",
                    "sector": "Technology",
                    "industry": "Software",
                    "price": 185.50,
                    "cost": 150.00,  # Cost field
                    "shares": 10,
                    "rank": 1  # Rank field
                },
                {
                    "sector_id": sector_id,
                    "industry_id": "ind_software",
                    "symbol": "MSFT",
                    "security": "Microsoft Corp.",
                    "sector": "Technology",
                    "industry": "Software",
                    "price": 420.00,
                    "cost": 380.00,  # Cost field
                    "shares": 5,
                    "rank": 2  # Rank field
                }
            ],
            "status": "active",
            "shared_mode": "all"
        }
        
        response = requests.post(f"{BASE_URL}/api/member/portfolios", json=portfolio_data, headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert 'id' in data, "Response should contain portfolio 'id'"
        assert data['title'] == "TEST_Iteration8_Portfolio"
        assert len(data['holdings']) == 2
        
        # Verify rank and cost fields are saved
        holding1 = data['holdings'][0]
        assert holding1.get('rank') == 1, f"Expected rank=1, got {holding1.get('rank')}"
        assert holding1.get('cost') == 150.00, f"Expected cost=150.00, got {holding1.get('cost')}"
        
        holding2 = data['holdings'][1]
        assert holding2.get('rank') == 2, f"Expected rank=2, got {holding2.get('rank')}"
        assert holding2.get('cost') == 380.00, f"Expected cost=380.00, got {holding2.get('cost')}"
        
        print(f"✓ POST /api/member/portfolios created portfolio with rank and cost fields")
        print(f"  Portfolio ID: {data['id']}")
        print(f"  Holdings: {len(data['holdings'])} with rank and cost fields")
        
        return data['id']
    
    def test_delete_portfolio(self, auth_token, sectors):
        """DELETE /api/member/portfolios/{id} should work for owner"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First create a portfolio to delete
        sector_id = sectors[0]['id'] if sectors else 'sect_tech'
        portfolio_data = {
            "title": "TEST_ToDelete_Portfolio",
            "as_of_date": "2025-01-15",
            "cash_balance": 1000.00,
            "holdings": [],
            "status": "active"
        }
        
        create_resp = requests.post(f"{BASE_URL}/api/member/portfolios", json=portfolio_data, headers=headers)
        assert create_resp.status_code == 200, f"Failed to create portfolio: {create_resp.text}"
        portfolio_id = create_resp.json()['id']
        
        # Now delete it
        delete_resp = requests.delete(f"{BASE_URL}/api/member/portfolios/{portfolio_id}", headers=headers)
        assert delete_resp.status_code == 200, f"Expected 200, got {delete_resp.status_code}: {delete_resp.text}"
        
        # Verify it's deleted
        get_resp = requests.get(f"{BASE_URL}/api/member/portfolios/{portfolio_id}", headers=headers)
        assert get_resp.status_code == 404, f"Expected 404 after delete, got {get_resp.status_code}"
        
        print(f"✓ DELETE /api/member/portfolios/{portfolio_id} succeeded")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()['token']
        pytest.skip("Could not authenticate")
    
    def test_cleanup_test_portfolios(self, auth_token):
        """Clean up TEST_ prefixed portfolios"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get all portfolios
        response = requests.get(f"{BASE_URL}/api/member/portfolios", headers=headers)
        if response.status_code == 200:
            data = response.json()
            own_portfolios = data.get('own', [])
            
            deleted_count = 0
            for p in own_portfolios:
                if p.get('title', '').startswith('TEST_'):
                    del_resp = requests.delete(f"{BASE_URL}/api/member/portfolios/{p['id']}", headers=headers)
                    if del_resp.status_code == 200:
                        deleted_count += 1
            
            print(f"✓ Cleaned up {deleted_count} test portfolios")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
