"""
Test Phase D & E Features:
- Sectors/Industries/Companies endpoints
- Portfolio with shared_mode/status
- Members list for sharing
- My Community search
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthLogin:
    """Test unified auth login"""
    
    def test_admin_login_returns_token(self):
        """POST /api/auth/login with admin credentials returns token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user"
        assert data["user"]["role"] == "admin", "User should be admin"
        assert data["user"]["membership_id"] == "ADMIN", "Admin should have ADMIN membership_id"


class TestSectorsIndustriesCompanies:
    """Test Phase D: Sectors/Industries/Companies endpoints"""
    
    def test_get_sectors_returns_6(self):
        """GET /api/member/sectors returns 6 sectors"""
        response = requests.get(f"{BASE_URL}/api/member/sectors")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert len(data) == 6, f"Expected 6 sectors, got {len(data)}"
        sector_names = [s["name"] for s in data]
        assert "Technology" in sector_names
        assert "Healthcare" in sector_names
        assert "Financial Services" in sector_names
    
    def test_get_industries_by_sector(self):
        """GET /api/member/industries?sector_id=sect_tech returns tech industries"""
        response = requests.get(f"{BASE_URL}/api/member/industries?sector_id=sect_tech")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert len(data) >= 3, f"Expected at least 3 tech industries, got {len(data)}"
        industry_names = [i["name"] for i in data]
        assert "Software" in industry_names
        assert "Hardware" in industry_names
        assert "Semiconductors" in industry_names
    
    def test_get_companies_by_industry(self):
        """GET /api/member/companies?industry_id=ind_hardware returns AAPL"""
        response = requests.get(f"{BASE_URL}/api/member/companies?industry_id=ind_hardware")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert len(data) >= 1, f"Expected at least 1 company, got {len(data)}"
        symbols = [c["symbol"] for c in data]
        assert "AAPL" in symbols, "AAPL should be in hardware companies"
        # Verify AAPL has correct data
        aapl = next(c for c in data if c["symbol"] == "AAPL")
        assert aapl["name"] == "Apple Inc."
        assert aapl["price"] > 0


class TestMembersList:
    """Test members list for portfolio sharing"""
    
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
    
    def test_get_members_list_requires_auth(self):
        """GET /api/member/members-list requires authentication"""
        response = requests.get(f"{BASE_URL}/api/member/members-list")
        assert response.status_code == 401, "Should require auth"
    
    def test_get_members_list_with_auth(self, auth_token):
        """GET /api/member/members-list returns member list for sharing"""
        response = requests.get(
            f"{BASE_URL}/api/member/members-list",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        # Each member should have required fields
        if len(data) > 0:
            member = data[0]
            assert "member_id" in member
            assert "membership_id" in member
            assert "first_name" in member
            assert "last_name" in member


class TestPortfolioWithSharing:
    """Test portfolio CRUD with shared_mode and status"""
    
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
    
    def test_create_portfolio_with_shared_mode_all(self, auth_token):
        """Create portfolio with shared_mode=all"""
        payload = {
            "title": "TEST_Portfolio_All",
            "description": "Test portfolio shared with all",
            "as_of_date": "2026-01-15",
            "cash_balance": 10000,
            "holdings": [],
            "shared_mode": "all",
            "shared_with": [],
            "status": "active"
        }
        response = requests.post(
            f"{BASE_URL}/api/member/portfolios",
            json=payload,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["title"] == "TEST_Portfolio_All"
        assert data["shared_mode"] == "all"
        assert data["status"] == "active"
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/member/portfolios/{data['id']}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
    
    def test_create_portfolio_with_shared_mode_select(self, auth_token):
        """Create portfolio with shared_mode=select"""
        payload = {
            "title": "TEST_Portfolio_Select",
            "description": "Test portfolio shared with select members",
            "as_of_date": "2026-01-15",
            "cash_balance": 5000,
            "holdings": [],
            "shared_mode": "select",
            "shared_with": [],
            "status": "inactive"
        }
        response = requests.post(
            f"{BASE_URL}/api/member/portfolios",
            json=payload,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["shared_mode"] == "select"
        assert data["status"] == "inactive"
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/member/portfolios/{data['id']}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
    
    def test_create_portfolio_with_holdings(self, auth_token):
        """Create portfolio with holdings using sector/industry/symbol"""
        payload = {
            "title": "TEST_Portfolio_Holdings",
            "description": "Test portfolio with holdings",
            "as_of_date": "2026-01-15",
            "cash_balance": 1000,
            "holdings": [
                {
                    "sector_id": "sect_tech",
                    "industry_id": "ind_hardware",
                    "symbol": "AAPL",
                    "security": "Common Stock",
                    "sector": "Technology",
                    "industry": "Hardware",
                    "price": 227.48,
                    "shares": 10
                }
            ],
            "shared_mode": "all",
            "shared_with": [],
            "status": "active"
        }
        response = requests.post(
            f"{BASE_URL}/api/member/portfolios",
            json=payload,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert len(data["holdings"]) == 1
        assert data["holdings"][0]["symbol"] == "AAPL"
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/member/portfolios/{data['id']}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )


class TestMyCommunity:
    """Test My Community endpoint"""
    
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
    
    def test_get_my_community(self, auth_token):
        """GET /api/member/my-community returns tree structure"""
        response = requests.get(
            f"{BASE_URL}/api/member/my-community",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "tree" in data, "Response should have tree"
        assert "total_invites" in data, "Response should have total_invites"
        assert "used_invites" in data, "Response should have used_invites"


class TestAdminMembersManager:
    """Test Admin Members Manager endpoints"""
    
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
    
    def test_get_admin_members(self, auth_token):
        """GET /api/admin/members returns member list with role field"""
        response = requests.get(
            f"{BASE_URL}/api/admin/members",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        # Check admin member exists
        admin = next((m for m in data if m.get("email") == "admin@consultant.com"), None)
        assert admin is not None, "Admin should be in members list"
        assert admin["role"] == "admin", "Admin should have role=admin"
    
    def test_create_member_with_role(self, auth_token):
        """Create member with role field (Admin/Member)"""
        import uuid
        test_email = f"test_{uuid.uuid4().hex[:8]}@test.com"
        payload = {
            "email": test_email,
            "first_name": "TEST",
            "last_name": "Member",
            "password": "TestPass123!",
            "role": "member",
            "is_mentor": False,
            "portfolio_development": True
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/members",
            json=payload,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["email"] == test_email
        assert data["role"] == "member"
        assert data["portfolio_development"] == True
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/admin/members/{data['member_id']}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
    
    def test_update_member_sponsor_mentor(self, auth_token):
        """Update member with sponsor and mentor fields"""
        # First get members list
        response = requests.get(
            f"{BASE_URL}/api/admin/members",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        members = response.json()
        # Find a non-admin member to update
        non_admin = next((m for m in members if m.get("role") != "admin"), None)
        if not non_admin:
            pytest.skip("No non-admin members to test")
        
        # Update with sponsor_membership_number
        update_payload = {
            "sponsor_membership_number": 0,  # Admin's membership number
            "is_mentor": True
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/members/{non_admin['member_id']}",
            json=update_payload,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert data["sponsor_membership_number"] == 0
        assert data["is_mentor"] == True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
