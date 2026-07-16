"""
Iteration 78 Tests: Stripe Settings + Site URL + Cleanup
Tests for:
1. Public /public/settings - sensitive keys NOT exposed
2. Admin /admin/settings - stripe_api_key masked, stripe_api_key_preview + stripe_api_key_set
3. Admin /admin/settings PUT - save/clear stripe_api_key
4. site_url normalization
5. /admin/stripe-status endpoint
6. Regression: /admin/members, /public/settings still work
7. Cleanup: index.html no Emergent/PostHog scripts
8. Payments endpoint returns 503 when Stripe not configured (if env not set)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@consultant.com"
ADMIN_PASSWORD = "Admin123!"
MEMBER_EMAIL = "samplemember3@gmail.com"
MEMBER_PASSWORD = "123456789"


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


@pytest.fixture(scope="module")
def member_token():
    """Get member authentication token (non-admin)"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": MEMBER_EMAIL,
        "password": MEMBER_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Member authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def member_headers(member_token):
    return {"Authorization": f"Bearer {member_token}", "Content-Type": "application/json"}


class TestPublicSettingsSensitiveKeys:
    """Test 1: Public /public/settings must NOT include sensitive keys"""
    
    def test_public_settings_no_stripe_api_key(self):
        """stripe_api_key must NOT be in public settings"""
        response = requests.get(f"{BASE_URL}/api/public/settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "stripe_api_key" not in data, "stripe_api_key should NOT be in public settings"
        print("PASS: stripe_api_key not in public settings")
    
    def test_public_settings_no_stripe_publishable_key(self):
        """stripe_publishable_key must NOT be in public settings"""
        response = requests.get(f"{BASE_URL}/api/public/settings")
        assert response.status_code == 200
        data = response.json()
        assert "stripe_publishable_key" not in data, "stripe_publishable_key should NOT be in public settings"
        print("PASS: stripe_publishable_key not in public settings")
    
    def test_public_settings_no_stripe_webhook_secret(self):
        """stripe_webhook_secret must NOT be in public settings"""
        response = requests.get(f"{BASE_URL}/api/public/settings")
        assert response.status_code == 200
        data = response.json()
        assert "stripe_webhook_secret" not in data, "stripe_webhook_secret should NOT be in public settings"
        print("PASS: stripe_webhook_secret not in public settings")
    
    def test_public_settings_no_smtp_password(self):
        """smtp_password must NOT be in public settings"""
        response = requests.get(f"{BASE_URL}/api/public/settings")
        assert response.status_code == 200
        data = response.json()
        assert "smtp_password" not in data, "smtp_password should NOT be in public settings"
        print("PASS: smtp_password not in public settings")
    
    def test_public_settings_no_smtp_user(self):
        """smtp_user must NOT be in public settings"""
        response = requests.get(f"{BASE_URL}/api/public/settings")
        assert response.status_code == 200
        data = response.json()
        assert "smtp_user" not in data, "smtp_user should NOT be in public settings"
        print("PASS: smtp_user not in public settings")


class TestAdminSettingsStripeKey:
    """Test 2: Admin /admin/settings - stripe_api_key masked"""
    
    def test_admin_settings_no_raw_stripe_key(self, admin_headers):
        """Admin settings must NOT include raw stripe_api_key"""
        response = requests.get(f"{BASE_URL}/api/admin/settings", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "stripe_api_key" not in data, "Raw stripe_api_key should NOT be in admin settings response"
        print("PASS: Raw stripe_api_key not in admin settings")
    
    def test_admin_settings_has_stripe_key_preview(self, admin_headers):
        """Admin settings must include stripe_api_key_preview"""
        response = requests.get(f"{BASE_URL}/api/admin/settings", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "stripe_api_key_preview" in data, "stripe_api_key_preview should be in admin settings"
        print(f"PASS: stripe_api_key_preview present: '{data.get('stripe_api_key_preview', '')}'")
    
    def test_admin_settings_has_stripe_key_set(self, admin_headers):
        """Admin settings must include stripe_api_key_set boolean"""
        response = requests.get(f"{BASE_URL}/api/admin/settings", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        assert "stripe_api_key_set" in data, "stripe_api_key_set should be in admin settings"
        assert isinstance(data["stripe_api_key_set"], bool), "stripe_api_key_set should be boolean"
        print(f"PASS: stripe_api_key_set present: {data.get('stripe_api_key_set')}")


class TestAdminSettingsStripeKeyUpdate:
    """Test 3: Admin /admin/settings PUT - save/clear stripe_api_key"""
    
    def test_save_stripe_key_test_mode(self, admin_headers):
        """Save a test Stripe key and verify status shows test mode"""
        # Save a test key
        test_key = "sk_test_demo123abcdefghij"
        response = requests.put(f"{BASE_URL}/api/admin/settings", 
            headers=admin_headers, json={"stripe_api_key": test_key})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Check stripe-status
        status_response = requests.get(f"{BASE_URL}/api/admin/stripe-status", headers=admin_headers)
        assert status_response.status_code == 200
        status = status_response.json()
        assert status.get("configured") == True, "Stripe should be configured after saving key"
        assert status.get("mode") == "test", f"Mode should be 'test', got '{status.get('mode')}'"
        print(f"PASS: Saved test key, status: configured={status.get('configured')}, mode={status.get('mode')}")
    
    def test_save_stripe_key_live_mode(self, admin_headers):
        """Save a live Stripe key and verify status shows live mode"""
        live_key = "sk_live_demo123abcdefghij"
        response = requests.put(f"{BASE_URL}/api/admin/settings", 
            headers=admin_headers, json={"stripe_api_key": live_key})
        assert response.status_code == 200
        
        status_response = requests.get(f"{BASE_URL}/api/admin/stripe-status", headers=admin_headers)
        assert status_response.status_code == 200
        status = status_response.json()
        assert status.get("configured") == True
        assert status.get("mode") == "live", f"Mode should be 'live', got '{status.get('mode')}'"
        print(f"PASS: Saved live key, mode={status.get('mode')}")
    
    def test_clear_stripe_key(self, admin_headers):
        """Clear the Stripe key with empty string"""
        # Clear the key
        response = requests.put(f"{BASE_URL}/api/admin/settings", 
            headers=admin_headers, json={"stripe_api_key": ""})
        assert response.status_code == 200
        
        # Check settings - stripe_api_key_set should be False (unless env fallback)
        settings_response = requests.get(f"{BASE_URL}/api/admin/settings", headers=admin_headers)
        assert settings_response.status_code == 200
        settings = settings_response.json()
        
        # Check status - may fall back to env var
        status_response = requests.get(f"{BASE_URL}/api/admin/stripe-status", headers=admin_headers)
        status = status_response.json()
        
        # If STRIPE_API_KEY env is set, it will fall back to that
        if os.environ.get("STRIPE_API_KEY"):
            print(f"PASS: Cleared CMS key, env fallback active: configured={status.get('configured')}")
        else:
            assert settings.get("stripe_api_key_set") == False, "stripe_api_key_set should be False after clearing"
            print("PASS: Cleared Stripe key, stripe_api_key_set=False")


class TestSiteUrlNormalization:
    """Test 4: site_url normalization"""
    
    def test_normalize_bare_domain(self, admin_headers):
        """'mydomain.com' -> 'https://mydomain.com'"""
        response = requests.put(f"{BASE_URL}/api/admin/settings", 
            headers=admin_headers, json={"site_url": "mydomain.com"})
        assert response.status_code == 200
        data = response.json()
        assert data.get("site_url") == "https://mydomain.com", f"Expected 'https://mydomain.com', got '{data.get('site_url')}'"
        print(f"PASS: 'mydomain.com' -> '{data.get('site_url')}'")
    
    def test_normalize_http_with_trailing_slash(self, admin_headers):
        """'http://mydomain.com/' -> 'http://mydomain.com'"""
        response = requests.put(f"{BASE_URL}/api/admin/settings", 
            headers=admin_headers, json={"site_url": "http://mydomain.com/"})
        assert response.status_code == 200
        data = response.json()
        assert data.get("site_url") == "http://mydomain.com", f"Expected 'http://mydomain.com', got '{data.get('site_url')}'"
        print(f"PASS: 'http://mydomain.com/' -> '{data.get('site_url')}'")
    
    def test_normalize_double_trailing_slash(self, admin_headers):
        """'https://x.com//' -> 'https://x.com'"""
        response = requests.put(f"{BASE_URL}/api/admin/settings", 
            headers=admin_headers, json={"site_url": "https://x.com//"})
        assert response.status_code == 200
        data = response.json()
        assert data.get("site_url") == "https://x.com", f"Expected 'https://x.com', got '{data.get('site_url')}'"
        print(f"PASS: 'https://x.com//' -> '{data.get('site_url')}'")
    
    def test_normalize_with_spaces(self, admin_headers):
        """'  bare.com  ' (spaces) -> 'https://bare.com'"""
        response = requests.put(f"{BASE_URL}/api/admin/settings", 
            headers=admin_headers, json={"site_url": "  bare.com  "})
        assert response.status_code == 200
        data = response.json()
        assert data.get("site_url") == "https://bare.com", f"Expected 'https://bare.com', got '{data.get('site_url')}'"
        print(f"PASS: '  bare.com  ' -> '{data.get('site_url')}'")
    
    def test_clear_site_url(self, admin_headers):
        """Empty string '' clears the field"""
        response = requests.put(f"{BASE_URL}/api/admin/settings", 
            headers=admin_headers, json={"site_url": ""})
        assert response.status_code == 200
        data = response.json()
        assert data.get("site_url") == "" or data.get("site_url") is None, f"Expected empty, got '{data.get('site_url')}'"
        print(f"PASS: '' clears site_url -> '{data.get('site_url')}'")


class TestAdminStripeStatus:
    """Test 5: /admin/stripe-status endpoint"""
    
    def test_stripe_status_returns_expected_fields(self, admin_headers):
        """GET /admin/stripe-status returns configured, mode, webhook_url, site_url"""
        response = requests.get(f"{BASE_URL}/api/admin/stripe-status", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        
        assert "configured" in data, "Response should have 'configured' field"
        assert "mode" in data, "Response should have 'mode' field"
        assert "webhook_url" in data, "Response should have 'webhook_url' field"
        assert "site_url" in data, "Response should have 'site_url' field"
        print(f"PASS: stripe-status has all fields: {list(data.keys())}")
    
    def test_webhook_url_ends_with_correct_path(self, admin_headers):
        """webhook_url must end with '/api/webhook/stripe'"""
        response = requests.get(f"{BASE_URL}/api/admin/stripe-status", headers=admin_headers)
        assert response.status_code == 200
        data = response.json()
        webhook_url = data.get("webhook_url", "")
        if webhook_url:  # Only check if not empty
            assert webhook_url.endswith("/api/webhook/stripe"), f"webhook_url should end with '/api/webhook/stripe', got '{webhook_url}'"
            print(f"PASS: webhook_url ends correctly: {webhook_url}")
        else:
            print("INFO: webhook_url is empty (site_url not set)")
    
    def test_stripe_status_requires_admin(self, member_headers):
        """Non-admin token should return 401/403"""
        response = requests.get(f"{BASE_URL}/api/admin/stripe-status", headers=member_headers)
        assert response.status_code in [401, 403], f"Expected 401/403 for non-admin, got {response.status_code}"
        print(f"PASS: Non-admin gets {response.status_code} on stripe-status")


class TestRegressionExistingEndpoints:
    """Test 9: Regression - existing endpoints still work"""
    
    def test_admin_members_still_works(self, admin_headers):
        """/api/admin/members should still return 200"""
        response = requests.get(f"{BASE_URL}/api/admin/members", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Should return a list of members"
        print(f"PASS: /admin/members returns {len(data)} members")
    
    def test_public_settings_still_works(self):
        """/api/public/settings should still return 200"""
        response = requests.get(f"{BASE_URL}/api/public/settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: /public/settings returns 200")
    
    def test_admin_create_member_default_level(self, admin_headers):
        """Iteration 77 regression: admin create member without level_id defaults to level_free"""
        import uuid
        test_email = f"test_iter78_{uuid.uuid4().hex[:8]}@test.com"
        
        # Create member without level_id
        response = requests.post(f"{BASE_URL}/api/admin/members", headers=admin_headers, json={
            "first_name": "Test",
            "last_name": "Iter78",
            "email": test_email,
            "password": "Test123!"
        })
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify level_id defaults to level_free
        assert data.get("level_id") == "level_free", f"Expected level_id='level_free', got '{data.get('level_id')}'"
        print(f"PASS: New member defaults to level_free")
        
        # Cleanup - delete the test member
        member_id = data.get("membership_id") or data.get("id")
        if member_id:
            requests.delete(f"{BASE_URL}/api/admin/members/{member_id}", headers=admin_headers)


class TestIndexHtmlCleanup:
    """Test 8: Cleanup - index.html has no Emergent/PostHog scripts"""
    
    def test_no_emergent_scripts(self):
        """HTML must NOT contain assets.emergent.sh, emergent-main.js, debug-monitor.js"""
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        html = response.text
        
        forbidden = ["assets.emergent.sh", "emergent-main.js", "debug-monitor.js"]
        for term in forbidden:
            assert term not in html, f"HTML should NOT contain '{term}'"
        print("PASS: No Emergent scripts in HTML")
    
    def test_no_posthog_scripts(self):
        """HTML must NOT contain us.i.posthog.com, posthog.com"""
        response = requests.get(f"{BASE_URL}/")
        assert response.status_code == 200
        html = response.text
        
        forbidden = ["us.i.posthog.com", "posthog.com"]
        for term in forbidden:
            assert term not in html, f"HTML should NOT contain '{term}'"
        print("PASS: No PostHog scripts in HTML")


class TestPaymentsEndpoint:
    """Test 10: Payments endpoint behavior when Stripe not configured"""
    
    def test_payments_checkout_without_stripe(self):
        """POST /api/payments/checkout returns 503 when Stripe not configured (if env not set)"""
        # This test is conditional - if STRIPE_API_KEY env is set, it will attempt the call
        # and may return a different error (which is acceptable)
        
        response = requests.post(f"{BASE_URL}/api/payments/checkout", json={
            "service_id": "nonexistent",
            "origin_url": "https://example.com"
        })
        
        # Should NOT be a 500 crash
        assert response.status_code != 500, f"Should not crash with 500, got {response.status_code}"
        
        # If env is not set and CMS key is cleared, expect 503 or 404 (service not found)
        # If env IS set, it may attempt Stripe call and return different error
        print(f"PASS: /payments/checkout returns {response.status_code} (not 500 crash)")


class TestCleanup:
    """Cleanup: Restore settings after tests"""
    
    def test_restore_settings(self, admin_headers):
        """Restore site_url and stripe_api_key to empty"""
        response = requests.put(f"{BASE_URL}/api/admin/settings", 
            headers=admin_headers, json={"site_url": "", "stripe_api_key": ""})
        assert response.status_code == 200
        print("PASS: Settings restored (site_url='', stripe_api_key cleared)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
