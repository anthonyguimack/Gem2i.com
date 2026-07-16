"""
Iteration 22 Tests: Color Management System and Theme Switcher
Tests for:
1. Settings API - theme_colors object with website/my_account/admin keys
2. Settings API - active_theme field (default, modern, classic)
3. Public settings endpoint returns theme_colors and active_theme
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    BASE_URL = "https://consultant-cms.preview.emergentagent.com"

# Test credentials
ADMIN_EMAIL = "admin@consultant.com"
ADMIN_PASSWORD = "Admin123!"


class TestColorManagementAndThemes:
    """Tests for Color Management System and Theme Switcher"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Login as admin and get token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if login_response.status_code == 200:
            data = login_response.json()
            self.token = data.get("access_token") or data.get("token")
            if self.token:
                self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            pytest.skip(f"Admin login failed: {login_response.status_code}")
    
    # ==================== PUBLIC SETTINGS TESTS ====================
    
    def test_public_settings_returns_active_theme(self):
        """Test that public settings endpoint returns active_theme field"""
        response = requests.get(f"{BASE_URL}/api/public/settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "active_theme" in data, "active_theme field should be in public settings"
        assert data["active_theme"] in ["default", "modern", "classic"], f"active_theme should be one of default/modern/classic, got {data['active_theme']}"
    
    def test_public_settings_returns_theme_colors(self):
        """Test that public settings endpoint returns theme_colors object"""
        response = requests.get(f"{BASE_URL}/api/public/settings")
        assert response.status_code == 200
        
        data = response.json()
        assert "theme_colors" in data, "theme_colors field should be in public settings"
        
        theme_colors = data["theme_colors"]
        assert isinstance(theme_colors, dict), "theme_colors should be a dict"
        
        # Check for the 3 groups
        assert "website" in theme_colors or theme_colors == {}, "theme_colors should have website key (or be empty)"
    
    def test_public_settings_theme_colors_structure(self):
        """Test that theme_colors has correct structure with website/my_account/admin keys"""
        response = requests.get(f"{BASE_URL}/api/public/settings")
        assert response.status_code == 200
        
        data = response.json()
        theme_colors = data.get("theme_colors", {})
        
        # If theme_colors has data, verify structure
        if theme_colors:
            # Website colors
            if "website" in theme_colors:
                website = theme_colors["website"]
                assert isinstance(website, dict), "website should be a dict"
            
            # My Account colors
            if "my_account" in theme_colors:
                my_account = theme_colors["my_account"]
                assert isinstance(my_account, dict), "my_account should be a dict"
            
            # Admin colors
            if "admin" in theme_colors:
                admin = theme_colors["admin"]
                assert isinstance(admin, dict), "admin should be a dict"
    
    # ==================== ADMIN SETTINGS TESTS ====================
    
    def test_admin_get_settings(self):
        """Test admin can get settings"""
        response = self.session.get(f"{BASE_URL}/api/admin/settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "active_theme" in data, "active_theme should be in admin settings"
        assert "theme_colors" in data, "theme_colors should be in admin settings"
    
    def test_admin_update_active_theme_to_modern(self):
        """Test admin can update active_theme to 'modern'"""
        # Get current settings
        get_response = self.session.get(f"{BASE_URL}/api/admin/settings")
        assert get_response.status_code == 200
        current_settings = get_response.json()
        
        # Update to modern theme
        update_payload = {**current_settings, "active_theme": "modern"}
        response = self.session.put(f"{BASE_URL}/api/admin/settings", json=update_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify the change
        verify_response = self.session.get(f"{BASE_URL}/api/admin/settings")
        assert verify_response.status_code == 200
        data = verify_response.json()
        assert data["active_theme"] == "modern", f"Expected 'modern', got {data['active_theme']}"
    
    def test_admin_update_active_theme_to_classic(self):
        """Test admin can update active_theme to 'classic'"""
        # Get current settings
        get_response = self.session.get(f"{BASE_URL}/api/admin/settings")
        assert get_response.status_code == 200
        current_settings = get_response.json()
        
        # Update to classic theme
        update_payload = {**current_settings, "active_theme": "classic"}
        response = self.session.put(f"{BASE_URL}/api/admin/settings", json=update_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify the change
        verify_response = self.session.get(f"{BASE_URL}/api/admin/settings")
        assert verify_response.status_code == 200
        data = verify_response.json()
        assert data["active_theme"] == "classic", f"Expected 'classic', got {data['active_theme']}"
    
    def test_admin_update_active_theme_to_default(self):
        """Test admin can update active_theme back to 'default'"""
        # Get current settings
        get_response = self.session.get(f"{BASE_URL}/api/admin/settings")
        assert get_response.status_code == 200
        current_settings = get_response.json()
        
        # Update to default theme
        update_payload = {**current_settings, "active_theme": "default"}
        response = self.session.put(f"{BASE_URL}/api/admin/settings", json=update_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify the change
        verify_response = self.session.get(f"{BASE_URL}/api/admin/settings")
        assert verify_response.status_code == 200
        data = verify_response.json()
        assert data["active_theme"] == "default", f"Expected 'default', got {data['active_theme']}"
    
    def test_admin_update_theme_colors_website(self):
        """Test admin can update website colors in theme_colors"""
        # Get current settings
        get_response = self.session.get(f"{BASE_URL}/api/admin/settings")
        assert get_response.status_code == 200
        current_settings = get_response.json()
        
        # Update website colors
        test_colors = {
            "primary": "#1a2332",
            "accent": "#0D9488",
            "heading_color": "#1a2332",
            "body_text": "#475569",
            "navbar_bg": "#ffffff",
            "button_bg": "#1a2332",
            "button_text": "#ffffff"
        }
        
        theme_colors = current_settings.get("theme_colors", {})
        theme_colors["website"] = test_colors
        
        update_payload = {**current_settings, "theme_colors": theme_colors}
        response = self.session.put(f"{BASE_URL}/api/admin/settings", json=update_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify the change
        verify_response = self.session.get(f"{BASE_URL}/api/admin/settings")
        assert verify_response.status_code == 200
        data = verify_response.json()
        assert "theme_colors" in data
        assert "website" in data["theme_colors"]
        assert data["theme_colors"]["website"]["primary"] == "#1a2332"
    
    def test_admin_update_theme_colors_my_account(self):
        """Test admin can update my_account colors in theme_colors"""
        # Get current settings
        get_response = self.session.get(f"{BASE_URL}/api/admin/settings")
        assert get_response.status_code == 200
        current_settings = get_response.json()
        
        # Update my_account colors
        test_colors = {
            "page_bg": "#0d0f14",
            "sidebar_bg": "#13161e",
            "accent": "#c9a84c",
            "text_primary": "#ffffff"
        }
        
        theme_colors = current_settings.get("theme_colors", {})
        theme_colors["my_account"] = test_colors
        
        update_payload = {**current_settings, "theme_colors": theme_colors}
        response = self.session.put(f"{BASE_URL}/api/admin/settings", json=update_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify the change
        verify_response = self.session.get(f"{BASE_URL}/api/admin/settings")
        assert verify_response.status_code == 200
        data = verify_response.json()
        assert "theme_colors" in data
        assert "my_account" in data["theme_colors"]
        assert data["theme_colors"]["my_account"]["accent"] == "#c9a84c"
    
    def test_admin_update_theme_colors_admin(self):
        """Test admin can update admin colors in theme_colors"""
        # Get current settings
        get_response = self.session.get(f"{BASE_URL}/api/admin/settings")
        assert get_response.status_code == 200
        current_settings = get_response.json()
        
        # Update admin colors
        test_colors = {
            "sidebar_bg": "#1a2332",
            "sidebar_active_bg": "#0D9488",
            "accent": "#0D9488",
            "button_bg": "#0D9488"
        }
        
        theme_colors = current_settings.get("theme_colors", {})
        theme_colors["admin"] = test_colors
        
        update_payload = {**current_settings, "theme_colors": theme_colors}
        response = self.session.put(f"{BASE_URL}/api/admin/settings", json=update_payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify the change
        verify_response = self.session.get(f"{BASE_URL}/api/admin/settings")
        assert verify_response.status_code == 200
        data = verify_response.json()
        assert "theme_colors" in data
        assert "admin" in data["theme_colors"]
        assert data["theme_colors"]["admin"]["sidebar_bg"] == "#1a2332"
    
    def test_theme_change_persists_in_public_settings(self):
        """Test that theme changes made via admin are visible in public settings"""
        # Get current settings
        get_response = self.session.get(f"{BASE_URL}/api/admin/settings")
        assert get_response.status_code == 200
        current_settings = get_response.json()
        
        # Update to modern theme
        update_payload = {**current_settings, "active_theme": "modern"}
        response = self.session.put(f"{BASE_URL}/api/admin/settings", json=update_payload)
        assert response.status_code == 200
        
        # Check public settings
        public_response = requests.get(f"{BASE_URL}/api/public/settings")
        assert public_response.status_code == 200
        public_data = public_response.json()
        assert public_data["active_theme"] == "modern", "Theme change should be visible in public settings"
        
        # Reset to default
        update_payload = {**current_settings, "active_theme": "default"}
        self.session.put(f"{BASE_URL}/api/admin/settings", json=update_payload)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
