"""
Iteration 61 - Multi-language (EN+ES) i18n Testing
Tests for language switcher, localized fields, and tt() helper functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPublicSettingsLanguages:
    """Test that public settings returns language configuration"""
    
    def test_public_settings_returns_languages(self):
        """Verify /api/public/settings returns languages array"""
        response = requests.get(f"{BASE_URL}/api/public/settings")
        assert response.status_code == 200
        data = response.json()
        assert "languages" in data, "languages field missing from settings"
        assert isinstance(data["languages"], list), "languages should be a list"
        assert len(data["languages"]) >= 1, "At least one language should be enabled"
        print(f"Languages enabled: {data['languages']}")
    
    def test_public_settings_returns_default_language(self):
        """Verify /api/public/settings returns default_language"""
        response = requests.get(f"{BASE_URL}/api/public/settings")
        assert response.status_code == 200
        data = response.json()
        assert "default_language" in data, "default_language field missing from settings"
        assert isinstance(data["default_language"], str), "default_language should be a string"
        print(f"Default language: {data['default_language']}")
    
    def test_languages_includes_en_and_es(self):
        """Verify EN and ES are both enabled"""
        response = requests.get(f"{BASE_URL}/api/public/settings")
        assert response.status_code == 200
        data = response.json()
        languages = data.get("languages", [])
        assert "en" in languages, "English (en) should be enabled"
        assert "es" in languages, "Spanish (es) should be enabled"
        print(f"Both EN and ES are enabled: {languages}")


class TestAurexSectionLocalizedData:
    """Test that Aurex sections return localized data correctly"""
    
    def test_aurex_audience_config_has_localized_title(self):
        """Verify aurex_audience config has {en, es} title object"""
        response = requests.get(f"{BASE_URL}/api/public/aurex/aurex_audience")
        assert response.status_code == 200
        data = response.json()
        config = data.get("config", {})
        title = config.get("title")
        
        # Title should be a dict with en and es keys
        assert isinstance(title, dict), f"title should be a dict, got {type(title)}"
        assert "en" in title, "title should have 'en' key"
        assert "es" in title, "title should have 'es' key"
        print(f"Localized title: EN='{title.get('en')}', ES='{title.get('es')}'")
    
    def test_aurex_audience_config_has_localized_subtitle(self):
        """Verify aurex_audience config has {en, es} subtitle object"""
        response = requests.get(f"{BASE_URL}/api/public/aurex/aurex_audience")
        assert response.status_code == 200
        data = response.json()
        config = data.get("config", {})
        subtitle = config.get("subtitle")
        
        if subtitle:
            assert isinstance(subtitle, dict), f"subtitle should be a dict, got {type(subtitle)}"
            assert "en" in subtitle, "subtitle should have 'en' key"
            assert "es" in subtitle, "subtitle should have 'es' key"
            print(f"Localized subtitle: EN='{subtitle.get('en')}', ES='{subtitle.get('es')}'")
    
    def test_aurex_audience_config_has_localized_cta_text(self):
        """Verify aurex_audience config has {en, es} cta_text object"""
        response = requests.get(f"{BASE_URL}/api/public/aurex/aurex_audience")
        assert response.status_code == 200
        data = response.json()
        config = data.get("config", {})
        cta_text = config.get("cta_text")
        
        if cta_text:
            assert isinstance(cta_text, dict), f"cta_text should be a dict, got {type(cta_text)}"
            assert "en" in cta_text, "cta_text should have 'en' key"
            assert "es" in cta_text, "cta_text should have 'es' key"
            print(f"Localized CTA: EN='{cta_text.get('en')}', ES='{cta_text.get('es')}'")


class TestAdminAurexConfigRoundTrip:
    """Test that admin can save and retrieve localized config values"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    def test_save_localized_config_roundtrip(self, auth_token):
        """Test saving and retrieving localized config values"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Save config with localized values
        test_config = {
            "title": {"en": "TEST_Title_EN", "es": "TEST_Titulo_ES"},
            "subtitle": {"en": "TEST_Subtitle_EN", "es": "TEST_Subtitulo_ES"},
            "cta_text": {"en": "TEST_CTA_EN", "es": "TEST_CTA_ES"},
            "cta_url": "/test-url"
        }
        
        save_response = requests.put(
            f"{BASE_URL}/api/admin/aurex/aurex_process/config",
            json=test_config,
            headers=headers
        )
        assert save_response.status_code == 200, f"Save failed: {save_response.text}"
        
        # Retrieve and verify
        get_response = requests.get(
            f"{BASE_URL}/api/admin/aurex/aurex_process/config",
            headers=headers
        )
        assert get_response.status_code == 200
        saved = get_response.json()
        
        # Verify localized values survived round-trip
        assert saved.get("title") == test_config["title"], "Title dict not preserved"
        assert saved.get("subtitle") == test_config["subtitle"], "Subtitle dict not preserved"
        assert saved.get("cta_text") == test_config["cta_text"], "CTA text dict not preserved"
        print("Localized config round-trip successful")
    
    def test_save_localized_item_roundtrip(self, auth_token):
        """Test saving and retrieving localized item values"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Create item with localized values
        test_item = {
            "title": {"en": "TEST_Item_EN", "es": "TEST_Item_ES"},
            "description": {"en": "TEST_Desc_EN", "es": "TEST_Desc_ES"},
            "icon": "star",
            "visible": True
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/aurex/aurex_audience/items",
            json=test_item,
            headers=headers
        )
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        created = create_response.json()
        item_id = created.get("id")
        
        try:
            # Verify localized values in response
            assert created.get("title") == test_item["title"], "Title dict not preserved on create"
            assert created.get("description") == test_item["description"], "Description dict not preserved on create"
            
            # Retrieve via GET and verify
            get_response = requests.get(
                f"{BASE_URL}/api/admin/aurex/aurex_audience/items",
                headers=headers
            )
            assert get_response.status_code == 200
            items = get_response.json()
            found = next((i for i in items if i.get("id") == item_id), None)
            assert found is not None, "Created item not found in list"
            assert found.get("title") == test_item["title"], "Title dict not preserved on GET"
            print("Localized item round-trip successful")
        finally:
            # Cleanup
            requests.delete(
                f"{BASE_URL}/api/admin/aurex/aurex_audience/items/{item_id}",
                headers=headers
            )


class TestPublicAurexLocalizedData:
    """Test that public endpoints return localized data correctly"""
    
    def test_public_aurex_audience_returns_localized_config(self):
        """Verify public endpoint returns localized config"""
        response = requests.get(f"{BASE_URL}/api/public/aurex/aurex_audience")
        assert response.status_code == 200
        data = response.json()
        config = data.get("config", {})
        
        # Config should have localized title
        title = config.get("title")
        if title:
            assert isinstance(title, dict), "Public config title should be dict"
            print(f"Public config title: {title}")
    
    def test_public_aurex_audience_returns_items(self):
        """Verify public endpoint returns items array"""
        response = requests.get(f"{BASE_URL}/api/public/aurex/aurex_audience")
        assert response.status_code == 200
        data = response.json()
        items = data.get("items", [])
        
        assert isinstance(items, list), "items should be a list"
        print(f"Public aurex_audience has {len(items)} items")
        
        # Check first item if exists
        if items:
            first = items[0]
            print(f"First item title: {first.get('title')}")


class TestLegacyStringCompatibility:
    """Test that legacy plain-string values still work (tt() graceful handling)"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    def test_legacy_string_value_accepted(self, auth_token):
        """Test that plain string values are accepted (backward compatibility)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Save config with plain string (legacy format)
        test_config = {
            "title": "Legacy Plain String Title",
            "subtitle": "Legacy Plain String Subtitle"
        }
        
        save_response = requests.put(
            f"{BASE_URL}/api/admin/aurex/aurex_video/config",
            json=test_config,
            headers=headers
        )
        assert save_response.status_code == 200, f"Save failed: {save_response.text}"
        
        # Retrieve and verify string is preserved
        get_response = requests.get(
            f"{BASE_URL}/api/admin/aurex/aurex_video/config",
            headers=headers
        )
        assert get_response.status_code == 200
        saved = get_response.json()
        
        # Plain strings should be preserved as-is
        assert saved.get("title") == test_config["title"], "Legacy string title not preserved"
        print("Legacy string compatibility verified")


class TestAllAurexSectionsPublicEndpoints:
    """Test all Aurex section public endpoints work"""
    
    SECTIONS = [
        "aurex_audience",
        "aurex_process", 
        "aurex_pricing",
        "aurex_team",
        "aurex_events",
        "aurex_partners",
        "aurex_clients",
        "aurex_video"
    ]
    
    @pytest.mark.parametrize("section", SECTIONS)
    def test_public_section_endpoint(self, section):
        """Test each public Aurex section endpoint returns valid data"""
        response = requests.get(f"{BASE_URL}/api/public/aurex/{section}")
        assert response.status_code == 200, f"Section {section} returned {response.status_code}"
        data = response.json()
        assert "config" in data, f"Section {section} missing 'config' key"
        print(f"Section {section}: config keys = {list(data.get('config', {}).keys())}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
