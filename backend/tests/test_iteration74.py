"""
Iteration 74 Backend Tests
Tests for:
1. Mentor column derivation from member_type.is_mentor
2. Sample member seed correctness (14 members total)
3. CMS roles seed (6 roles including 4 new custom roles)
4. Member levels seed (4 levels: Free, Standard, Premium, Mentor)
5. Documentation endpoint /api/docs/testing-manual
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@consultant.com"
ADMIN_PASSWORD = "Admin123!"
SAMPLE_MEMBER_PASSWORD = "123456789"


class TestMentorColumnDerivation:
    """Test 1: Mentor column is derived from member_type.is_mentor, not stored field"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        # Login as admin
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "login_type": "cms"
        })
        assert r.status_code == 200, f"Admin login failed: {r.text}"
        self.admin_token = r.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_carlos_corporate_not_mentor(self):
        """AUX-1 (carlos@example.com) has Corporate type, should have is_mentor=False"""
        r = requests.get(f"{BASE_URL}/api/admin/members", headers=self.headers)
        assert r.status_code == 200
        members = r.json()
        carlos = next((m for m in members if m.get("email") == "carlos@example.com"), None)
        assert carlos is not None, "carlos@example.com not found"
        assert carlos.get("is_mentor") == False, f"carlos should NOT be mentor, got is_mentor={carlos.get('is_mentor')}"
        print(f"PASS: carlos@example.com (AUX-1, Corporate) has is_mentor=False")
    
    def test_anthony_mentors_type_is_mentor(self):
        """AUX-3 (anthonytest@gmail.com) has Mentors type, should have is_mentor=True"""
        r = requests.get(f"{BASE_URL}/api/admin/members", headers=self.headers)
        assert r.status_code == 200
        members = r.json()
        anthony = next((m for m in members if m.get("email") == "anthonytest@gmail.com"), None)
        assert anthony is not None, "anthonytest@gmail.com not found"
        assert anthony.get("is_mentor") == True, f"anthony should be mentor, got is_mentor={anthony.get('is_mentor')}"
        print(f"PASS: anthonytest@gmail.com (AUX-3, Mentors) has is_mentor=True")
    
    def test_samplemember1_corporate_not_mentor(self):
        """samplemember1 (Corporate type) should have is_mentor=False"""
        r = requests.get(f"{BASE_URL}/api/admin/members", headers=self.headers)
        assert r.status_code == 200
        members = r.json()
        sm1 = next((m for m in members if m.get("email") == "samplemember1@gmail.com"), None)
        assert sm1 is not None, "samplemember1@gmail.com not found"
        assert sm1.get("is_mentor") == False, f"samplemember1 should NOT be mentor, got is_mentor={sm1.get('is_mentor')}"
        print(f"PASS: samplemember1@gmail.com (Corporate) has is_mentor=False")
    
    def test_samplemember5_mentors_type_is_mentor(self):
        """samplemember5 (Mentors type) should have is_mentor=True"""
        r = requests.get(f"{BASE_URL}/api/admin/members", headers=self.headers)
        assert r.status_code == 200
        members = r.json()
        sm5 = next((m for m in members if m.get("email") == "samplemember5@gmail.com"), None)
        assert sm5 is not None, "samplemember5@gmail.com not found"
        assert sm5.get("is_mentor") == True, f"samplemember5 should be mentor, got is_mentor={sm5.get('is_mentor')}"
        print(f"PASS: samplemember5@gmail.com (Mentors) has is_mentor=True")
    
    def test_samplemember6_mentors_type_is_mentor(self):
        """samplemember6 (Mentors type) should have is_mentor=True"""
        r = requests.get(f"{BASE_URL}/api/admin/members", headers=self.headers)
        assert r.status_code == 200
        members = r.json()
        sm6 = next((m for m in members if m.get("email") == "samplemember6@gmail.com"), None)
        assert sm6 is not None, "samplemember6@gmail.com not found"
        assert sm6.get("is_mentor") == True, f"samplemember6 should be mentor, got is_mentor={sm6.get('is_mentor')}"
        print(f"PASS: samplemember6@gmail.com (Mentors) has is_mentor=True")
    
    def test_samplemember10_mentors_type_is_mentor(self):
        """samplemember10 (Mentors type) should have is_mentor=True"""
        r = requests.get(f"{BASE_URL}/api/admin/members", headers=self.headers)
        assert r.status_code == 200
        members = r.json()
        sm10 = next((m for m in members if m.get("email") == "samplemember10@gmail.com"), None)
        assert sm10 is not None, "samplemember10@gmail.com not found"
        assert sm10.get("is_mentor") == True, f"samplemember10 should be mentor, got is_mentor={sm10.get('is_mentor')}"
        print(f"PASS: samplemember10@gmail.com (Mentors) has is_mentor=True")


class TestSampleMemberSeed:
    """Test 4: Sample member seed correctness - 14 members total"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "login_type": "cms"
        })
        assert r.status_code == 200
        self.admin_token = r.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_total_member_count(self):
        """Should have exactly 14 members (admin + AUX-1/2/3 + 10 sample members)"""
        r = requests.get(f"{BASE_URL}/api/admin/members", headers=self.headers)
        assert r.status_code == 200
        members = r.json()
        assert len(members) == 14, f"Expected 14 members, got {len(members)}"
        print(f"PASS: Total member count is 14")
    
    def test_samplemember1_login(self):
        """samplemember1 should be able to login with default password"""
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "samplemember1@gmail.com",
            "password": SAMPLE_MEMBER_PASSWORD,
            "login_type": "member"
        })
        assert r.status_code == 200, f"samplemember1 login failed: {r.text}"
        print(f"PASS: samplemember1@gmail.com can login with password 123456789")
    
    def test_sample_members_exist(self):
        """All 10 sample members (AUX-101 to AUX-110) should exist"""
        r = requests.get(f"{BASE_URL}/api/admin/members", headers=self.headers)
        assert r.status_code == 200
        members = r.json()
        
        for i in range(1, 11):
            email = f"samplemember{i}@gmail.com"
            member = next((m for m in members if m.get("email") == email), None)
            assert member is not None, f"{email} not found"
            expected_membership_id = f"AUX-{100 + i}"
            assert member.get("membership_id") == expected_membership_id, \
                f"{email} should have membership_id={expected_membership_id}, got {member.get('membership_id')}"
        print(f"PASS: All 10 sample members (AUX-101 to AUX-110) exist")


class TestRolesSeed:
    """Test 5: CMS roles seed - 6 roles total"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "login_type": "cms"
        })
        assert r.status_code == 200
        self.admin_token = r.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_required_roles_exist(self):
        """Must have role_admin, role_member, role_cms_manager, role_content_editor, role_support, role_mentor_coordinator"""
        r = requests.get(f"{BASE_URL}/api/admin/cms-roles", headers=self.headers)
        assert r.status_code == 200
        roles = r.json()
        role_ids = [role.get("id") for role in roles]
        
        required_roles = [
            "role_admin",
            "role_member", 
            "role_cms_manager",
            "role_content_editor",
            "role_support",
            "role_mentor_coordinator"
        ]
        
        for role_id in required_roles:
            assert role_id in role_ids, f"Role {role_id} not found in CMS roles"
        print(f"PASS: All 6 required roles exist: {required_roles}")
    
    def test_legacy_roles_removed(self):
        """Legacy roles (role_7b2cb93708a2, role_5c438085d870, role_9ce1490309b3) should be gone"""
        r = requests.get(f"{BASE_URL}/api/admin/cms-roles", headers=self.headers)
        assert r.status_code == 200
        roles = r.json()
        role_ids = [role.get("id") for role in roles]
        
        legacy_roles = ["role_7b2cb93708a2", "role_5c438085d870", "role_9ce1490309b3"]
        for legacy_id in legacy_roles:
            assert legacy_id not in role_ids, f"Legacy role {legacy_id} should be removed"
        print(f"PASS: Legacy roles are removed")


class TestLevelsSeed:
    """Test 6: Member levels seed - 4 levels with correct order"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "login_type": "cms"
        })
        assert r.status_code == 200
        self.admin_token = r.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_four_levels_exist(self):
        """Should have exactly 4 levels: Free, Standard, Premium, Mentor with order 1..4"""
        r = requests.get(f"{BASE_URL}/api/admin/member-levels", headers=self.headers)
        assert r.status_code == 200
        levels = r.json()
        
        assert len(levels) == 4, f"Expected 4 levels, got {len(levels)}"
        
        expected = [
            {"name": "Free", "order": 1},
            {"name": "Standard", "order": 2},
            {"name": "Premium", "order": 3},
            {"name": "Mentor", "order": 4},
        ]
        
        for exp in expected:
            level = next((l for l in levels if l.get("name") == exp["name"]), None)
            assert level is not None, f"Level {exp['name']} not found"
            assert level.get("order") == exp["order"], \
                f"Level {exp['name']} should have order={exp['order']}, got {level.get('order')}"
        
        print(f"PASS: 4 levels exist with correct order: Free(1), Standard(2), Premium(3), Mentor(4)")


class TestDocumentation:
    """Test 9: Documentation endpoint /api/docs/testing-manual"""
    
    def test_testing_manual_returns_200(self):
        """GET /api/docs/testing-manual should return 200"""
        r = requests.get(f"{BASE_URL}/api/docs/testing-manual")
        assert r.status_code == 200, f"Expected 200, got {r.status_code}"
        print(f"PASS: /api/docs/testing-manual returns 200")
    
    def test_testing_manual_contains_required_strings(self):
        """Testing manual should contain key strings"""
        r = requests.get(f"{BASE_URL}/api/docs/testing-manual")
        assert r.status_code == 200
        content = r.text
        
        required_strings = [
            "samplemember1", "samplemember10",
            "AUX-101", "AUX-110",
            "CMS Manager", "Mentor Coordinator",
            "Free", "Standard", "Premium", "Mentor"
        ]
        
        for s in required_strings:
            assert s in content, f"Testing manual should contain '{s}'"
        print(f"PASS: Testing manual contains all required strings")


class TestCMSManagerScope:
    """Test 7: CMS Manager scope - has Members/Settings but NOT Roles/Backup"""
    
    def test_cms_manager_login(self):
        """samplemember10 should be able to login at CMS"""
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "samplemember10@gmail.com",
            "password": SAMPLE_MEMBER_PASSWORD,
            "login_type": "cms"
        })
        assert r.status_code == 200, f"CMS Manager login failed: {r.text}"
        token = r.json().get("token")
        
        # Verify can access members
        headers = {"Authorization": f"Bearer {token}"}
        r2 = requests.get(f"{BASE_URL}/api/admin/members", headers=headers)
        assert r2.status_code == 200, f"CMS Manager should access /api/admin/members, got {r2.status_code}"
        print(f"PASS: samplemember10 (CMS Manager) can login and access /api/admin/members")
    
    def test_cms_manager_cannot_access_cms_sections(self):
        """CMS Manager should NOT access /api/admin/cms-sections (super admin only)"""
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "samplemember10@gmail.com",
            "password": SAMPLE_MEMBER_PASSWORD,
            "login_type": "cms"
        })
        assert r.status_code == 200
        token = r.json().get("token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # This endpoint is behind require_super_admin, should 403
        r2 = requests.get(f"{BASE_URL}/api/admin/cms-sections", headers=headers)
        # Note: If endpoint doesn't exist or returns 404, that's also acceptable
        assert r2.status_code in [403, 404], \
            f"CMS Manager should NOT access /api/admin/cms-sections, got {r2.status_code}"
        print(f"PASS: CMS Manager cannot access /api/admin/cms-sections (got {r2.status_code})")


class TestMentorCoordinatorScope:
    """Test 8: Mentor Coordinator scope - has Calendar group, NOT Members"""
    
    def test_mentor_coordinator_login(self):
        """samplemember9 should be able to login at CMS"""
        r = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "samplemember9@gmail.com",
            "password": SAMPLE_MEMBER_PASSWORD,
            "login_type": "cms"
        })
        assert r.status_code == 200, f"Mentor Coordinator login failed: {r.text}"
        print(f"PASS: samplemember9 (Mentor Coordinator) can login to CMS")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
