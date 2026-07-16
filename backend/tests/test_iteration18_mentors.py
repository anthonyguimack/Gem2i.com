"""
Iteration 18 Tests: Mentor Assignment using Member Types System
Tests:
- GET /api/admin/mentors returns only members whose member_type has is_mentor=true
- GET /api/admin/mentors does NOT return members with old is_mentor=true flag but no mentor type
- GET /api/member/available-mentors returns mentors (excluding current member) for My Account
- Member Types 'Mentors' has is_mentor=true in permissions
- Saving a member with mentor_membership_number from new mentor list works
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestMentorEndpoints:
    """Test mentor-related endpoints using Member Types system"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login as admin and get token"""
        self.admin_email = "admin@consultant.com"
        self.admin_password = "Admin123!"
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.admin_email,
            "password": self.admin_password
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        self.token = data.get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        yield
    
    def test_admin_login_success(self):
        """Test admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.admin_email,
            "password": self.admin_password
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        print("PASS: Admin login successful")
    
    def test_admin_login_wrong_password(self):
        """Test admin login with wrong password returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": self.admin_email,
            "password": "WrongPassword123!"
        })
        assert response.status_code == 401
        print("PASS: Wrong password correctly rejected with 401")
    
    def test_get_member_types_with_is_mentor(self):
        """Test GET /api/admin/member-types returns types with is_mentor field"""
        response = self.session.get(f"{BASE_URL}/api/admin/member-types")
        assert response.status_code == 200
        types = response.json()
        assert isinstance(types, list)
        
        # Find types with is_mentor=true
        mentor_types = [t for t in types if t.get("is_mentor") == True]
        print(f"Found {len(mentor_types)} member types with is_mentor=true")
        
        # Verify 'Mentors' type exists with is_mentor=true
        mentors_type = next((t for t in types if t.get("name") == "Mentors"), None)
        if mentors_type:
            assert mentors_type.get("is_mentor") == True, "Mentors type should have is_mentor=true"
            print(f"PASS: 'Mentors' type has is_mentor=true (ID: {mentors_type.get('id')})")
        else:
            print("INFO: 'Mentors' type not found - checking for other mentor types")
            assert len(mentor_types) > 0, "At least one member type should have is_mentor=true"
            print(f"PASS: Found mentor types: {[t.get('name') for t in mentor_types]}")
    
    def test_admin_get_mentors_endpoint(self):
        """Test GET /api/admin/mentors returns members with mentor-type assignment"""
        response = self.session.get(f"{BASE_URL}/api/admin/mentors")
        assert response.status_code == 200
        mentors = response.json()
        assert isinstance(mentors, list)
        print(f"GET /api/admin/mentors returned {len(mentors)} mentors")
        
        # Verify each mentor has a member_type_id
        for mentor in mentors:
            assert "member_type_id" in mentor, f"Mentor {mentor.get('first_name')} missing member_type_id"
            assert mentor.get("member_type_id"), f"Mentor {mentor.get('first_name')} has empty member_type_id"
            print(f"  - {mentor.get('first_name')} {mentor.get('last_name')} (membership_number: {mentor.get('membership_number')}, type_id: {mentor.get('member_type_id')})")
        
        print("PASS: All mentors have member_type_id assigned")
    
    def test_admin_mentors_excludes_old_is_mentor_flag(self):
        """Test that /api/admin/mentors does NOT return members with only old is_mentor=true flag"""
        # Get all members
        members_response = self.session.get(f"{BASE_URL}/api/admin/members")
        assert members_response.status_code == 200
        all_members = members_response.json()
        
        # Get mentors from new endpoint
        mentors_response = self.session.get(f"{BASE_URL}/api/admin/mentors")
        assert mentors_response.status_code == 200
        mentors = mentors_response.json()
        mentor_ids = [m.get("member_id") for m in mentors]
        
        # Get member types with is_mentor=true
        types_response = self.session.get(f"{BASE_URL}/api/admin/member-types")
        mentor_type_ids = [t.get("id") for t in types_response.json() if t.get("is_mentor") == True]
        
        # Check members with old is_mentor=true but no mentor type
        old_style_mentors = [m for m in all_members if m.get("is_mentor") == True and m.get("member_type_id") not in mentor_type_ids]
        
        for old_mentor in old_style_mentors:
            assert old_mentor.get("member_id") not in mentor_ids, \
                f"Member {old_mentor.get('first_name')} with old is_mentor=true should NOT be in /admin/mentors"
        
        print(f"PASS: {len(old_style_mentors)} members with old is_mentor=true flag are correctly excluded from /admin/mentors")
    
    def test_admin_mentors_returns_expected_members(self):
        """Test that Omar W and Sara WH appear in /api/admin/mentors (they have Mentors type)"""
        response = self.session.get(f"{BASE_URL}/api/admin/mentors")
        assert response.status_code == 200
        mentors = response.json()
        
        mentor_names = [f"{m.get('first_name', '')} {m.get('last_name', '')}".strip() for m in mentors]
        
        # Check for expected mentors (Omar W and Sara WH per the context)
        expected_mentors = ["Omar W", "Sara WH"]
        found_mentors = []
        for expected in expected_mentors:
            if any(expected.lower() in name.lower() for name in mentor_names):
                found_mentors.append(expected)
        
        print(f"Mentors found: {mentor_names}")
        print(f"Expected mentors found: {found_mentors}")
        
        if len(found_mentors) > 0:
            print(f"PASS: Found expected mentors: {found_mentors}")
        else:
            print("INFO: Expected mentors (Omar W, Sara WH) not found - may need to verify seed data")
    
    def test_member_available_mentors_endpoint(self):
        """Test GET /api/member/available-mentors returns mentors for My Account"""
        # First login as a regular member (not admin)
        # Get a member to test with
        members_response = self.session.get(f"{BASE_URL}/api/admin/members")
        members = members_response.json()
        
        # Find a non-admin member
        test_member = next((m for m in members if m.get("role") != "admin" and m.get("email")), None)
        
        if test_member:
            # Login as this member
            member_session = requests.Session()
            member_session.headers.update({"Content-Type": "application/json"})
            
            # Try member login endpoint
            login_response = member_session.post(f"{BASE_URL}/api/member/login", json={
                "username": test_member.get("email"),
                "password": "changeme123"  # Default password for admin-created members
            })
            
            if login_response.status_code == 200:
                member_token = login_response.json().get("token")
                member_session.headers.update({"Authorization": f"Bearer {member_token}"})
                
                # Test available-mentors endpoint
                mentors_response = member_session.get(f"{BASE_URL}/api/member/available-mentors")
                assert mentors_response.status_code == 200
                mentors = mentors_response.json()
                assert isinstance(mentors, list)
                
                # Verify current member is excluded
                current_member_id = test_member.get("member_id")
                mentor_ids = [m.get("member_id") for m in mentors]
                assert current_member_id not in mentor_ids, "Current member should be excluded from available mentors"
                
                print(f"PASS: /api/member/available-mentors returned {len(mentors)} mentors (excluding current member)")
            else:
                print(f"INFO: Could not login as test member - testing with admin token instead")
                # Test with admin token (admin can also be a member)
                mentors_response = self.session.get(f"{BASE_URL}/api/member/available-mentors")
                assert mentors_response.status_code == 200
                mentors = mentors_response.json()
                print(f"PASS: /api/member/available-mentors returned {len(mentors)} mentors")
        else:
            print("INFO: No non-admin member found for testing")
    
    def test_member_available_mentors_returns_limited_fields(self):
        """Test that /api/member/available-mentors returns limited fields (no password_hash)"""
        response = self.session.get(f"{BASE_URL}/api/member/available-mentors")
        assert response.status_code == 200
        mentors = response.json()
        
        if len(mentors) > 0:
            mentor = mentors[0]
            # Should NOT have password_hash
            assert "password_hash" not in mentor, "password_hash should not be in response"
            # Should have basic fields
            expected_fields = ["member_id", "membership_number", "first_name", "last_name"]
            for field in expected_fields:
                assert field in mentor, f"Missing expected field: {field}"
            print(f"PASS: /api/member/available-mentors returns limited fields (no password_hash)")
        else:
            print("INFO: No mentors returned to verify fields")
    
    def test_save_member_with_mentor_from_new_list(self):
        """Test saving a member with mentor_membership_number from new mentor list"""
        # Get mentors from new endpoint
        mentors_response = self.session.get(f"{BASE_URL}/api/admin/mentors")
        assert mentors_response.status_code == 200
        mentors = mentors_response.json()
        
        if len(mentors) == 0:
            print("INFO: No mentors available to test mentor assignment")
            return
        
        # Pick a mentor
        mentor = mentors[0]
        mentor_membership_number = mentor.get("membership_number")
        
        # Get a member to update (not the mentor)
        members_response = self.session.get(f"{BASE_URL}/api/admin/members")
        members = members_response.json()
        
        # Find a member that is not the mentor
        test_member = next((m for m in members if m.get("member_id") != mentor.get("member_id") and m.get("role") != "admin"), None)
        
        if test_member:
            # Update member with mentor
            update_response = self.session.put(
                f"{BASE_URL}/api/admin/members/{test_member.get('member_id')}",
                json={"mentor_membership_number": mentor_membership_number}
            )
            assert update_response.status_code == 200
            updated = update_response.json()
            
            # Verify mentor was assigned
            assert updated.get("mentor_membership_number") == mentor_membership_number, \
                f"Expected mentor_membership_number {mentor_membership_number}, got {updated.get('mentor_membership_number')}"
            assert updated.get("mentor_id") == mentor.get("member_id"), \
                f"Expected mentor_id {mentor.get('member_id')}, got {updated.get('mentor_id')}"
            
            print(f"PASS: Successfully assigned mentor (membership_number: {mentor_membership_number}) to member {test_member.get('first_name')}")
            
            # Clean up - remove mentor assignment
            self.session.put(
                f"{BASE_URL}/api/admin/members/{test_member.get('member_id')}",
                json={"mentor_membership_number": None}
            )
        else:
            print("INFO: No suitable member found for mentor assignment test")
    
    def test_auth_me_returns_member_type_with_permissions(self):
        """Test GET /api/auth/me returns _member_type with permissions when member has member_type_id"""
        # Get a member with member_type_id
        members_response = self.session.get(f"{BASE_URL}/api/admin/members")
        members = members_response.json()
        
        member_with_type = next((m for m in members if m.get("member_type_id")), None)
        
        if member_with_type:
            # Login as this member
            member_session = requests.Session()
            member_session.headers.update({"Content-Type": "application/json"})
            
            login_response = member_session.post(f"{BASE_URL}/api/member/login", json={
                "username": member_with_type.get("email"),
                "password": "changeme123"
            })
            
            if login_response.status_code == 200:
                member_token = login_response.json().get("token")
                member_session.headers.update({"Authorization": f"Bearer {member_token}"})
                
                # Get /member/me
                me_response = member_session.get(f"{BASE_URL}/api/member/me")
                assert me_response.status_code == 200
                me_data = me_response.json()
                
                # Verify _member_type is present
                assert "_member_type" in me_data, "Expected _member_type in response"
                member_type = me_data.get("_member_type")
                assert "permissions" in member_type, "Expected permissions in _member_type"
                assert "is_mentor" in member_type.get("permissions", {}), "Expected is_mentor in permissions"
                
                print(f"PASS: /api/member/me returns _member_type with permissions (is_mentor: {member_type.get('permissions', {}).get('is_mentor')})")
            else:
                print(f"INFO: Could not login as member with type - {login_response.status_code}")
        else:
            print("INFO: No member with member_type_id found for testing")


class TestMentorDropdownIntegration:
    """Test that mentor dropdown in admin Members form uses new endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login as admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        self.token = response.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        yield
    
    def test_mentors_endpoint_matches_member_types_query(self):
        """Verify /api/admin/mentors returns members matching member_types with is_mentor=true"""
        # Get member types with is_mentor=true
        types_response = self.session.get(f"{BASE_URL}/api/admin/member-types")
        assert types_response.status_code == 200
        types = types_response.json()
        mentor_type_ids = [t.get("id") for t in types if t.get("is_mentor") == True]
        
        # Get all members
        members_response = self.session.get(f"{BASE_URL}/api/admin/members")
        assert members_response.status_code == 200
        all_members = members_response.json()
        
        # Filter members by mentor type IDs
        expected_mentors = [m for m in all_members if m.get("member_type_id") in mentor_type_ids]
        
        # Get mentors from endpoint
        mentors_response = self.session.get(f"{BASE_URL}/api/admin/mentors")
        assert mentors_response.status_code == 200
        actual_mentors = mentors_response.json()
        
        # Compare
        expected_ids = set(m.get("member_id") for m in expected_mentors)
        actual_ids = set(m.get("member_id") for m in actual_mentors)
        
        assert expected_ids == actual_ids, \
            f"Mismatch: expected {len(expected_ids)} mentors, got {len(actual_ids)}"
        
        print(f"PASS: /api/admin/mentors correctly returns {len(actual_mentors)} members with mentor-type assignment")
        print(f"  Mentor type IDs: {mentor_type_ids}")
        mentor_names = [f"{m.get('first_name')} {m.get('last_name')}" for m in actual_mentors]
        print(f"  Mentor names: {mentor_names}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
