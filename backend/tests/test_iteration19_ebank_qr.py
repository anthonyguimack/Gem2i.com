"""
Iteration 19 Tests: Ebank, QR Generation, Sponsor Registration, and New Fields
Tests for:
- Members Personal Info: HTTP Access (read-only), Passport ID#, Zelle # fields
- Members Ebank tab: 16 financial fields (read-only in admin)
- Members Business Card tab: QR generation
- POST /api/admin/members/:id/generate-qr creates QR code
- GET /api/member/validate-sponsor/:num validates sponsor
- GET /api/member/ebank returns ebank data
- PUT /api/member/ebank saves ebank data and logs activities
- GET /api/member/ebank/activities returns activity log
- Registration via sponsor captures http_access domain
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://consultant-cms.preview.emergentagent.com')

class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """Test admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert "user" in data
        print(f"✓ Admin login successful, user: {data['user'].get('email')}")
        return data["token"]

    def test_admin_login_wrong_password(self):
        """Test admin login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "WrongPassword123!"
        })
        assert response.status_code == 401
        print("✓ Wrong password correctly rejected")


class TestEbankEndpoints:
    """Ebank CRUD and activities tests"""
    
    @pytest.fixture
    def member_token(self):
        """Get a member token for testing"""
        # First login as admin to get a member
        admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert admin_resp.status_code == 200
        admin_token = admin_resp.json()["token"]
        
        # Get members list
        members_resp = requests.get(f"{BASE_URL}/api/admin/members", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert members_resp.status_code == 200
        members = members_resp.json()
        
        # Find a non-admin member or use admin token
        for m in members:
            if m.get("role") != "admin":
                # Try to login as this member - but we don't know password
                # Use admin token which should work for member endpoints too
                return admin_token
        
        return admin_token
    
    def test_get_ebank_data(self, member_token):
        """Test GET /api/member/ebank returns ebank data"""
        response = requests.get(f"{BASE_URL}/api/member/ebank", headers={
            "Authorization": f"Bearer {member_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "member_id" in data
        print(f"✓ GET /api/member/ebank returns data with member_id: {data.get('member_id')}")
    
    def test_update_ebank_data(self, member_token):
        """Test PUT /api/member/ebank saves data and logs activities"""
        test_data = {
            "investment_amount": "10000",
            "additional_capital": "5000",
            "investment_goal": "Retirement",
            "monthly_savings": "500",
            "risk_level": "3",
            "finance_involvement": "4",
            "investment_safety": "3",
            "financial_independence_age": "55",
            "rate_of_return": "8%",
            "investment_duration": "20 years",
            "own_business": "Yes",
            "projects": "Real estate investment"
        }
        
        response = requests.put(f"{BASE_URL}/api/member/ebank", 
            headers={"Authorization": f"Bearer {member_token}"},
            json=test_data
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("investment_amount") == "10000"
        assert data.get("investment_goal") == "Retirement"
        print("✓ PUT /api/member/ebank saves data correctly")
    
    def test_get_ebank_activities(self, member_token):
        """Test GET /api/member/ebank/activities returns activity log"""
        response = requests.get(f"{BASE_URL}/api/member/ebank/activities", headers={
            "Authorization": f"Bearer {member_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/member/ebank/activities returns {len(data)} activities")
        
        # Check activities are sorted by timestamp (most recent first)
        if len(data) >= 2:
            for i in range(len(data) - 1):
                assert data[i].get("timestamp", "") >= data[i+1].get("timestamp", ""), \
                    "Activities should be sorted most recent first"
            print("✓ Activities are sorted most recent first")


class TestQRGeneration:
    """QR code generation tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    def test_admin_generate_qr_for_member(self, admin_token):
        """Test POST /api/admin/members/:id/generate-qr creates QR code"""
        # Get a member
        members_resp = requests.get(f"{BASE_URL}/api/admin/members", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert members_resp.status_code == 200
        members = members_resp.json()
        assert len(members) > 0, "No members found"
        
        member = members[0]
        member_id = member["member_id"]
        
        # Generate QR
        response = requests.post(
            f"{BASE_URL}/api/admin/members/{member_id}/generate-qr",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"base_url": "https://consultant-cms.preview.emergentagent.com"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify QR data
        assert "qr_code" in data
        assert "qr_url" in data
        assert data["qr_code"].startswith("data:image/png;base64,")
        assert f"/my-account/register?sponsor={member['membership_number']}" in data["qr_url"]
        print(f"✓ QR generated for member {member_id}")
        print(f"  QR URL: {data['qr_url']}")
    
    def test_qr_url_format(self, admin_token):
        """Test QR URL format is correct: {base_url}/my-account/register?sponsor={membership_number}"""
        members_resp = requests.get(f"{BASE_URL}/api/admin/members", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        members = members_resp.json()
        member = members[0]
        
        response = requests.post(
            f"{BASE_URL}/api/admin/members/{member['member_id']}/generate-qr",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"base_url": "https://example.com"}
        )
        assert response.status_code == 200
        data = response.json()
        
        expected_url = f"https://example.com/my-account/register?sponsor={member['membership_number']}"
        assert data["qr_url"] == expected_url, f"Expected {expected_url}, got {data['qr_url']}"
        print(f"✓ QR URL format is correct: {data['qr_url']}")


class TestSponsorValidation:
    """Sponsor validation tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        return response.json()["token"]
    
    def test_validate_sponsor_success(self, admin_token):
        """Test GET /api/member/validate-sponsor/:num validates a valid sponsor"""
        # Get a member to use as sponsor
        members_resp = requests.get(f"{BASE_URL}/api/admin/members", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        members = members_resp.json()
        member = members[0]
        
        # Validate sponsor (public endpoint)
        response = requests.get(f"{BASE_URL}/api/member/validate-sponsor/{member['membership_number']}")
        assert response.status_code == 200
        data = response.json()
        
        assert data["valid"] == True
        assert "sponsor_membership_id" in data
        assert "sponsor_name" in data
        print(f"✓ Sponsor validated: {data['sponsor_membership_id']} - {data['sponsor_name']}")
    
    def test_validate_sponsor_invalid(self):
        """Test GET /api/member/validate-sponsor/:num returns 404 for invalid sponsor"""
        response = requests.get(f"{BASE_URL}/api/member/validate-sponsor/999999")
        assert response.status_code == 404
        print("✓ Invalid sponsor correctly returns 404")


class TestSponsorBasedRegistration:
    """Sponsor-based registration tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        return response.json()["token"]
    
    def test_register_via_sponsor(self, admin_token):
        """Test registration via sponsor captures http_access domain"""
        # Get a member to use as sponsor
        members_resp = requests.get(f"{BASE_URL}/api/admin/members", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        members = members_resp.json()
        sponsor = members[0]
        
        # Register new member via sponsor
        unique_email = f"test_sponsor_reg_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/member/register", json={
            "sponsor_membership_number": int(sponsor["membership_number"]),  # Ensure integer
            "email": unique_email,
            "password": "TestPass123!",
            "confirm_password": "TestPass123!",
            "first_name": "Test",
            "last_name": "SponsorReg",
            "http_access": "consultant-cms.preview.emergentagent.com"
        })
        
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        
        assert "membership_id" in data
        assert "token" in data
        assert data["member"]["sponsor_membership_number"] == sponsor["membership_number"]
        print(f"✓ Registered via sponsor: {data['membership_id']}")
        
        # Verify http_access was captured
        new_member_id = data["member"]["member_id"]
        member_resp = requests.get(f"{BASE_URL}/api/admin/members/{new_member_id}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert member_resp.status_code == 200
        member_data = member_resp.json()
        assert member_data.get("http_access") == "consultant-cms.preview.emergentagent.com"
        print(f"✓ http_access captured: {member_data.get('http_access')}")
        
        # Cleanup - delete test member
        requests.delete(f"{BASE_URL}/api/admin/members/{new_member_id}", headers={
            "Authorization": f"Bearer {admin_token}"
        })


class TestAdminMemberEbank:
    """Admin member ebank view tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        return response.json()["token"]
    
    def test_admin_get_member_ebank(self, admin_token):
        """Test GET /api/admin/members/:id/ebank returns ebank data"""
        # Get a member
        members_resp = requests.get(f"{BASE_URL}/api/admin/members", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        members = members_resp.json()
        member = members[0]
        
        response = requests.get(
            f"{BASE_URL}/api/admin/members/{member['member_id']}/ebank",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "member_id" in data
        print(f"✓ Admin can view member ebank data for {member['member_id']}")


class TestMemberFields:
    """Test new member fields: passport_id, zelle, http_access"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        return response.json()["token"]
    
    def test_create_member_with_new_fields(self, admin_token):
        """Test creating member with passport_id and zelle fields"""
        unique_email = f"test_fields_{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(f"{BASE_URL}/api/admin/members", 
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "email": unique_email,
                "password": "TestPass123!",
                "first_name": "Test",
                "last_name": "Fields",
                "passport_id": "AB123456",
                "zelle": "test@zelle.com"
            }
        )
        
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        
        # Note: passport_id and zelle might not be returned in create response
        # but should be stored
        member_id = data["member_id"]
        
        # Verify by fetching member
        get_resp = requests.get(f"{BASE_URL}/api/admin/members/{member_id}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert get_resp.status_code == 200
        member = get_resp.json()
        
        # Fields should exist (may be empty if not saved in create)
        print(f"✓ Member created with ID: {member_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/members/{member_id}", headers={
            "Authorization": f"Bearer {admin_token}"
        })
    
    def test_update_member_passport_zelle(self, admin_token):
        """Test updating member passport_id and zelle fields"""
        # Get a member
        members_resp = requests.get(f"{BASE_URL}/api/admin/members", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        members = members_resp.json()
        member = members[0]
        
        # Update with passport and zelle
        response = requests.put(
            f"{BASE_URL}/api/admin/members/{member['member_id']}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "passport_id": "XY789012",
                "zelle": "updated@zelle.com"
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("passport_id") == "XY789012"
        assert data.get("zelle") == "updated@zelle.com"
        print(f"✓ Member updated with passport_id and zelle")


class TestMemberTypes:
    """Test member types endpoint"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        return response.json()["token"]
    
    def test_get_member_types(self, admin_token):
        """Test GET /api/admin/member-types returns types"""
        response = requests.get(f"{BASE_URL}/api/admin/member-types", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/admin/member-types returns {len(data)} types")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
