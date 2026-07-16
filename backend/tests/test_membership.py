"""
Phase 3 Membership System Tests
Tests for: Member auth, invite codes, registration, admin member management, portfolios
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://consultant-cms.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@consultant.com"
ADMIN_PASSWORD = "Admin123!"

class TestMemberAuth:
    """Member authentication endpoint tests"""
    
    def test_member_login_invalid_credentials(self):
        """POST /api/member/login returns 401 for invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/member/login", json={
            "username": "nonexistent_user",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
        print(f"✓ Member login returns 401 for invalid credentials: {data['detail']}")
    
    def test_member_me_without_token(self):
        """GET /api/member/me returns 401 without token"""
        response = requests.get(f"{BASE_URL}/api/member/me")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Member /me endpoint requires authentication")


class TestInviteCodeValidation:
    """Invite code validation tests"""
    
    def test_validate_invalid_code(self):
        """GET /api/member/validate-code/{code} returns 404 for invalid code"""
        response = requests.get(f"{BASE_URL}/api/member/validate-code/INVALID-CODE-123")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
        print(f"✓ Invalid invite code returns 404: {data['detail']}")
    
    def test_validate_random_code(self):
        """GET /api/member/validate-code/{code} returns 404 for random code"""
        random_code = f"AUX-999-{uuid.uuid4().hex[:6]}"
        response = requests.get(f"{BASE_URL}/api/member/validate-code/{random_code}")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Random code {random_code} returns 404")


class TestMemberRegistration:
    """Member registration tests"""
    
    def test_register_with_invalid_code(self):
        """POST /api/member/register returns error for invalid invite code"""
        response = requests.post(f"{BASE_URL}/api/member/register", json={
            "invite_code": "INVALID-CODE-XYZ",
            "first_name": "Test",
            "last_name": "User",
            "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
            "password": "TestPass123!",
            "confirm_password": "TestPass123!"
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "detail" in data
        assert "invalid" in data["detail"].lower() or "used" in data["detail"].lower()
        print(f"✓ Registration with invalid code returns 400: {data['detail']}")


class TestAdminMemberManagement:
    """Admin member management tests - requires admin auth"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
        self.admin_token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
        print(f"✓ Admin authenticated successfully")
    
    def test_admin_get_members_list(self):
        """GET /api/admin/members returns member list (admin auth required)"""
        response = requests.get(f"{BASE_URL}/api/admin/members", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of members"
        print(f"✓ Admin can list members: {len(data)} members found")
        return data
    
    def test_admin_get_members_without_auth(self):
        """GET /api/admin/members returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/admin/members")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Admin members endpoint requires authentication")
    
    def test_admin_create_member(self):
        """POST /api/admin/members creates a new member (admin auth required)"""
        unique_id = uuid.uuid4().hex[:8]
        member_data = {
            "email": f"TEST_member_{unique_id}@example.com",
            "first_name": "TEST",
            "last_name": f"Member{unique_id}",
            "password": "TestPass123!",
            "gender": "Male",
            "phone": "1234567890"
        }
        response = requests.post(f"{BASE_URL}/api/admin/members", json=member_data, headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "member_id" in data, "Response should contain member_id"
        assert "membership_id" in data, "Response should contain membership_id"
        # Email is lowercased by backend
        assert data["email"] == member_data["email"].lower()
        assert data["first_name"] == member_data["first_name"]
        assert "password_hash" not in data, "Password hash should not be returned"
        
        print(f"✓ Admin created member: {data['membership_id']} ({data['email']})")
        
        # Cleanup - delete the test member
        member_id = data["member_id"]
        cleanup_response = requests.delete(f"{BASE_URL}/api/admin/members/{member_id}", headers=self.headers)
        assert cleanup_response.status_code == 200, f"Cleanup failed: {cleanup_response.status_code}"
        print(f"✓ Test member cleaned up")
    
    def test_admin_create_member_without_auth(self):
        """POST /api/admin/members returns 401 without auth"""
        response = requests.post(f"{BASE_URL}/api/admin/members", json={
            "email": "test@example.com",
            "first_name": "Test",
            "last_name": "User"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Admin create member requires authentication")
    
    def test_admin_create_member_duplicate_email(self):
        """POST /api/admin/members returns 400 for duplicate email"""
        unique_id = uuid.uuid4().hex[:8]
        member_data = {
            "email": f"TEST_dup_{unique_id}@example.com",
            "first_name": "TEST",
            "last_name": "Duplicate"
        }
        # Create first member
        response1 = requests.post(f"{BASE_URL}/api/admin/members", json=member_data, headers=self.headers)
        assert response1.status_code == 200, f"First create failed: {response1.status_code}"
        member_id = response1.json()["member_id"]
        
        # Try to create duplicate
        response2 = requests.post(f"{BASE_URL}/api/admin/members", json=member_data, headers=self.headers)
        assert response2.status_code == 400, f"Expected 400 for duplicate, got {response2.status_code}"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/members/{member_id}", headers=self.headers)
        print("✓ Duplicate email returns 400")


class TestFullMembershipFlow:
    """End-to-end membership flow tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.status_code}")
        self.admin_token = response.json().get("token")
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        self.created_member_id = None
    
    def test_full_membership_flow(self):
        """
        Full flow: Admin creates member -> Member logs in -> Member generates invite codes
        """
        unique_id = uuid.uuid4().hex[:8]
        test_email = f"TEST_flow_{unique_id}@example.com"
        test_password = "FlowTest123!"
        
        # Step 1: Admin creates a member
        print("\n--- Step 1: Admin creates member ---")
        create_response = requests.post(f"{BASE_URL}/api/admin/members", json={
            "email": test_email,
            "first_name": "TEST",
            "last_name": f"FlowUser{unique_id}",
            "password": test_password,
            "gender": "Male"
        }, headers=self.admin_headers)
        assert create_response.status_code == 200, f"Create failed: {create_response.status_code}: {create_response.text}"
        
        member_data = create_response.json()
        self.created_member_id = member_data["member_id"]
        membership_id = member_data["membership_id"]
        username = member_data["username"]
        print(f"✓ Created member: {membership_id} (username: {username})")
        
        # Step 2: Member logs in (use lowercase email as backend lowercases it)
        print("\n--- Step 2: Member logs in ---")
        login_response = requests.post(f"{BASE_URL}/api/member/login", json={
            "username": test_email.lower(),  # Email is lowercased by backend
            "password": test_password
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.status_code}: {login_response.text}"
        
        login_data = login_response.json()
        assert "token" in login_data, "Login should return token"
        assert "member" in login_data, "Login should return member data"
        member_token = login_data["token"]
        member_headers = {"Authorization": f"Bearer {member_token}"}
        print(f"✓ Member logged in successfully")
        
        # Step 3: Member gets their profile
        print("\n--- Step 3: Member gets profile ---")
        me_response = requests.get(f"{BASE_URL}/api/member/me", headers=member_headers)
        assert me_response.status_code == 200, f"Get profile failed: {me_response.status_code}"
        profile = me_response.json()
        assert profile["email"] == test_email.lower()  # Email is lowercased by backend
        print(f"✓ Member profile retrieved: {profile['membership_id']}")
        
        # Step 4: Member generates invite codes
        print("\n--- Step 4: Member generates invite codes ---")
        codes_response = requests.post(f"{BASE_URL}/api/member/invite-codes/generate", 
            json={"count": 2}, headers=member_headers)
        assert codes_response.status_code == 200, f"Generate codes failed: {codes_response.status_code}: {codes_response.text}"
        
        codes = codes_response.json()
        assert isinstance(codes, list), "Should return list of codes"
        assert len(codes) == 2, f"Expected 2 codes, got {len(codes)}"
        print(f"✓ Generated {len(codes)} invite codes: {[c['code'] for c in codes]}")
        
        # Step 5: Member lists their invite codes
        print("\n--- Step 5: Member lists invite codes ---")
        list_response = requests.get(f"{BASE_URL}/api/member/invite-codes", headers=member_headers)
        assert list_response.status_code == 200, f"List codes failed: {list_response.status_code}"
        listed_codes = list_response.json()
        assert len(listed_codes) >= 2, f"Expected at least 2 codes, got {len(listed_codes)}"
        print(f"✓ Listed {len(listed_codes)} invite codes")
        
        # Step 6: Validate one of the generated codes
        print("\n--- Step 6: Validate generated code ---")
        test_code = codes[0]["code"]
        validate_response = requests.get(f"{BASE_URL}/api/member/validate-code/{test_code}")
        assert validate_response.status_code == 200, f"Validate failed: {validate_response.status_code}"
        validate_data = validate_response.json()
        assert validate_data["valid"] == True
        assert validate_data["sponsor_membership_id"] == membership_id
        print(f"✓ Code {test_code} is valid, sponsor: {validate_data['sponsor_membership_id']}")
        
        # Step 7: Member gets community (should be empty initially)
        print("\n--- Step 7: Member gets community ---")
        community_response = requests.get(f"{BASE_URL}/api/member/my-community", headers=member_headers)
        assert community_response.status_code == 200, f"Get community failed: {community_response.status_code}"
        community = community_response.json()
        assert "tree" in community
        assert "total_invites" in community
        print(f"✓ Community retrieved: {community['total_invites']} total invites, {community['used_invites']} used")
        
        # Cleanup
        print("\n--- Cleanup ---")
        delete_response = requests.delete(f"{BASE_URL}/api/admin/members/{self.created_member_id}", 
            headers=self.admin_headers)
        assert delete_response.status_code == 200, f"Cleanup failed: {delete_response.status_code}"
        print(f"✓ Test member deleted")


class TestMemberPortfolios:
    """Member portfolio CRUD tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Create a test member and get their token"""
        # Admin login
        admin_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if admin_response.status_code != 200:
            pytest.skip("Admin login failed")
        self.admin_token = admin_response.json().get("token")
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Create test member
        unique_id = uuid.uuid4().hex[:8]
        self.test_email = f"TEST_portfolio_{unique_id}@example.com"
        self.test_password = "PortfolioTest123!"
        
        create_response = requests.post(f"{BASE_URL}/api/admin/members", json={
            "email": self.test_email,
            "first_name": "TEST",
            "last_name": f"Portfolio{unique_id}",
            "password": self.test_password
        }, headers=self.admin_headers)
        
        if create_response.status_code != 200:
            pytest.skip(f"Failed to create test member: {create_response.text}")
        
        self.member_data = create_response.json()
        self.member_id = self.member_data["member_id"]
        
        # Member login
        login_response = requests.post(f"{BASE_URL}/api/member/login", json={
            "username": self.test_email.lower(),  # Email is lowercased by backend
            "password": self.test_password
        })
        if login_response.status_code != 200:
            pytest.skip(f"Member login failed: {login_response.text}")
        
        self.member_token = login_response.json()["token"]
        self.member_headers = {"Authorization": f"Bearer {self.member_token}"}
        
        yield
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/members/{self.member_id}", headers=self.admin_headers)
    
    def test_portfolio_crud(self):
        """Test portfolio create, read, update, delete"""
        # Create portfolio
        print("\n--- Create Portfolio ---")
        portfolio_data = {
            "title": "TEST Portfolio",
            "description": "Test portfolio for automated testing",
            "cash_balance": 10000.00,
            "holdings": [
                {"symbol": "AAPL", "shares": 10, "price": 150.00},
                {"symbol": "GOOGL", "shares": 5, "price": 2800.00}
            ],
            "status": "active"
        }
        create_response = requests.post(f"{BASE_URL}/api/member/portfolios", 
            json=portfolio_data, headers=self.member_headers)
        assert create_response.status_code == 200, f"Create failed: {create_response.status_code}: {create_response.text}"
        
        created = create_response.json()
        assert "id" in created
        portfolio_id = created["id"]
        assert created["title"] == portfolio_data["title"]
        print(f"✓ Created portfolio: {portfolio_id}")
        
        # Read portfolio
        print("\n--- Read Portfolio ---")
        get_response = requests.get(f"{BASE_URL}/api/member/portfolios/{portfolio_id}", 
            headers=self.member_headers)
        assert get_response.status_code == 200, f"Get failed: {get_response.status_code}"
        fetched = get_response.json()
        assert fetched["title"] == portfolio_data["title"]
        print(f"✓ Retrieved portfolio: {fetched['title']}")
        
        # List portfolios
        print("\n--- List Portfolios ---")
        list_response = requests.get(f"{BASE_URL}/api/member/portfolios", headers=self.member_headers)
        assert list_response.status_code == 200, f"List failed: {list_response.status_code}"
        portfolios = list_response.json()
        assert "own" in portfolios
        assert len(portfolios["own"]) >= 1
        print(f"✓ Listed portfolios: {len(portfolios['own'])} own, {len(portfolios.get('shared', []))} shared")
        
        # Update portfolio
        print("\n--- Update Portfolio ---")
        update_data = {"title": "TEST Portfolio Updated", "cash_balance": 15000.00}
        update_response = requests.put(f"{BASE_URL}/api/member/portfolios/{portfolio_id}", 
            json=update_data, headers=self.member_headers)
        assert update_response.status_code == 200, f"Update failed: {update_response.status_code}"
        updated = update_response.json()
        assert updated["title"] == update_data["title"]
        assert updated["cash_balance"] == update_data["cash_balance"]
        print(f"✓ Updated portfolio: {updated['title']}")
        
        # Delete portfolio
        print("\n--- Delete Portfolio ---")
        delete_response = requests.delete(f"{BASE_URL}/api/member/portfolios/{portfolio_id}", 
            headers=self.member_headers)
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.status_code}"
        print(f"✓ Deleted portfolio")
        
        # Verify deletion
        verify_response = requests.get(f"{BASE_URL}/api/member/portfolios/{portfolio_id}", 
            headers=self.member_headers)
        assert verify_response.status_code == 404, f"Expected 404 after delete, got {verify_response.status_code}"
        print(f"✓ Verified portfolio deleted (404)")


class TestMemberBiography:
    """Member biography update tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Create a test member"""
        admin_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if admin_response.status_code != 200:
            pytest.skip("Admin login failed")
        self.admin_token = admin_response.json().get("token")
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        unique_id = uuid.uuid4().hex[:8]
        self.test_email = f"TEST_bio_{unique_id}@example.com"
        self.test_password = "BioTest123!"
        
        create_response = requests.post(f"{BASE_URL}/api/admin/members", json={
            "email": self.test_email,
            "first_name": "TEST",
            "last_name": f"Bio{unique_id}",
            "password": self.test_password
        }, headers=self.admin_headers)
        
        if create_response.status_code != 200:
            pytest.skip(f"Failed to create test member")
        
        self.member_id = create_response.json()["member_id"]
        
        login_response = requests.post(f"{BASE_URL}/api/member/login", json={
            "username": self.test_email.lower(),  # Email is lowercased by backend
            "password": self.test_password
        })
        if login_response.status_code != 200:
            pytest.skip(f"Member login failed: {login_response.text}")
        self.member_token = login_response.json()["token"]
        self.member_headers = {"Authorization": f"Bearer {self.member_token}"}
        
        yield
        
        requests.delete(f"{BASE_URL}/api/admin/members/{self.member_id}", headers=self.admin_headers)
    
    def test_update_biography(self):
        """PUT /api/member/biography updates member biography"""
        bio_data = {
            "summary": "TEST summary for automated testing",
            "biography": "TEST full biography content for automated testing"
        }
        response = requests.put(f"{BASE_URL}/api/member/biography", 
            json=bio_data, headers=self.member_headers)
        assert response.status_code == 200, f"Update failed: {response.status_code}: {response.text}"
        
        # Verify update
        me_response = requests.get(f"{BASE_URL}/api/member/me", headers=self.member_headers)
        assert me_response.status_code == 200
        profile = me_response.json()
        assert profile["summary"] == bio_data["summary"]
        assert profile["biography"] == bio_data["biography"]
        print(f"✓ Biography updated and verified")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
