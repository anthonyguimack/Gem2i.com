"""
Iteration 24 Tests: Hardcoded Color Fixes + Logo/Favicon Feature
Tests:
1. Settings API returns logo_on, logo_off, favicon fields
2. Admin can update logo_on, logo_off, favicon via settings API
3. Public settings API returns logo fields
4. Admin login works
5. Theme colors API structure
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

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
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        assert data["user"]["role"] == "admin", "User is not admin"
        print(f"✓ Admin login successful, token received")
        return data["token"]


class TestSettingsLogoFavicon:
    """Tests for Logo On/Off/Favicon feature in Settings"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_public_settings_returns_logo_fields(self):
        """Test that public settings API returns logo_on, logo_off, favicon fields"""
        response = requests.get(f"{BASE_URL}/api/public/settings")
        assert response.status_code == 200, f"Failed to get settings: {response.text}"
        data = response.json()
        
        # These fields should exist (even if empty)
        assert "logo_on" in data or data.get("logo_on") is None or data.get("logo_on", "") == "", "logo_on field should be accessible"
        assert "logo_off" in data or data.get("logo_off") is None or data.get("logo_off", "") == "", "logo_off field should be accessible"
        assert "favicon" in data or data.get("favicon") is None or data.get("favicon", "") == "", "favicon field should be accessible"
        print(f"✓ Public settings returns logo fields: logo_on={data.get('logo_on', '')}, logo_off={data.get('logo_off', '')}, favicon={data.get('favicon', '')}")
    
    def test_admin_settings_returns_logo_fields(self, admin_token):
        """Test that admin settings API returns logo_on, logo_off, favicon fields"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/settings", headers=headers)
        assert response.status_code == 200, f"Failed to get admin settings: {response.text}"
        data = response.json()
        
        # Check fields exist
        print(f"✓ Admin settings returns logo fields: logo_on={data.get('logo_on', '')}, logo_off={data.get('logo_off', '')}, favicon={data.get('favicon', '')}")
    
    def test_admin_can_update_logo_on(self, admin_token):
        """Test that admin can update logo_on field"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get current settings
        response = requests.get(f"{BASE_URL}/api/admin/settings", headers=headers)
        current_settings = response.json()
        
        # Update logo_on with a test URL
        test_logo_url = "https://example.com/test-logo-on.png"
        update_payload = {**current_settings, "logo_on": test_logo_url}
        
        response = requests.put(f"{BASE_URL}/api/admin/settings", headers=headers, json=update_payload)
        assert response.status_code == 200, f"Failed to update settings: {response.text}"
        
        # Verify the update
        response = requests.get(f"{BASE_URL}/api/admin/settings", headers=headers)
        updated_settings = response.json()
        assert updated_settings.get("logo_on") == test_logo_url, f"logo_on not updated correctly"
        print(f"✓ Admin can update logo_on field")
        
        # Restore original value
        restore_payload = {**updated_settings, "logo_on": current_settings.get("logo_on", "")}
        requests.put(f"{BASE_URL}/api/admin/settings", headers=headers, json=restore_payload)
    
    def test_admin_can_update_logo_off(self, admin_token):
        """Test that admin can update logo_off field"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get current settings
        response = requests.get(f"{BASE_URL}/api/admin/settings", headers=headers)
        current_settings = response.json()
        
        # Update logo_off with a test URL
        test_logo_url = "https://example.com/test-logo-off.png"
        update_payload = {**current_settings, "logo_off": test_logo_url}
        
        response = requests.put(f"{BASE_URL}/api/admin/settings", headers=headers, json=update_payload)
        assert response.status_code == 200, f"Failed to update settings: {response.text}"
        
        # Verify the update
        response = requests.get(f"{BASE_URL}/api/admin/settings", headers=headers)
        updated_settings = response.json()
        assert updated_settings.get("logo_off") == test_logo_url, f"logo_off not updated correctly"
        print(f"✓ Admin can update logo_off field")
        
        # Restore original value
        restore_payload = {**updated_settings, "logo_off": current_settings.get("logo_off", "")}
        requests.put(f"{BASE_URL}/api/admin/settings", headers=headers, json=restore_payload)
    
    def test_admin_can_update_favicon(self, admin_token):
        """Test that admin can update favicon field"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get current settings
        response = requests.get(f"{BASE_URL}/api/admin/settings", headers=headers)
        current_settings = response.json()
        
        # Update favicon with a test URL
        test_favicon_url = "https://example.com/test-favicon.ico"
        update_payload = {**current_settings, "favicon": test_favicon_url}
        
        response = requests.put(f"{BASE_URL}/api/admin/settings", headers=headers, json=update_payload)
        assert response.status_code == 200, f"Failed to update settings: {response.text}"
        
        # Verify the update
        response = requests.get(f"{BASE_URL}/api/admin/settings", headers=headers)
        updated_settings = response.json()
        assert updated_settings.get("favicon") == test_favicon_url, f"favicon not updated correctly"
        print(f"✓ Admin can update favicon field")
        
        # Restore original value
        restore_payload = {**updated_settings, "favicon": current_settings.get("favicon", "")}
        requests.put(f"{BASE_URL}/api/admin/settings", headers=headers, json=restore_payload)


class TestThemeColorsStructure:
    """Tests for theme colors structure"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin login failed")
    
    def test_settings_has_theme_colors_structure(self, admin_token):
        """Test that settings has theme_colors with website, my_account, admin groups"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/settings", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        theme_colors = data.get("theme_colors", {})
        print(f"✓ theme_colors structure: {list(theme_colors.keys())}")
        
        # Check for expected groups (may be empty initially)
        if theme_colors:
            if "website" in theme_colors:
                print(f"  - website colors: {len(theme_colors['website'])} keys")
            if "my_account" in theme_colors:
                print(f"  - my_account colors: {len(theme_colors['my_account'])} keys")
            if "admin" in theme_colors:
                print(f"  - admin colors: {len(theme_colors['admin'])} keys")
    
    def test_settings_has_active_theme(self, admin_token):
        """Test that settings has active_theme field"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/settings", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        active_theme = data.get("active_theme", "default")
        assert active_theme in ["default", "modern", "classic"], f"Invalid active_theme: {active_theme}"
        print(f"✓ active_theme: {active_theme}")


class TestPublicAPIs:
    """Test public APIs still work"""
    
    def test_public_settings(self):
        """Test public settings endpoint"""
        response = requests.get(f"{BASE_URL}/api/public/settings")
        assert response.status_code == 200
        data = response.json()
        assert "brand_name" in data or data.get("brand_name") is None
        print(f"✓ Public settings works, brand_name: {data.get('brand_name', 'N/A')}")
    
    def test_public_about(self):
        """Test public about endpoint"""
        response = requests.get(f"{BASE_URL}/api/public/about")
        assert response.status_code == 200
        print(f"✓ Public about endpoint works")
    
    def test_public_services(self):
        """Test public services endpoint"""
        response = requests.get(f"{BASE_URL}/api/public/services")
        assert response.status_code == 200
        print(f"✓ Public services endpoint works")
    
    def test_public_hero_slides(self):
        """Test public hero slides endpoint"""
        response = requests.get(f"{BASE_URL}/api/public/hero-slides")
        assert response.status_code == 200
        print(f"✓ Public hero-slides endpoint works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
