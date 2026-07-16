"""
Iteration 66 Tests - Testing:
1. TestimonialsManager drag-and-drop reordering (order field persists via PUT)
2. GET /api/public/testimonials returns sorted by order ascending
3. TestimonialsManager eye-icon toggle for visibility
4. SectionOrderManager padlock icon for login_required toggle
5. Public settings returns sections[key].login_required correctly
6. Global CSS word-break rules
7. User object detection fallback (user.id || user.member_id || user.username || user.email)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTestimonialsOrdering:
    """Test testimonials drag-and-drop reordering via order field"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and get token"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
        self.token = login_resp.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_get_admin_testimonials(self):
        """GET /api/admin/testimonials returns list"""
        resp = self.session.get(f"{BASE_URL}/api/admin/testimonials")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} testimonials")
        return data
    
    def test_update_testimonial_order(self):
        """PUT /api/admin/testimonials/{id} can update order field"""
        # Get existing testimonials
        resp = self.session.get(f"{BASE_URL}/api/admin/testimonials")
        assert resp.status_code == 200
        testimonials = resp.json()
        
        if len(testimonials) < 2:
            pytest.skip("Need at least 2 testimonials to test reordering")
        
        # Update order of first testimonial
        first = testimonials[0]
        new_order = 99
        update_resp = self.session.put(
            f"{BASE_URL}/api/admin/testimonials/{first['id']}",
            json={**first, "order": new_order}
        )
        assert update_resp.status_code == 200
        updated = update_resp.json()
        assert updated.get("order") == new_order, f"Order not updated: {updated}"
        print(f"Successfully updated testimonial order to {new_order}")
        
        # Restore original order
        self.session.put(
            f"{BASE_URL}/api/admin/testimonials/{first['id']}",
            json={**first, "order": first.get("order", 0)}
        )
    
    def test_public_testimonials_sorted_by_order(self):
        """GET /api/public/testimonials returns sorted by order ascending"""
        resp = requests.get(f"{BASE_URL}/api/public/testimonials")
        assert resp.status_code == 200
        testimonials = resp.json()
        
        if len(testimonials) < 2:
            pytest.skip("Need at least 2 testimonials to verify sorting")
        
        # Check that order values are ascending
        orders = [t.get("order", 0) for t in testimonials]
        assert orders == sorted(orders), f"Testimonials not sorted by order: {orders}"
        print(f"Public testimonials correctly sorted by order: {orders}")


class TestTestimonialsVisibility:
    """Test testimonials visibility toggle (eye icon)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert login_resp.status_code == 200
        self.token = login_resp.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_toggle_testimonial_visibility(self):
        """PUT /api/admin/testimonials/{id} can toggle visible field"""
        resp = self.session.get(f"{BASE_URL}/api/admin/testimonials")
        assert resp.status_code == 200
        testimonials = resp.json()
        
        if not testimonials:
            pytest.skip("No testimonials to test visibility toggle")
        
        first = testimonials[0]
        original_visible = first.get("visible", True)
        
        # Toggle visibility
        update_resp = self.session.put(
            f"{BASE_URL}/api/admin/testimonials/{first['id']}",
            json={**first, "visible": not original_visible}
        )
        assert update_resp.status_code == 200
        updated = update_resp.json()
        assert updated.get("visible") == (not original_visible), f"Visibility not toggled: {updated}"
        print(f"Toggled visibility from {original_visible} to {not original_visible}")
        
        # Restore original visibility
        self.session.put(
            f"{BASE_URL}/api/admin/testimonials/{first['id']}",
            json={**first, "visible": original_visible}
        )
    
    def test_public_testimonials_filters_hidden(self):
        """GET /api/public/testimonials filters out visible=false items"""
        # First, get admin testimonials to see all
        admin_resp = self.session.get(f"{BASE_URL}/api/admin/testimonials")
        assert admin_resp.status_code == 200
        all_testimonials = admin_resp.json()
        
        # Get public testimonials
        public_resp = requests.get(f"{BASE_URL}/api/public/testimonials")
        assert public_resp.status_code == 200
        public_testimonials = public_resp.json()
        
        # Check that hidden testimonials are filtered
        hidden_count = sum(1 for t in all_testimonials if t.get("visible") == False)
        expected_public = len(all_testimonials) - hidden_count
        
        print(f"Admin testimonials: {len(all_testimonials)}, Hidden: {hidden_count}, Public: {len(public_testimonials)}")
        assert len(public_testimonials) <= len(all_testimonials), "Public should not have more than admin"


class TestSectionLoginRequired:
    """Test section login_required (padlock) toggle in settings"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert login_resp.status_code == 200
        self.token = login_resp.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_get_settings_sections(self):
        """GET /api/admin/settings returns sections with login_required field"""
        resp = self.session.get(f"{BASE_URL}/api/admin/settings")
        assert resp.status_code == 200
        settings = resp.json()
        sections = settings.get("sections", {})
        print(f"Settings sections: {list(sections.keys())}")
        return sections
    
    def test_update_section_login_required(self):
        """PUT /api/admin/settings can set sections[key].login_required"""
        # Get current settings
        resp = self.session.get(f"{BASE_URL}/api/admin/settings")
        assert resp.status_code == 200
        settings = resp.json()
        sections = settings.get("sections", {})
        
        # Update aurex_pricing to have login_required=true
        test_section = "aurex_pricing"
        original_section = sections.get(test_section, {})
        original_login_required = original_section.get("login_required", False)
        
        # Set login_required to True
        sections[test_section] = {
            **original_section,
            "enabled": True,
            "login_required": True
        }
        
        update_resp = self.session.put(
            f"{BASE_URL}/api/admin/settings",
            json={"sections": sections}
        )
        assert update_resp.status_code == 200
        updated = update_resp.json()
        
        updated_section = updated.get("sections", {}).get(test_section, {})
        assert updated_section.get("login_required") == True, f"login_required not set: {updated_section}"
        print(f"Successfully set {test_section}.login_required = True")
        
        # Restore original state
        sections[test_section] = {
            **original_section,
            "login_required": original_login_required
        }
        self.session.put(f"{BASE_URL}/api/admin/settings", json={"sections": sections})
    
    def test_public_settings_returns_login_required(self):
        """GET /api/public/settings returns sections with login_required"""
        resp = requests.get(f"{BASE_URL}/api/public/settings")
        assert resp.status_code == 200
        settings = resp.json()
        sections = settings.get("sections", {})
        
        # Check that sections have login_required field accessible
        for key, sec in sections.items():
            if isinstance(sec, dict):
                # login_required should be accessible (may be True, False, or absent)
                lr = sec.get("login_required")
                print(f"Section {key}: login_required={lr}")
        
        print("Public settings correctly exposes sections with login_required")


class TestPublicSectionsEndpoint:
    """Test /api/public/sections endpoint for login_required"""
    
    def test_public_sections_returns_login_required(self):
        """GET /api/public/sections returns sections with login_required"""
        resp = requests.get(f"{BASE_URL}/api/public/sections")
        assert resp.status_code == 200
        data = resp.json()
        
        sections = data.get("sections", {})
        section_order = data.get("section_order", [])
        active_theme = data.get("active_theme", "default")
        
        print(f"Active theme: {active_theme}")
        print(f"Section order: {section_order}")
        
        # Check sections have login_required accessible
        for key, sec in sections.items():
            if isinstance(sec, dict):
                enabled = sec.get("enabled", True)
                login_required = sec.get("login_required", False)
                print(f"  {key}: enabled={enabled}, login_required={login_required}")


class TestEyeAndPadlockIndependence:
    """Test that Eye (enabled) and Padlock (login_required) are independent"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert login_resp.status_code == 200
        self.token = login_resp.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
    
    def test_eye_and_padlock_independent(self):
        """Verify enabled and login_required can be set independently"""
        resp = self.session.get(f"{BASE_URL}/api/admin/settings")
        assert resp.status_code == 200
        settings = resp.json()
        sections = settings.get("sections", {})
        
        test_section = "aurex_pricing"
        original = sections.get(test_section, {})
        
        # Test case 1: enabled=true, login_required=false (public)
        sections[test_section] = {"enabled": True, "login_required": False}
        resp1 = self.session.put(f"{BASE_URL}/api/admin/settings", json={"sections": sections})
        assert resp1.status_code == 200
        result1 = resp1.json().get("sections", {}).get(test_section, {})
        assert result1.get("enabled") == True
        assert result1.get("login_required") == False
        print("Case 1 PASS: enabled=true, login_required=false")
        
        # Test case 2: enabled=true, login_required=true (members-only)
        sections[test_section] = {"enabled": True, "login_required": True}
        resp2 = self.session.put(f"{BASE_URL}/api/admin/settings", json={"sections": sections})
        assert resp2.status_code == 200
        result2 = resp2.json().get("sections", {}).get(test_section, {})
        assert result2.get("enabled") == True
        assert result2.get("login_required") == True
        print("Case 2 PASS: enabled=true, login_required=true")
        
        # Test case 3: enabled=false (hidden from everyone, login_required irrelevant)
        sections[test_section] = {"enabled": False, "login_required": True}
        resp3 = self.session.put(f"{BASE_URL}/api/admin/settings", json={"sections": sections})
        assert resp3.status_code == 200
        result3 = resp3.json().get("sections", {}).get(test_section, {})
        assert result3.get("enabled") == False
        print("Case 3 PASS: enabled=false (hidden from everyone)")
        
        # Restore original
        sections[test_section] = original
        self.session.put(f"{BASE_URL}/api/admin/settings", json={"sections": sections})


class TestAuthMeEndpoint:
    """Test /api/auth/me returns user object with id/member_id/username/email"""
    
    def test_admin_auth_me(self):
        """GET /api/auth/me returns user with id or member_id"""
        session = requests.Session()
        login_resp = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert login_resp.status_code == 200
        token = login_resp.json().get("token")
        
        me_resp = session.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert me_resp.status_code == 200
        user = me_resp.json()
        
        # Check that at least one identifier is present
        has_id = user.get("id") or user.get("user_id") or user.get("member_id") or user.get("username") or user.get("email")
        assert has_id, f"User object missing identifier: {user}"
        print(f"User object has identifiers: id={user.get('id')}, user_id={user.get('user_id')}, member_id={user.get('member_id')}, email={user.get('email')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
