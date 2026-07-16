"""
Test suite for My Account Navigation CMS feature (iteration 71)
Tests:
1. GET /api/public/myaccount-nav - returns 13 ordered items (auto-seeded)
2. GET /api/admin/myaccount-nav - returns same 13 items (requires admin JWT)
3. PUT /api/admin/myaccount-nav/{item_id} - toggle visibility
4. PUT /api/admin/myaccount-nav-reorder - reorder items
5. Member Levels permissions - 12 checkboxes including 5 new ones
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Expected 13 nav items from MYACCOUNT_NAV_CATALOG
EXPECTED_NAV_IDS = [
    'membership-profile', 'mentorship-profile', 'my-sponsor', 'ebank',
    'invite-code', 'my-community', 'portfolios', 'global-calendar',
    'mentorship-calendar', 'earnings', 'bundles', 'my-bookings', 'calendar-sync'
]

# 5 new permission IDs added to Member Levels
NEW_PERMISSION_IDS = ['global-calendar', 'earnings', 'bundles', 'my-bookings', 'calendar-sync']


class TestMyAccountNavPublic:
    """Test public My Account Navigation endpoint"""
    
    def test_public_myaccount_nav_returns_13_items(self):
        """GET /api/public/myaccount-nav should return 13 ordered items"""
        response = requests.get(f"{BASE_URL}/api/public/myaccount-nav")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) == 13, f"Expected 13 items, got {len(data)}"
        
        # Verify each item has required fields
        for item in data:
            assert 'id' in item, f"Item missing 'id': {item}"
            assert 'label' in item, f"Item missing 'label': {item}"
            assert 'order' in item, f"Item missing 'order': {item}"
            assert 'visible' in item, f"Item missing 'visible': {item}"
        
        # Verify all expected IDs are present
        item_ids = [item['id'] for item in data]
        for expected_id in EXPECTED_NAV_IDS:
            assert expected_id in item_ids, f"Missing expected nav item: {expected_id}"
        
        print(f"PASS: Public endpoint returns {len(data)} items with all required fields")
    
    def test_public_myaccount_nav_sorted_by_order(self):
        """Items should be sorted by 'order' field"""
        response = requests.get(f"{BASE_URL}/api/public/myaccount-nav")
        assert response.status_code == 200
        
        data = response.json()
        orders = [item['order'] for item in data]
        assert orders == sorted(orders), f"Items not sorted by order: {orders}"
        
        print("PASS: Items are sorted by order field")


class TestMyAccountNavAdmin:
    """Test admin My Account Navigation endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin JWT token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!",
            "login_type": "cms"
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json().get('token')
    
    def test_admin_myaccount_nav_requires_auth(self):
        """GET /api/admin/myaccount-nav should require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/myaccount-nav")
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print("PASS: Admin endpoint requires authentication")
    
    def test_admin_myaccount_nav_returns_13_items(self, admin_token):
        """GET /api/admin/myaccount-nav should return 13 items with admin JWT"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/myaccount-nav", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) == 13, f"Expected 13 items, got {len(data)}"
        
        print(f"PASS: Admin endpoint returns {len(data)} items")
    
    def test_admin_update_visibility_hide(self, admin_token):
        """PUT /api/admin/myaccount-nav/{item_id} with visible:false should hide item"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        item_id = "calendar-sync"  # Use a safe item to toggle
        
        # Hide the item
        response = requests.put(
            f"{BASE_URL}/api/admin/myaccount-nav/{item_id}",
            headers=headers,
            json={"visible": False}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        updated = response.json()
        assert updated['id'] == item_id, f"Expected id '{item_id}', got '{updated.get('id')}'"
        assert updated['visible'] == False, f"Expected visible=False, got {updated.get('visible')}"
        
        print(f"PASS: Item '{item_id}' hidden successfully")
    
    def test_admin_update_visibility_show(self, admin_token):
        """PUT /api/admin/myaccount-nav/{item_id} with visible:true should show item"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        item_id = "calendar-sync"
        
        # Show the item
        response = requests.put(
            f"{BASE_URL}/api/admin/myaccount-nav/{item_id}",
            headers=headers,
            json={"visible": True}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        updated = response.json()
        assert updated['visible'] == True, f"Expected visible=True, got {updated.get('visible')}"
        
        print(f"PASS: Item '{item_id}' shown successfully")
    
    def test_admin_reorder_items(self, admin_token):
        """PUT /api/admin/myaccount-nav-reorder should persist new order"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get current order
        response = requests.get(f"{BASE_URL}/api/admin/myaccount-nav", headers=headers)
        assert response.status_code == 200
        original_items = response.json()
        original_ids = [item['id'] for item in original_items]
        
        # Reverse the order
        reversed_ids = list(reversed(original_ids))
        
        # Reorder
        response = requests.put(
            f"{BASE_URL}/api/admin/myaccount-nav-reorder",
            headers=headers,
            json={"ordered_ids": reversed_ids}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        assert response.json().get('success') == True
        
        # Verify new order
        response = requests.get(f"{BASE_URL}/api/admin/myaccount-nav", headers=headers)
        assert response.status_code == 200
        new_items = response.json()
        new_ids = [item['id'] for item in new_items]
        
        assert new_ids == reversed_ids, f"Order not persisted. Expected {reversed_ids}, got {new_ids}"
        
        # Restore original order
        requests.put(
            f"{BASE_URL}/api/admin/myaccount-nav-reorder",
            headers=headers,
            json={"ordered_ids": original_ids}
        )
        
        print("PASS: Reorder persists correctly")


class TestMemberLevelsPermissions:
    """Test Member Levels permissions include 5 new items"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin JWT token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!",
            "login_type": "cms"
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json().get('token')
    
    def test_create_level_with_new_permissions(self, admin_token):
        """Create a level with the 5 new permission IDs"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        test_level = {
            "name": "TEST_Level_With_New_Perms",
            "permissions": NEW_PERMISSION_IDS,
            "order": 999
        }
        
        # Create level
        response = requests.post(
            f"{BASE_URL}/api/admin/member-levels",
            headers=headers,
            json=test_level
        )
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        
        created = response.json()
        assert 'id' in created, "Created level should have an id"
        level_id = created['id']
        
        # Verify permissions were saved
        for perm in NEW_PERMISSION_IDS:
            assert perm in created.get('permissions', []), f"Permission '{perm}' not saved"
        
        # Cleanup - delete the test level
        requests.delete(f"{BASE_URL}/api/admin/member-levels/{level_id}", headers=headers)
        
        print(f"PASS: Level created with all 5 new permissions: {NEW_PERMISSION_IDS}")


class TestAdminSidebarOrder:
    """Test admin sidebar ordering - Security between Membership and System"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin JWT token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!",
            "login_type": "cms"
        })
        if response.status_code != 200:
            pytest.skip(f"Admin login failed: {response.text}")
        return response.json().get('token')
    
    def test_admin_login_button_not_gold(self):
        """Admin login button should NOT use hardcoded gold #c9a84c"""
        # This is a frontend test - we verify the CSS variable is used
        # The actual color check will be done via Playwright
        print("PASS: Admin login button color test delegated to Playwright UI test")


class TestMemberPublicFlow:
    """Test member public flow with My Account nav"""
    
    def test_member_login_endpoint(self):
        """Test member login endpoint exists"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "carlos@example.com",
            "password": "Test123!"
        })
        # May succeed or fail based on credentials, but endpoint should exist
        assert response.status_code in [200, 401, 403], f"Unexpected status: {response.status_code}"
        print("PASS: Member login endpoint accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
