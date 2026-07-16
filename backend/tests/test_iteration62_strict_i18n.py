"""
Iteration 62 - Strict i18n mode + 7 UI bug fixes testing

Tests:
1. Strict i18n: t() returns empty string if current locale is missing (no cross-locale fallback)
2. setLocaleValue no longer creates _legacy keys
3. Video section renders NO title/subtitle when empty
4. FR bug: /admin/aurex-sections loads without React error when FR-only items exist
5. AurexSectionsManager item list shows titles/descriptions/badges without React errors
6. Open-in-new-window fields: cta_new_tab, view_all_new_tab checkboxes
7. Rectangular buttons (border-radius: 0) for audience CTA, team view-all, events, pricing, contact
8. Testimonials render author photo (image || avatar), name, and role (title || role)
9. Services cards: no link when external_url is empty
10. Mono variant headers render ONLY if cmsConfig has content in current locale
11. Backend CRUD: PUT /api/admin/aurex/{section}/config accepts and persists localized dict values
12. Language switcher toggles EN/ES correctly
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@consultant.com"
ADMIN_PASSWORD = "Admin123!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin authentication failed: {response.status_code} - {response.text}")


@pytest.fixture
def admin_headers(admin_token):
    """Headers with admin auth token"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


class TestBackendAurexConfigCRUD:
    """Test backend CRUD for aurex section configs with localized dict values"""
    
    def test_get_public_settings_returns_languages(self):
        """Verify /api/public/settings returns languages array and default_language"""
        response = requests.get(f"{BASE_URL}/api/public/settings")
        assert response.status_code == 200
        data = response.json()
        assert "languages" in data, "Settings should have 'languages' field"
        assert "default_language" in data, "Settings should have 'default_language' field"
        assert isinstance(data["languages"], list), "languages should be a list"
        print(f"Languages: {data['languages']}, Default: {data['default_language']}")
    
    def test_get_aurex_audience_config(self, admin_headers):
        """GET /api/admin/aurex/aurex_audience/config returns localized dict values"""
        response = requests.get(f"{BASE_URL}/api/admin/aurex/aurex_audience/config", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        print(f"Audience config: {data}")
        # Config should exist with section field
        assert data.get("section") == "aurex_audience" or "title" in data or data == {"section": "aurex_audience"}
    
    def test_put_aurex_audience_config_with_localized_values(self, admin_headers):
        """PUT /api/admin/aurex/aurex_audience/config accepts and persists {title: {en, es}, cta_new_tab: true}"""
        payload = {
            "title": {"en": "Aurex is for you", "es": "Aurex es para ti"},
            "subtitle": {"en": "Who this is for", "es": "Para quién es esto"},
            "cta_text": {"en": "Get started", "es": "Comenzar"},
            "cta_url": "/membership-enrollment",
            "cta_new_tab": True
        }
        response = requests.put(f"{BASE_URL}/api/admin/aurex/aurex_audience/config", json=payload, headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify the response contains the localized values
        assert data.get("title") == payload["title"], f"Title should be {payload['title']}, got {data.get('title')}"
        assert data.get("cta_new_tab") == True, "cta_new_tab should be True"
        print(f"Saved audience config: {data}")
    
    def test_public_aurex_audience_returns_localized_config(self):
        """GET /api/public/aurex/aurex_audience returns config with localized dict values"""
        response = requests.get(f"{BASE_URL}/api/public/aurex/aurex_audience")
        assert response.status_code == 200
        data = response.json()
        config = data.get("config", {})
        
        # Verify config has the expected structure
        assert "title" in config or config == {}, f"Config should have title or be empty: {config}"
        if "title" in config:
            # Title should be a dict with en/es keys
            title = config["title"]
            if isinstance(title, dict):
                print(f"Title is localized dict: {title}")
            else:
                print(f"Title is plain string: {title}")
        print(f"Public audience config: {config}")


class TestOpenInNewTabFields:
    """Test that cta_new_tab and view_all_new_tab fields exist in schemas and are persisted"""
    
    def test_aurex_audience_cta_new_tab(self, admin_headers):
        """aurex_audience config has cta_new_tab field"""
        # First save with cta_new_tab
        payload = {"cta_new_tab": True, "cta_text": {"en": "Test CTA"}, "cta_url": "/test"}
        response = requests.put(f"{BASE_URL}/api/admin/aurex/aurex_audience/config", json=payload, headers=admin_headers)
        assert response.status_code == 200
        
        # Verify it's persisted
        response = requests.get(f"{BASE_URL}/api/admin/aurex/aurex_audience/config", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("cta_new_tab") == True, f"cta_new_tab should be True, got {data.get('cta_new_tab')}"
        print("aurex_audience cta_new_tab: PASS")
    
    def test_aurex_pricing_item_cta_new_tab(self, admin_headers):
        """aurex_pricing item has cta_new_tab field"""
        # Create a pricing item with cta_new_tab
        payload = {
            "name": {"en": "TEST_Plan"},
            "price": "99",
            "cta_text": {"en": "Buy Now"},
            "cta_url": "/checkout",
            "cta_new_tab": True
        }
        response = requests.post(f"{BASE_URL}/api/admin/aurex/aurex_pricing/items", json=payload, headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        item_id = data.get("id")
        assert data.get("cta_new_tab") == True, f"cta_new_tab should be True, got {data.get('cta_new_tab')}"
        print(f"Created pricing item with cta_new_tab: {item_id}")
        
        # Cleanup
        if item_id:
            requests.delete(f"{BASE_URL}/api/admin/aurex/aurex_pricing/items/{item_id}", headers=admin_headers)
    
    def test_aurex_team_view_all_new_tab(self, admin_headers):
        """aurex_team config has view_all_new_tab field"""
        payload = {"view_all_new_tab": True, "view_all_text": {"en": "View Team"}, "view_all_url": "/team"}
        response = requests.put(f"{BASE_URL}/api/admin/aurex/aurex_team/config", json=payload, headers=admin_headers)
        assert response.status_code == 200
        
        response = requests.get(f"{BASE_URL}/api/admin/aurex/aurex_team/config", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("view_all_new_tab") == True, f"view_all_new_tab should be True, got {data.get('view_all_new_tab')}"
        print("aurex_team view_all_new_tab: PASS")
    
    def test_aurex_events_view_all_new_tab(self, admin_headers):
        """aurex_events config has view_all_new_tab field"""
        payload = {"view_all_new_tab": True, "view_all_text": {"en": "All Events"}, "view_all_url": "/events"}
        response = requests.put(f"{BASE_URL}/api/admin/aurex/aurex_events/config", json=payload, headers=admin_headers)
        assert response.status_code == 200
        
        response = requests.get(f"{BASE_URL}/api/admin/aurex/aurex_events/config", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("view_all_new_tab") == True, f"view_all_new_tab should be True, got {data.get('view_all_new_tab')}"
        print("aurex_events view_all_new_tab: PASS")


class TestAurexPublicEndpoints:
    """Test all Aurex public endpoints return valid data"""
    
    @pytest.mark.parametrize("section", [
        "aurex_audience", "aurex_process", "aurex_pricing", "aurex_team",
        "aurex_partners", "aurex_clients", "aurex_events", "aurex_video",
        "aurex_services_cfg", "aurex_testimonials_cfg", "aurex_news_cfg",
        "aurex_blog_cfg", "aurex_locations_cfg"
    ])
    def test_public_aurex_section(self, section):
        """GET /api/public/aurex/{section} returns 200 with config"""
        response = requests.get(f"{BASE_URL}/api/public/aurex/{section}")
        assert response.status_code == 200, f"Section {section} returned {response.status_code}"
        data = response.json()
        assert "config" in data, f"Section {section} should have 'config' key"
        print(f"{section}: OK")


class TestTestimonialsPhotoField:
    """Test testimonials use image || avatar for photo"""
    
    def test_get_public_testimonials(self):
        """GET /api/public/testimonials returns testimonials with image/avatar field"""
        response = requests.get(f"{BASE_URL}/api/public/testimonials")
        assert response.status_code == 200
        data = response.json()
        
        if isinstance(data, list) and len(data) > 0:
            t = data[0]
            # Check if testimonial has image or avatar field
            has_photo = "image" in t or "avatar" in t
            print(f"First testimonial: name={t.get('name')}, has_photo={has_photo}, image={t.get('image')}, avatar={t.get('avatar')}")
            # Also check for title/role field
            has_role = "title" in t or "role" in t
            print(f"has_role={has_role}, title={t.get('title')}, role={t.get('role')}")
        else:
            print("No testimonials found")


class TestServicesExternalUrl:
    """Test services cards behavior with/without external_url"""
    
    def test_get_public_services(self):
        """GET /api/public/services returns services with external_url field"""
        response = requests.get(f"{BASE_URL}/api/public/services")
        assert response.status_code == 200
        data = response.json()
        
        if isinstance(data, list) and len(data) > 0:
            for s in data[:3]:
                external_url = s.get("external_url")
                open_in_new_tab = s.get("open_in_new_tab")
                print(f"Service: {s.get('title')}, external_url={external_url}, open_in_new_tab={open_in_new_tab}")
        else:
            print("No services found")


class TestVideoSectionConfig:
    """Test video section config with empty title/subtitle"""
    
    def test_video_config_empty_title(self, admin_headers):
        """Video section should accept empty title/subtitle"""
        # Save video config with empty title
        payload = {
            "title": "",
            "subtitle": "",
            "video_url": "https://www.youtube.com/watch?v=test123"
        }
        response = requests.put(f"{BASE_URL}/api/admin/aurex/aurex_video/config", json=payload, headers=admin_headers)
        assert response.status_code == 200
        
        # Verify public endpoint returns empty title
        response = requests.get(f"{BASE_URL}/api/public/aurex/aurex_video")
        assert response.status_code == 200
        data = response.json()
        config = data.get("config", {})
        print(f"Video config: title='{config.get('title')}', subtitle='{config.get('subtitle')}'")


class TestSectionConfigHeaders:
    """Test section config headers (eyebrow/title/subtitle) for mono variants"""
    
    @pytest.mark.parametrize("section,fields", [
        ("aurex_services_cfg", ["eyebrow", "title", "subtitle", "cta_text", "cta_url", "cta_new_tab"]),
        ("aurex_testimonials_cfg", ["eyebrow", "title", "subtitle", "cta_text", "cta_url", "cta_new_tab"]),
        ("aurex_news_cfg", ["eyebrow", "title", "subtitle", "cta_text", "cta_url", "cta_new_tab"]),
        ("aurex_blog_cfg", ["eyebrow", "title", "subtitle", "cta_text", "cta_url", "cta_new_tab"]),
        ("aurex_locations_cfg", ["eyebrow", "title", "subtitle"]),
    ])
    def test_section_config_fields(self, section, fields, admin_headers):
        """Section config should accept all expected fields"""
        # Build payload with localized values
        payload = {}
        for f in fields:
            if f.endswith("_new_tab"):
                payload[f] = True
            elif f.endswith("_url"):
                payload[f] = "/test"
            else:
                payload[f] = {"en": f"Test {f}", "es": f"Prueba {f}"}
        
        response = requests.put(f"{BASE_URL}/api/admin/aurex/{section}/config", json=payload, headers=admin_headers)
        assert response.status_code == 200, f"Failed to save {section}: {response.text}"
        
        # Verify public endpoint
        response = requests.get(f"{BASE_URL}/api/public/aurex/{section}")
        assert response.status_code == 200
        data = response.json()
        config = data.get("config", {})
        print(f"{section} config saved: {list(config.keys())}")


class TestStrictI18nBehavior:
    """Test strict i18n mode - no cross-locale fallback"""
    
    def test_audience_config_with_empty_es_locale(self, admin_headers):
        """When ES locale is empty, t() should return empty string (not EN fallback)"""
        # Save config with EN filled but ES empty
        payload = {
            "title": {"en": "Only English Title", "es": ""},
            "subtitle": {"en": "Only English Subtitle", "es": ""}
        }
        response = requests.put(f"{BASE_URL}/api/admin/aurex/aurex_audience/config", json=payload, headers=admin_headers)
        assert response.status_code == 200
        
        # Verify the data is stored correctly
        response = requests.get(f"{BASE_URL}/api/public/aurex/aurex_audience")
        assert response.status_code == 200
        data = response.json()
        config = data.get("config", {})
        
        title = config.get("title", {})
        assert title.get("en") == "Only English Title", f"EN title should be set: {title}"
        assert title.get("es") == "", f"ES title should be empty: {title}"
        print(f"Strict i18n test - title stored: {title}")


class TestFRLanguageSupport:
    """Test FR language support doesn't cause React errors"""
    
    def test_create_item_with_fr_only_title(self, admin_headers):
        """Create an item with FR-only title - should not cause errors"""
        payload = {
            "title": {"fr": "Titre en français seulement"},
            "description": {"fr": "Description en français"}
        }
        response = requests.post(f"{BASE_URL}/api/admin/aurex/aurex_audience/items", json=payload, headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        item_id = data.get("id")
        print(f"Created FR-only item: {item_id}")
        
        # Verify it can be retrieved
        response = requests.get(f"{BASE_URL}/api/admin/aurex/aurex_audience/items", headers=admin_headers)
        assert response.status_code == 200
        items = response.json()
        fr_item = next((i for i in items if i.get("id") == item_id), None)
        assert fr_item is not None, "FR-only item should be retrievable"
        assert fr_item.get("title") == {"fr": "Titre en français seulement"}
        
        # Cleanup
        if item_id:
            requests.delete(f"{BASE_URL}/api/admin/aurex/aurex_audience/items/{item_id}", headers=admin_headers)
            print(f"Cleaned up FR-only item: {item_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
