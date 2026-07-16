"""
Iteration 60 - Aurex One-page Theme Phase 1+2 Backend Tests
Tests:
- Section order endpoints (GET/PUT with theme=aurex)
- Section config endpoints (GET/PUT for per-section bg_color, font_family, enabled)
- Public sections endpoint (returns active_theme, section_order, section_configs)
- Aurex sections CRUD (7 sections: audience, process, pricing, team, events, partners, clients)
- Items CRUD for 6 sections (events is config-only)
- Reorder items endpoint
- Public aurex endpoints
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@consultant.com"
ADMIN_PASSWORD = "Admin123!"

# Aurex sections
ITEM_SECTIONS = ["aurex_audience", "aurex_process", "aurex_pricing", "aurex_team", "aurex_partners", "aurex_clients"]
CONFIG_ONLY_SECTION = "aurex_events"
ALL_SECTIONS = ITEM_SECTIONS + [CONFIG_ONLY_SECTION]

# Expected Aurex default order (15 sections)
AUREX_DEFAULT_ORDER = [
    "hero", "about", "aurex_audience", "services", "aurex_process", "aurex_pricing",
    "aurex_team", "testimonials", "aurex_events", "news", "blog", "aurex_partners", "aurex_clients",
    "map", "contact",
]


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    return resp.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers with admin auth"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


class TestSectionOrder:
    """Tests for section-order endpoints with theme support"""

    def test_get_section_order_aurex_default(self, admin_headers):
        """GET /api/admin/section-order?theme=aurex returns 15-section Aurex default order"""
        resp = requests.get(f"{BASE_URL}/api/admin/section-order", params={"theme": "aurex"}, headers=admin_headers)
        assert resp.status_code == 200
        order = resp.json()
        assert isinstance(order, list)
        assert len(order) == 15, f"Expected 15 sections, got {len(order)}"
        # Verify all aurex sections are present
        for section in ALL_SECTIONS:
            assert section in order, f"Missing section: {section}"

    def test_put_section_order_aurex(self, admin_headers):
        """PUT /api/admin/section-order with theme=aurex persists per-theme ordering"""
        # Reorder: move contact to position 5
        new_order = AUREX_DEFAULT_ORDER.copy()
        new_order.remove("contact")
        new_order.insert(5, "contact")
        
        resp = requests.put(f"{BASE_URL}/api/admin/section-order", json={
            "theme": "aurex",
            "order": new_order
        }, headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["theme"] == "aurex"
        assert data["order"] == new_order
        
        # Verify persistence
        resp2 = requests.get(f"{BASE_URL}/api/admin/section-order", params={"theme": "aurex"}, headers=admin_headers)
        assert resp2.status_code == 200
        assert resp2.json() == new_order
        
        # Restore default order
        requests.put(f"{BASE_URL}/api/admin/section-order", json={
            "theme": "aurex",
            "order": AUREX_DEFAULT_ORDER
        }, headers=admin_headers)


class TestSectionConfig:
    """Tests for per-section config (bg_color, font_family, enabled)"""

    def test_get_section_config_empty(self, admin_headers):
        """GET /api/admin/section-config returns {} for empty config"""
        resp = requests.get(f"{BASE_URL}/api/admin/section-config", params={"theme": "aurex"}, headers=admin_headers)
        assert resp.status_code == 200
        # May be empty or have existing config
        assert isinstance(resp.json(), dict)

    def test_put_section_config_aurex(self, admin_headers):
        """PUT /api/admin/section-config persists bg_color, font_family, enabled per section"""
        test_configs = {
            "hero": {"bg_color": "#FFFFFF", "font_family": "sora", "enabled": True},
            "aurex_audience": {"bg_color": "#F9FAFB", "font_family": "inter", "enabled": True},
            "aurex_pricing": {"bg_color": "#111827", "font_family": "playfair", "enabled": False},
        }
        
        resp = requests.put(f"{BASE_URL}/api/admin/section-config", json={
            "theme": "aurex",
            "configs": test_configs
        }, headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["theme"] == "aurex"
        assert data["configs"] == test_configs
        
        # Verify persistence
        resp2 = requests.get(f"{BASE_URL}/api/admin/section-config", params={"theme": "aurex"}, headers=admin_headers)
        assert resp2.status_code == 200
        saved = resp2.json()
        assert saved.get("hero", {}).get("bg_color") == "#FFFFFF"
        assert saved.get("aurex_audience", {}).get("font_family") == "inter"
        assert saved.get("aurex_pricing", {}).get("enabled") == False


class TestPublicSections:
    """Tests for public sections endpoint"""

    def test_public_sections_returns_theme_data(self):
        """GET /api/public/sections returns active_theme, section_order, section_configs"""
        resp = requests.get(f"{BASE_URL}/api/public/sections")
        assert resp.status_code == 200
        data = resp.json()
        
        # Should have these keys
        assert "active_theme" in data
        assert "section_order" in data
        assert "section_configs" in data
        
        # section_order should be a list
        assert isinstance(data["section_order"], list)
        # section_configs should be a dict
        assert isinstance(data["section_configs"], dict)


class TestAurexSectionConfig:
    """Tests for Aurex section-level config CRUD"""

    @pytest.mark.parametrize("section", ALL_SECTIONS)
    def test_get_config_returns_section_key(self, admin_headers, section):
        """GET /api/admin/aurex/{section}/config returns {} or config with section key"""
        resp = requests.get(f"{BASE_URL}/api/admin/aurex/{section}/config", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, dict)
        # Should have section key if not empty
        if data:
            assert data.get("section") == section

    def test_put_config_saves_all_fields(self, admin_headers):
        """PUT /api/admin/aurex/{section}/config saves config with section discriminator"""
        section = "aurex_audience"
        config_data = {
            "title": "TEST_Aurex is for you",
            "subtitle": "Who this is for...",
            "cta_text": "Get started",
            "cta_url": "/enrollment"
        }
        
        resp = requests.put(f"{BASE_URL}/api/admin/aurex/{section}/config", json=config_data, headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["section"] == section
        assert data["title"] == "TEST_Aurex is for you"
        assert data["cta_text"] == "Get started"
        
        # Verify persistence
        resp2 = requests.get(f"{BASE_URL}/api/admin/aurex/{section}/config", headers=admin_headers)
        assert resp2.status_code == 200
        assert resp2.json()["title"] == "TEST_Aurex is for you"

    def test_put_events_config_only(self, admin_headers):
        """aurex_events config saves display preferences"""
        config_data = {
            "title": "TEST_Upcoming Events",
            "max_items": 5,
            "only_upcoming": True,
            "view_all_text": "View all events"
        }
        
        resp = requests.put(f"{BASE_URL}/api/admin/aurex/aurex_events/config", json=config_data, headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["section"] == "aurex_events"
        assert data["max_items"] == 5
        assert data["only_upcoming"] == True


class TestAurexItemsCRUD:
    """Tests for Aurex items CRUD (6 sections with items)"""

    @pytest.fixture(autouse=True)
    def cleanup_test_items(self, admin_headers):
        """Cleanup TEST_ prefixed items after each test"""
        yield
        # Cleanup
        for section in ITEM_SECTIONS:
            resp = requests.get(f"{BASE_URL}/api/admin/aurex/{section}/items", headers=admin_headers)
            if resp.status_code == 200:
                for item in resp.json():
                    if item.get("title", "").startswith("TEST_") or item.get("name", "").startswith("TEST_"):
                        requests.delete(f"{BASE_URL}/api/admin/aurex/{section}/items/{item['id']}", headers=admin_headers)

    def test_create_item_auto_order(self, admin_headers):
        """POST /api/admin/aurex/{section}/items creates with auto-incrementing order + visible=true"""
        section = "aurex_audience"
        item_data = {"title": "TEST_Entrepreneurs", "description": "For business owners"}
        
        resp = requests.post(f"{BASE_URL}/api/admin/aurex/{section}/items", json=item_data, headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        
        assert "id" in data
        assert data["section"] == section
        assert data["title"] == "TEST_Entrepreneurs"
        assert data["visible"] == True
        assert "order" in data
        assert isinstance(data["order"], int)

    def test_list_items_sorted(self, admin_headers):
        """GET /api/admin/aurex/{section}/items lists sorted by order"""
        section = "aurex_process"
        
        # Create 2 items
        resp1 = requests.post(f"{BASE_URL}/api/admin/aurex/{section}/items", json={"title": "TEST_Step A"}, headers=admin_headers)
        resp2 = requests.post(f"{BASE_URL}/api/admin/aurex/{section}/items", json={"title": "TEST_Step B"}, headers=admin_headers)
        
        # List
        resp = requests.get(f"{BASE_URL}/api/admin/aurex/{section}/items", headers=admin_headers)
        assert resp.status_code == 200
        items = resp.json()
        assert isinstance(items, list)
        
        # Verify sorted by order
        orders = [i["order"] for i in items]
        assert orders == sorted(orders)

    def test_update_item(self, admin_headers):
        """PUT /api/admin/aurex/{section}/items/{id} updates item"""
        section = "aurex_pricing"
        
        # Create
        resp = requests.post(f"{BASE_URL}/api/admin/aurex/{section}/items", json={
            "name": "TEST_Basic Plan",
            "price": "29"
        }, headers=admin_headers)
        item_id = resp.json()["id"]
        
        # Update
        resp2 = requests.put(f"{BASE_URL}/api/admin/aurex/{section}/items/{item_id}", json={
            "name": "TEST_Basic Plan Updated",
            "price": "39",
            "badge": "Popular"
        }, headers=admin_headers)
        assert resp2.status_code == 200
        data = resp2.json()
        assert data["name"] == "TEST_Basic Plan Updated"
        assert data["price"] == "39"
        assert data["badge"] == "Popular"

    def test_delete_item(self, admin_headers):
        """DELETE /api/admin/aurex/{section}/items/{id} removes item"""
        section = "aurex_team"
        
        # Create
        resp = requests.post(f"{BASE_URL}/api/admin/aurex/{section}/items", json={
            "name": "TEST_John Doe",
            "role": "CEO"
        }, headers=admin_headers)
        item_id = resp.json()["id"]
        
        # Delete
        resp2 = requests.delete(f"{BASE_URL}/api/admin/aurex/{section}/items/{item_id}", headers=admin_headers)
        assert resp2.status_code == 200
        assert resp2.json()["deleted"] == True
        
        # Verify gone
        resp3 = requests.get(f"{BASE_URL}/api/admin/aurex/{section}/items", headers=admin_headers)
        ids = [i["id"] for i in resp3.json()]
        assert item_id not in ids

    def test_reorder_items(self, admin_headers):
        """PUT /api/admin/aurex/{section}/reorder re-indexes based on body.order array"""
        section = "aurex_partners"
        
        # Create 3 items
        ids = []
        for name in ["TEST_Partner A", "TEST_Partner B", "TEST_Partner C"]:
            resp = requests.post(f"{BASE_URL}/api/admin/aurex/{section}/items", json={"name": name}, headers=admin_headers)
            ids.append(resp.json()["id"])
        
        # Reorder: reverse
        new_order = list(reversed(ids))
        resp = requests.put(f"{BASE_URL}/api/admin/aurex/{section}/reorder", json={"order": new_order}, headers=admin_headers)
        assert resp.status_code == 200
        
        # Verify order
        resp2 = requests.get(f"{BASE_URL}/api/admin/aurex/{section}/items", headers=admin_headers)
        items = [i for i in resp2.json() if i["id"] in ids]
        result_ids = [i["id"] for i in sorted(items, key=lambda x: x["order"])]
        assert result_ids == new_order


class TestAurexEventsNoItems:
    """Tests that aurex_events rejects items endpoints"""

    def test_get_items_rejects_events(self, admin_headers):
        """GET /api/admin/aurex/aurex_events/items returns 400"""
        resp = requests.get(f"{BASE_URL}/api/admin/aurex/aurex_events/items", headers=admin_headers)
        assert resp.status_code == 400
        assert "no items" in resp.json()["detail"].lower()

    def test_post_items_rejects_events(self, admin_headers):
        """POST /api/admin/aurex/aurex_events/items returns 400"""
        resp = requests.post(f"{BASE_URL}/api/admin/aurex/aurex_events/items", json={"title": "Test"}, headers=admin_headers)
        assert resp.status_code == 400

    def test_reorder_rejects_events(self, admin_headers):
        """PUT /api/admin/aurex/aurex_events/reorder returns 400"""
        resp = requests.put(f"{BASE_URL}/api/admin/aurex/aurex_events/reorder", json={"order": []}, headers=admin_headers)
        assert resp.status_code == 400


class TestPublicAurexEndpoints:
    """Tests for public Aurex section endpoints"""

    def test_public_aurex_audience(self, admin_headers):
        """GET /api/public/aurex/aurex_audience returns {config, items} with only visible items"""
        section = "aurex_audience"
        
        # Create visible and hidden items
        resp1 = requests.post(f"{BASE_URL}/api/admin/aurex/{section}/items", json={
            "title": "TEST_Visible Item",
            "visible": True
        }, headers=admin_headers)
        visible_id = resp1.json()["id"]
        
        resp2 = requests.post(f"{BASE_URL}/api/admin/aurex/{section}/items", json={
            "title": "TEST_Hidden Item",
            "visible": False
        }, headers=admin_headers)
        hidden_id = resp2.json()["id"]
        
        # Public endpoint
        resp = requests.get(f"{BASE_URL}/api/public/aurex/{section}")
        assert resp.status_code == 200
        data = resp.json()
        
        assert "config" in data
        assert "items" in data
        
        # Only visible items
        item_ids = [i["id"] for i in data["items"]]
        assert visible_id in item_ids
        assert hidden_id not in item_ids
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/aurex/{section}/items/{visible_id}", headers=admin_headers)
        requests.delete(f"{BASE_URL}/api/admin/aurex/{section}/items/{hidden_id}", headers=admin_headers)

    def test_public_aurex_events_pulls_calendar(self, admin_headers):
        """GET /api/public/aurex/aurex_events pulls from calendar_events collection"""
        # Set config
        requests.put(f"{BASE_URL}/api/admin/aurex/aurex_events/config", json={
            "max_items": 3,
            "only_upcoming": True
        }, headers=admin_headers)
        
        resp = requests.get(f"{BASE_URL}/api/public/aurex/aurex_events")
        assert resp.status_code == 200
        data = resp.json()
        
        assert "config" in data
        assert "items" in data
        # Items come from calendar_events, may be empty
        assert isinstance(data["items"], list)

    def test_unknown_section_returns_404(self):
        """GET /api/public/aurex/unknown_section returns 404"""
        resp = requests.get(f"{BASE_URL}/api/public/aurex/unknown_section")
        assert resp.status_code == 404


class TestAurexInvalidSection:
    """Tests for invalid section handling"""

    def test_get_config_invalid_section(self, admin_headers):
        """GET /api/admin/aurex/invalid_section/config returns 404"""
        resp = requests.get(f"{BASE_URL}/api/admin/aurex/invalid_section/config", headers=admin_headers)
        assert resp.status_code == 404

    def test_put_config_invalid_section(self, admin_headers):
        """PUT /api/admin/aurex/invalid_section/config returns 404"""
        resp = requests.put(f"{BASE_URL}/api/admin/aurex/invalid_section/config", json={"title": "Test"}, headers=admin_headers)
        assert resp.status_code == 404
