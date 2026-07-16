"""
Test Unified Auth System - Iteration 6
Tests the unified login system where users and members are the same entity in 'members' collection.
Admin is a member with role='admin'.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from backend/.env
ADMIN_EMAIL = "admin@consultant.com"
ADMIN_PASSWORD = "Admin123!"


class TestAdminLogin:
    """Test admin login via unified /api/auth/login endpoint"""
    
    def test_admin_login_returns_token_and_user_data(self):
        """Admin login via POST /api/auth/login returns token and user data with role='admin' and member_id"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response should contain token"
        assert "user" in data, "Response should contain user data"
        
        user = data["user"]
        assert user.get("role") == "admin", f"Expected role='admin', got {user.get('role')}"
        assert "member_id" in user, "User should have member_id field"
        assert "membership_id" in user, "User should have membership_id field"
        assert user.get("email") == ADMIN_EMAIL, f"Expected email={ADMIN_EMAIL}"
        
        print(f"✓ Admin login successful: member_id={user['member_id']}, membership_id={user['membership_id']}")
        return data["token"]
    
    def test_admin_login_invalid_credentials(self):
        """Admin login with wrong password returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected")


class TestAuthMe:
    """Test /api/auth/me endpoint returns member data from members collection"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_auth_me_returns_member_data(self, admin_token):
        """GET /api/auth/me returns member data with member_id and membership_id fields"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "member_id" in data, "Response should have member_id"
        assert "membership_id" in data, "Response should have membership_id"
        assert data.get("role") == "admin", "Admin should have role='admin'"
        assert "password_hash" not in data, "password_hash should not be exposed"
        
        print(f"✓ /api/auth/me returns member data: member_id={data['member_id']}")
    
    def test_auth_me_without_token_returns_401(self):
        """GET /api/auth/me without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Unauthenticated request correctly rejected")


class TestAdminEndpoints:
    """Test admin can access admin endpoints after login"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_admin_dashboard_access(self, admin_token):
        """Admin can access /api/admin/dashboard"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("✓ Admin can access /api/admin/dashboard")
    
    def test_admin_members_list(self, admin_token):
        """Admin can access /api/admin/members to see member list"""
        response = requests.get(f"{BASE_URL}/api/admin/members", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        # Admin should be in the list
        admin_found = any(m.get("email") == ADMIN_EMAIL for m in data)
        assert admin_found, "Admin should be in members list"
        
        print(f"✓ Admin can access /api/admin/members, found {len(data)} members")
    
    def test_admin_dashboard_without_token_returns_401(self):
        """Admin dashboard without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Unauthenticated admin request correctly rejected")


class TestMemberRegistration:
    """Test member registration returns token for auto-login"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture
    def invite_code(self, admin_token):
        """Generate an invite code for testing"""
        response = requests.post(f"{BASE_URL}/api/member/invite-codes/generate", 
            json={"count": 1},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to generate invite code: {response.text}"
        codes = response.json()
        return codes[0]["code"]
    
    def test_member_register_returns_token(self, invite_code):
        """POST /api/member/register returns a token for auto-login"""
        import uuid
        test_email = f"test_register_{uuid.uuid4().hex[:8]}@example.com"
        
        response = requests.post(f"{BASE_URL}/api/member/register", json={
            "invite_code": invite_code,
            "first_name": "Test",
            "last_name": "User",
            "email": test_email,
            "password": "TestPass123!",
            "confirm_password": "TestPass123!"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Registration should return a token"
        assert "membership_id" in data, "Registration should return membership_id"
        assert "member" in data, "Registration should return member data"
        
        # Verify token works
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {data['token']}"
        })
        assert me_response.status_code == 200, "Token from registration should be valid"
        
        print(f"✓ Member registration returns token, membership_id={data['membership_id']}")
        
        # Cleanup - delete the test member
        admin_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        admin_token = admin_response.json()["token"]
        member_id = data["member"]["member_id"]
        requests.delete(f"{BASE_URL}/api/admin/members/{member_id}", headers={
            "Authorization": f"Bearer {admin_token}"
        })


class TestAdminMemberCreation:
    """Test admin can create members with password and mentor/portfolio fields"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_admin_create_member_with_password(self, admin_token):
        """Admin can create a member with password via /api/admin/members"""
        import uuid
        test_email = f"test_admin_create_{uuid.uuid4().hex[:8]}@example.com"
        
        response = requests.post(f"{BASE_URL}/api/admin/members", 
            json={
                "first_name": "Test",
                "last_name": "Member",
                "email": test_email,
                "password": "MemberPass123!",
                "is_mentor": False,
                "portfolio_development": False
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "member_id" in data, "Created member should have member_id"
        assert "membership_id" in data, "Created member should have membership_id"
        assert data.get("is_mentor") == False, "is_mentor should be False"
        assert data.get("portfolio_development") == False, "portfolio_development should be False"
        
        # Verify the new member can login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": "MemberPass123!"
        })
        assert login_response.status_code == 200, f"New member should be able to login: {login_response.text}"
        
        print(f"✓ Admin created member: {data['membership_id']}, member can login")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/members/{data['member_id']}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
    
    def test_admin_create_member_with_mentor_flag(self, admin_token):
        """Admin can create a member with is_mentor=True"""
        import uuid
        test_email = f"test_mentor_{uuid.uuid4().hex[:8]}@example.com"
        
        response = requests.post(f"{BASE_URL}/api/admin/members", 
            json={
                "first_name": "Test",
                "last_name": "Mentor",
                "email": test_email,
                "password": "MentorPass123!",
                "is_mentor": True,
                "portfolio_development": True
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("is_mentor") == True, "is_mentor should be True"
        assert data.get("portfolio_development") == True, "portfolio_development should be True"
        
        print(f"✓ Admin created mentor member with is_mentor=True, portfolio_development=True")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/members/{data['member_id']}", headers={
            "Authorization": f"Bearer {admin_token}"
        })


class TestFullMemberFlow:
    """Test full flow: Admin creates member -> member logs in -> accesses member area"""
    
    def test_full_member_creation_and_login_flow(self):
        """Full flow: Admin login -> create member -> member login -> access profile"""
        import uuid
        
        # Step 1: Admin login
        admin_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert admin_response.status_code == 200, "Admin login failed"
        admin_token = admin_response.json()["token"]
        print("✓ Step 1: Admin logged in")
        
        # Step 2: Admin creates a member
        test_email = f"test_flow_{uuid.uuid4().hex[:8]}@example.com"
        create_response = requests.post(f"{BASE_URL}/api/admin/members", 
            json={
                "first_name": "Flow",
                "last_name": "Test",
                "email": test_email,
                "password": "FlowTest123!"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code == 200, f"Member creation failed: {create_response.text}"
        member_data = create_response.json()
        member_id = member_data["member_id"]
        print(f"✓ Step 2: Admin created member {member_data['membership_id']}")
        
        # Step 3: Member logs in via unified auth
        member_login = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": "FlowTest123!"
        })
        assert member_login.status_code == 200, f"Member login failed: {member_login.text}"
        member_token = member_login.json()["token"]
        print("✓ Step 3: Member logged in via /api/auth/login")
        
        # Step 4: Member accesses their profile
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {member_token}"
        })
        assert me_response.status_code == 200, f"Member /me failed: {me_response.text}"
        me_data = me_response.json()
        assert me_data.get("email") == test_email.lower(), "Email should match"
        assert me_data.get("role") == "member", "Role should be 'member'"
        print("✓ Step 4: Member accessed profile via /api/auth/me")
        
        # Step 5: Member can access member-specific endpoints
        sponsor_response = requests.get(f"{BASE_URL}/api/member/my-sponsor", headers={
            "Authorization": f"Bearer {member_token}"
        })
        assert sponsor_response.status_code == 200, f"Member sponsor endpoint failed: {sponsor_response.text}"
        print("✓ Step 5: Member can access /api/member/my-sponsor")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/members/{member_id}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        print("✓ Cleanup: Test member deleted")


class TestInviteCodeValidation:
    """Test invite code validation endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_validate_invalid_code_returns_404(self):
        """GET /api/member/validate-code/{code} returns 404 for invalid code"""
        response = requests.get(f"{BASE_URL}/api/member/validate-code/INVALID-CODE-123")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Invalid invite code correctly returns 404")
    
    def test_validate_valid_code(self, admin_token):
        """GET /api/member/validate-code/{code} returns valid info for valid code"""
        # Generate a code
        gen_response = requests.post(f"{BASE_URL}/api/member/invite-codes/generate", 
            json={"count": 1},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert gen_response.status_code == 200
        code = gen_response.json()[0]["code"]
        
        # Validate it
        response = requests.get(f"{BASE_URL}/api/member/validate-code/{code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("valid") == True, "Code should be valid"
        assert "sponsor_membership_id" in data, "Should include sponsor info"
        
        print(f"✓ Valid invite code validated: sponsor={data['sponsor_membership_id']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
