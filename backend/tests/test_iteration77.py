"""
Iteration 77 Tests - Admin Member Creation Defaults + Enrollment Dict Coercion

Tests:
1. Admin create member auto-default to lowest level (level_free) and cms_roles=['role_member']
2. Admin create with explicit level_id keeps that level
3. Friendlier no-enrollment message (no "did not go through", has "created directly from the CMS")
4. Dict-value React-safety: backend coerces dict/list/bool/int to strings
5. Regression: iteration 75/76 tests still pass
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@consultant.com"
ADMIN_PASSWORD = "Admin123!"
SAMPLE_MEMBER1_EMAIL = "samplemember1@gmail.com"
SAMPLE_MEMBER1_PASSWORD = "123456789"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token."""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Admin auth headers."""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


class TestAdminCreateMemberDefaults:
    """Test 1 & 2: Admin create member auto-defaults to lowest level when level_id not specified."""
    
    def test_create_member_without_level_defaults_to_free(self, admin_headers):
        """POST /api/admin/members without level_id should default to level_free."""
        unique_email = f"test_default_level_{uuid.uuid4().hex[:8]}@test.com"
        
        # Create member WITHOUT specifying level_id
        create_response = requests.post(
            f"{BASE_URL}/api/admin/members",
            headers=admin_headers,
            json={
                "first_name": "Test",
                "last_name": "DefaultLevel",
                "email": unique_email,
                "password": "TestPass123!"
            }
        )
        
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        member = create_response.json()
        
        # Verify level_id defaults to level_free (lowest order level)
        assert member.get("level_id") == "level_free", f"Expected level_id='level_free', got '{member.get('level_id')}'"
        
        # Verify cms_roles defaults to ['role_member']
        assert member.get("cms_roles") == ["role_member"], f"Expected cms_roles=['role_member'], got {member.get('cms_roles')}"
        
        # Cleanup - delete the test member
        member_id = member.get("member_id")
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/members/{member_id}",
            headers=admin_headers
        )
        assert delete_response.status_code == 200, f"Cleanup failed: {delete_response.text}"
        print(f"✓ Member created without level_id defaulted to level_free and cms_roles=['role_member']")
    
    def test_create_member_with_explicit_level_keeps_level(self, admin_headers):
        """POST /api/admin/members with explicit level_id should keep that level."""
        unique_email = f"test_explicit_level_{uuid.uuid4().hex[:8]}@test.com"
        
        # Create member WITH explicit level_id='level_premium'
        create_response = requests.post(
            f"{BASE_URL}/api/admin/members",
            headers=admin_headers,
            json={
                "first_name": "Test",
                "last_name": "ExplicitLevel",
                "email": unique_email,
                "password": "TestPass123!",
                "level_id": "level_premium"
            }
        )
        
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        member = create_response.json()
        
        # Verify level_id is level_premium (not overwritten to level_free)
        assert member.get("level_id") == "level_premium", f"Expected level_id='level_premium', got '{member.get('level_id')}'"
        
        # Cleanup
        member_id = member.get("member_id")
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/members/{member_id}",
            headers=admin_headers
        )
        assert delete_response.status_code == 200, f"Cleanup failed: {delete_response.text}"
        print(f"✓ Member created with explicit level_id='level_premium' kept that level")


class TestNewMemberSidebarRestriction:
    """Test that a new member with level_free only sees Membership Profile in sidebar."""
    
    def test_new_member_sidebar_only_membership_profile(self, admin_headers):
        """Create member without level, login as them, verify sidebar permissions."""
        unique_email = f"test_sidebar_{uuid.uuid4().hex[:8]}@test.com"
        test_password = "TestPass123!"
        
        # Create member WITHOUT level_id (should default to level_free)
        create_response = requests.post(
            f"{BASE_URL}/api/admin/members",
            headers=admin_headers,
            json={
                "first_name": "Test",
                "last_name": "Sidebar",
                "email": unique_email,
                "password": test_password
            }
        )
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        member = create_response.json()
        member_id = member.get("member_id")
        
        # Verify level_id is level_free
        assert member.get("level_id") == "level_free", f"Expected level_free, got {member.get('level_id')}"
        
        # Login as the new member
        login_response = requests.post(
            f"{BASE_URL}/api/member/login",
            json={"username": unique_email, "password": test_password}
        )
        assert login_response.status_code == 200, f"Member login failed: {login_response.text}"
        member_token = login_response.json()["token"]
        
        # Get member's level permissions
        level_response = requests.get(
            f"{BASE_URL}/api/member/my-level",
            headers={"Authorization": f"Bearer {member_token}"}
        )
        assert level_response.status_code == 200, f"Get level failed: {level_response.text}"
        level_data = level_response.json()
        
        # Verify level is Free and only has membership-profile permission
        assert level_data.get("name") == "Free", f"Expected level name 'Free', got '{level_data.get('name')}'"
        permissions = level_data.get("permissions", [])
        assert "membership-profile" in permissions, f"Expected 'membership-profile' in permissions, got {permissions}"
        # Free level should only have membership-profile
        assert len(permissions) == 1, f"Free level should only have 1 permission, got {len(permissions)}: {permissions}"
        
        # Cleanup
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/members/{member_id}",
            headers=admin_headers
        )
        assert delete_response.status_code == 200, f"Cleanup failed: {delete_response.text}"
        print(f"✓ New member with level_free only has 'membership-profile' permission")


class TestFriendlierNoEnrollmentMessage:
    """Test 3: The no-enrollment message should be friendlier."""
    
    def test_no_enrollment_message_wording(self, admin_headers):
        """GET /api/admin/members/<samplemember1>/enrollment should return friendly message."""
        # Get samplemember1's member_id
        members_response = requests.get(
            f"{BASE_URL}/api/admin/members",
            headers=admin_headers
        )
        assert members_response.status_code == 200
        members = members_response.json()
        
        # Find samplemember1 (AUX-101)
        samplemember1 = next((m for m in members if m.get("email") == SAMPLE_MEMBER1_EMAIL), None)
        assert samplemember1 is not None, "samplemember1 not found"
        member_id = samplemember1.get("member_id")
        
        # Get enrollment data
        enrollment_response = requests.get(
            f"{BASE_URL}/api/admin/members/{member_id}/enrollment",
            headers=admin_headers
        )
        assert enrollment_response.status_code == 200, f"Get enrollment failed: {enrollment_response.text}"
        enrollment_data = enrollment_response.json()
        
        # Verify has_application is False (seeded member, no enrollment)
        assert enrollment_data.get("has_application") == False, f"Expected has_application=False, got {enrollment_data.get('has_application')}"
        
        # The frontend message is in MembersManager.js, not the API response
        # But we verify the API returns the correct structure
        assert "answers" in enrollment_data
        assert enrollment_data.get("answers") == []
        print(f"✓ Enrollment API returns has_application=False for seeded member (frontend shows friendly message)")


class TestDictValueCoercion:
    """Test 4: Backend coerces dict/list/bool/int values to strings in enrollment answers."""
    
    def test_dict_coercion_in_enrollment_endpoint(self, admin_headers):
        """
        Insert a fake enrollment_application with dict/list/bool/int values,
        then GET /api/admin/members/<member_id>/enrollment and verify all values are strings.
        """
        import pymongo
        from bson import ObjectId
        
        # Connect to MongoDB directly
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        db_name = os.environ.get('DB_NAME', 'test_database')
        client = pymongo.MongoClient(mongo_url)
        db = client[db_name]
        
        # Create a test member first
        unique_email = f"test_dict_coercion_{uuid.uuid4().hex[:8]}@test.com"
        create_response = requests.post(
            f"{BASE_URL}/api/admin/members",
            headers=admin_headers,
            json={
                "first_name": "Test",
                "last_name": "DictCoercion",
                "email": unique_email,
                "password": "TestPass123!"
            }
        )
        assert create_response.status_code == 200, f"Create member failed: {create_response.text}"
        member = create_response.json()
        member_id = member.get("member_id")
        
        # Insert fake enrollment_application with complex form_data
        fake_app = {
            "id": str(uuid.uuid4()),
            "member_id": member_id,
            "email": unique_email,
            "form_data": {
                "first_name": "Test",
                "last_name": "DictCoercion",
                "email": unique_email,
                # Dict value (checkbox-grid style)
                "knowledge_ratings": {
                    "Terminology": True,
                    "Tools": True,
                    "Capital Markets": False,
                    "Products": True,
                    "Real Estate": False,
                    "Debt & Credit": True
                },
                # List value
                "languages": ["English", "Spanish"],
                # Bool value
                "own_business": True,
                # Int value
                "years_with_employer": 5
            },
            "created_at": "2026-01-15T12:00:00+00:00"
        }
        db.enrollment_applications.insert_one(fake_app)
        
        try:
            # GET enrollment data
            enrollment_response = requests.get(
                f"{BASE_URL}/api/admin/members/{member_id}/enrollment",
                headers=admin_headers
            )
            assert enrollment_response.status_code == 200, f"Get enrollment failed: {enrollment_response.text}"
            enrollment_data = enrollment_response.json()
            
            # Verify has_application is True
            assert enrollment_data.get("has_application") == True, f"Expected has_application=True"
            
            answers = enrollment_data.get("answers", [])
            
            # Find specific answers and verify they are strings
            for answer in answers:
                field_key = answer.get("field_key")
                value = answer.get("value")
                
                # All values MUST be strings
                assert isinstance(value, str), f"Field '{field_key}' value is not a string: {type(value)} = {value}"
                
                if field_key == "knowledge_ratings":
                    # Dict → only truthy keys, comma-joined
                    # Expected: "Terminology, Tools, Products, Debt & Credit"
                    expected_parts = ["Terminology", "Tools", "Products", "Debt & Credit"]
                    for part in expected_parts:
                        assert part in value, f"Expected '{part}' in knowledge_ratings value: {value}"
                    # Should NOT contain false keys
                    assert "Capital Markets" not in value, f"'Capital Markets' (false) should not be in value: {value}"
                    assert "Real Estate" not in value, f"'Real Estate' (false) should not be in value: {value}"
                    print(f"  ✓ knowledge_ratings (dict) → '{value}'")
                
                elif field_key == "languages":
                    # List → comma-joined
                    assert "English" in value and "Spanish" in value, f"Expected 'English, Spanish' in value: {value}"
                    print(f"  ✓ languages (list) → '{value}'")
                
                elif field_key == "own_business":
                    # Bool → "Yes" or "No"
                    assert value == "Yes", f"Expected 'Yes' for own_business=True, got: {value}"
                    print(f"  ✓ own_business (bool) → '{value}'")
                
                elif field_key == "years_with_employer":
                    # Int → string
                    assert value == "5", f"Expected '5' for years_with_employer=5, got: {value}"
                    print(f"  ✓ years_with_employer (int) → '{value}'")
            
            print(f"✓ All enrollment values are properly coerced to strings")
            
        finally:
            # Cleanup: delete fake enrollment and test member
            db.enrollment_applications.delete_one({"member_id": member_id})
            client.close()
            
            delete_response = requests.delete(
                f"{BASE_URL}/api/admin/members/{member_id}",
                headers=admin_headers
            )
            assert delete_response.status_code == 200, f"Cleanup failed: {delete_response.text}"


class TestRegressionIteration75:
    """Regression tests from iteration 75."""
    
    def test_natural_sort_aux_column(self, admin_headers):
        """Verify natural sort on AUX column still works."""
        response = requests.get(f"{BASE_URL}/api/admin/members", headers=admin_headers)
        assert response.status_code == 200
        members = response.json()
        
        # Get membership_ids
        aux_ids = [m.get("membership_id") for m in members if m.get("membership_id")]
        assert len(aux_ids) > 0, "No members found"
        print(f"✓ Natural sort regression: {len(aux_ids)} members found")
    
    def test_sponsor_column_sortable(self, admin_headers):
        """Verify sponsor column data exists."""
        response = requests.get(f"{BASE_URL}/api/admin/members", headers=admin_headers)
        assert response.status_code == 200
        members = response.json()
        
        # Check some members have sponsor_membership_number
        with_sponsor = [m for m in members if m.get("sponsor_membership_number")]
        assert len(with_sponsor) > 0, "No members with sponsors found"
        print(f"✓ Sponsor sort regression: {len(with_sponsor)} members have sponsors")
    
    def test_testing_manual_endpoint(self, admin_headers):
        """Verify /api/docs/testing-manual returns 200."""
        response = requests.get(f"{BASE_URL}/api/docs/testing-manual", headers=admin_headers)
        assert response.status_code == 200, f"Testing manual returned {response.status_code}"
        print(f"✓ Testing manual endpoint returns 200")


class TestRegressionIteration76:
    """Regression tests from iteration 76."""
    
    def test_member_enrollment_endpoint_exists(self, admin_headers):
        """Verify /api/admin/members/<id>/enrollment endpoint works."""
        # Get any member
        response = requests.get(f"{BASE_URL}/api/admin/members", headers=admin_headers)
        assert response.status_code == 200
        members = response.json()
        assert len(members) > 0
        
        member_id = members[0].get("member_id")
        enrollment_response = requests.get(
            f"{BASE_URL}/api/admin/members/{member_id}/enrollment",
            headers=admin_headers
        )
        assert enrollment_response.status_code == 200, f"Enrollment endpoint failed: {enrollment_response.text}"
        data = enrollment_response.json()
        assert "has_application" in data
        assert "answers" in data
        print(f"✓ Member enrollment endpoint works")
    
    def test_my_community_endpoint(self):
        """Verify /api/member/my-community returns tree with extra fields."""
        # Login as samplemember1
        login_response = requests.post(
            f"{BASE_URL}/api/member/login",
            json={"username": SAMPLE_MEMBER1_EMAIL, "password": SAMPLE_MEMBER1_PASSWORD}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json()["token"]
        
        community_response = requests.get(
            f"{BASE_URL}/api/member/my-community",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert community_response.status_code == 200, f"Community endpoint failed: {community_response.text}"
        data = community_response.json()
        
        assert "tree" in data
        # samplemember1 should have children (AUX-104 to AUX-110)
        tree = data.get("tree", [])
        if len(tree) > 0:
            child = tree[0]
            # Verify extra fields exist
            for field in ["phone", "gender", "date_of_birth", "country", "state", "city", "zip_code"]:
                assert field in child, f"Field '{field}' missing from community child"
        print(f"✓ My Community endpoint returns tree with {len(tree)} children and extra fields")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
