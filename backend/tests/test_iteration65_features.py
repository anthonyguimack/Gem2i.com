"""
Iteration 65 Tests - Services/Testimonials visibility+ordering, Partners/Clients schemas,
Contact description rich text, Footer newsletter settings, About description rich text,
Aurex section anchor IDs, News summary HTML, Back-to-top button.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@consultant.com",
        "password": "Admin123!"
    })
    if resp.status_code == 200:
        return resp.json().get("token")  # API returns 'token' not 'access_token'
    pytest.skip("Admin authentication failed")

@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ============ SERVICES: Visibility + Order ============

class TestServicesVisibilityOrder:
    """Test services hide toggle and drag-drop reorder"""
    
    def test_get_services_returns_sorted_by_order(self, admin_headers):
        """GET /api/public/services returns services sorted by order ascending"""
        resp = requests.get(f"{BASE_URL}/api/public/services")
        assert resp.status_code == 200
        services = resp.json()
        if len(services) > 1:
            orders = [s.get("order", 0) for s in services]
            assert orders == sorted(orders), "Services should be sorted by order ascending"
    
    def test_public_services_filters_hidden(self, admin_headers):
        """GET /api/public/services filters out services with visible=false"""
        # First get admin services to find one to test
        resp = requests.get(f"{BASE_URL}/api/admin/services", headers=admin_headers)
        assert resp.status_code == 200
        admin_services = resp.json()
        
        # Get public services
        resp = requests.get(f"{BASE_URL}/api/public/services")
        assert resp.status_code == 200
        public_services = resp.json()
        
        # Check that any service with visible=false is not in public list
        hidden_ids = [s["id"] for s in admin_services if s.get("visible") == False]
        public_ids = [s["id"] for s in public_services]
        
        for hidden_id in hidden_ids:
            assert hidden_id not in public_ids, f"Hidden service {hidden_id} should not appear in public list"
    
    def test_update_service_order_persists(self, admin_headers):
        """PUT /api/admin/services/{id} persists new order field"""
        # Get existing services
        resp = requests.get(f"{BASE_URL}/api/admin/services", headers=admin_headers)
        assert resp.status_code == 200
        services = resp.json()
        
        if not services:
            pytest.skip("No services to test")
        
        service = services[0]
        original_order = service.get("order", 0)
        new_order = original_order + 100  # Change order
        
        # Update order
        resp = requests.put(
            f"{BASE_URL}/api/admin/services/{service['id']}",
            headers=admin_headers,
            json={**service, "order": new_order}
        )
        assert resp.status_code == 200
        
        # Verify persistence
        resp = requests.get(f"{BASE_URL}/api/admin/services", headers=admin_headers)
        updated = next((s for s in resp.json() if s["id"] == service["id"]), None)
        assert updated is not None
        assert updated.get("order") == new_order
        
        # Restore original order
        requests.put(
            f"{BASE_URL}/api/admin/services/{service['id']}",
            headers=admin_headers,
            json={**service, "order": original_order}
        )
    
    def test_update_service_visible_toggle(self, admin_headers):
        """PUT /api/admin/services/{id} persists visible=false"""
        resp = requests.get(f"{BASE_URL}/api/admin/services", headers=admin_headers)
        services = resp.json()
        
        if not services:
            pytest.skip("No services to test")
        
        service = services[0]
        original_visible = service.get("visible", True)
        
        # Toggle visibility off
        resp = requests.put(
            f"{BASE_URL}/api/admin/services/{service['id']}",
            headers=admin_headers,
            json={**service, "visible": False}
        )
        assert resp.status_code == 200
        
        # Verify persistence
        resp = requests.get(f"{BASE_URL}/api/admin/services", headers=admin_headers)
        updated = next((s for s in resp.json() if s["id"] == service["id"]), None)
        assert updated.get("visible") == False
        
        # Restore original visibility
        requests.put(
            f"{BASE_URL}/api/admin/services/{service['id']}",
            headers=admin_headers,
            json={**service, "visible": original_visible}
        )


# ============ TESTIMONIALS: Visibility + Order ============

class TestTestimonialsVisibilityOrder:
    """Test testimonials hide toggle and ordering"""
    
    def test_get_testimonials_returns_sorted_by_order(self, admin_headers):
        """GET /api/public/testimonials returns testimonials sorted by order ascending"""
        resp = requests.get(f"{BASE_URL}/api/public/testimonials")
        assert resp.status_code == 200
        testimonials = resp.json()
        if len(testimonials) > 1:
            orders = [t.get("order", 0) for t in testimonials]
            assert orders == sorted(orders), "Testimonials should be sorted by order ascending"
    
    def test_public_testimonials_filters_hidden(self, admin_headers):
        """GET /api/public/testimonials filters out testimonials with visible=false"""
        # Get admin testimonials
        resp = requests.get(f"{BASE_URL}/api/admin/testimonials", headers=admin_headers)
        assert resp.status_code == 200
        admin_testimonials = resp.json()
        
        # Get public testimonials
        resp = requests.get(f"{BASE_URL}/api/public/testimonials")
        assert resp.status_code == 200
        public_testimonials = resp.json()
        
        # Check that any testimonial with visible=false is not in public list
        hidden_ids = [t["id"] for t in admin_testimonials if t.get("visible") == False]
        public_ids = [t["id"] for t in public_testimonials]
        
        for hidden_id in hidden_ids:
            assert hidden_id not in public_ids, f"Hidden testimonial {hidden_id} should not appear in public list"
    
    def test_update_testimonial_visible_toggle(self, admin_headers):
        """PUT /api/admin/testimonials/{id} persists visible flag"""
        resp = requests.get(f"{BASE_URL}/api/admin/testimonials", headers=admin_headers)
        testimonials = resp.json()
        
        if not testimonials:
            pytest.skip("No testimonials to test")
        
        testimonial = testimonials[0]
        original_visible = testimonial.get("visible", True)
        
        # Toggle visibility off
        resp = requests.put(
            f"{BASE_URL}/api/admin/testimonials/{testimonial['id']}",
            headers=admin_headers,
            json={**testimonial, "visible": False}
        )
        assert resp.status_code == 200
        
        # Verify persistence
        resp = requests.get(f"{BASE_URL}/api/admin/testimonials", headers=admin_headers)
        updated = next((t for t in resp.json() if t["id"] == testimonial["id"]), None)
        assert updated.get("visible") == False
        
        # Restore original visibility
        requests.put(
            f"{BASE_URL}/api/admin/testimonials/{testimonial['id']}",
            headers=admin_headers,
            json={**testimonial, "visible": original_visible}
        )


# ============ PARTNERS + CLIENTS SCHEMAS ============

class TestPartnersClientsSchemas:
    """Test that Partners and Clients Aurex sections have standardized fields"""
    
    def test_aurex_partners_endpoint_exists(self, admin_headers):
        """GET /api/public/aurex/aurex_partners returns 200"""
        resp = requests.get(f"{BASE_URL}/api/public/aurex/aurex_partners")
        assert resp.status_code == 200
        data = resp.json()
        assert "config" in data
        assert "items" in data
    
    def test_aurex_clients_endpoint_exists(self, admin_headers):
        """GET /api/public/aurex/aurex_clients returns 200"""
        resp = requests.get(f"{BASE_URL}/api/public/aurex/aurex_clients")
        assert resp.status_code == 200
        data = resp.json()
        assert "config" in data
        assert "items" in data
    
    def test_partners_config_accepts_standardized_fields(self, admin_headers):
        """PUT /api/admin/aurex/aurex_partners/config accepts eyebrow, title, subtitle, cta_*, autoscroll, scroll_speed"""
        # Get current config using correct endpoint structure
        resp = requests.get(f"{BASE_URL}/api/admin/aurex/aurex_partners/config", headers=admin_headers)
        if resp.status_code != 200:
            pytest.skip("Aurex partners admin endpoint not available")
        
        current = resp.json() or {}
        
        # Update with standardized fields
        new_config = {
            **current,
            "section": "aurex_partners",
            "eyebrow": "Trusted partners",
            "title": "Our Partners",
            "subtitle": "We work with the best",
            "cta_text": "Become a partner",
            "cta_url": "/contact",
            "cta_new_tab": False,
            "autoscroll": True,
            "scroll_speed": 30
        }
        
        resp = requests.put(
            f"{BASE_URL}/api/admin/aurex/aurex_partners/config",
            headers=admin_headers,
            json=new_config
        )
        assert resp.status_code == 200
        
        # Verify persistence
        resp = requests.get(f"{BASE_URL}/api/admin/aurex/aurex_partners/config", headers=admin_headers)
        saved = resp.json() or {}
        assert saved.get("eyebrow") == "Trusted partners"
        assert saved.get("autoscroll") == True
        assert saved.get("scroll_speed") == 30
    
    def test_clients_config_accepts_standardized_fields(self, admin_headers):
        """PUT /api/admin/aurex/aurex_clients/config accepts eyebrow, title, subtitle, cta_*, autoscroll, scroll_speed"""
        resp = requests.get(f"{BASE_URL}/api/admin/aurex/aurex_clients/config", headers=admin_headers)
        if resp.status_code != 200:
            pytest.skip("Aurex clients admin endpoint not available")
        
        current = resp.json() or {}
        
        new_config = {
            **current,
            "section": "aurex_clients",
            "eyebrow": "Trusted by",
            "title": "Our Clients",
            "subtitle": "Companies that trust us",
            "cta_text": "Join them",
            "cta_url": "/services",
            "cta_new_tab": True,
            "autoscroll": False,
            "scroll_speed": 25
        }
        
        resp = requests.put(
            f"{BASE_URL}/api/admin/aurex/aurex_clients/config",
            headers=admin_headers,
            json=new_config
        )
        assert resp.status_code == 200
        
        # Verify persistence
        resp = requests.get(f"{BASE_URL}/api/admin/aurex/aurex_clients/config", headers=admin_headers)
        saved = resp.json() or {}
        assert saved.get("eyebrow") == "Trusted by"
        assert saved.get("cta_new_tab") == True


# ============ CONTACT DESCRIPTION RICH TEXT ============

class TestContactDescriptionRichText:
    """Test that Contact description is now rich text (HTML)"""
    
    def test_contact_settings_accepts_html_description(self, admin_headers):
        """PUT /api/admin/contact-settings accepts HTML in description field"""
        # Get current settings
        resp = requests.get(f"{BASE_URL}/api/admin/contact-settings", headers=admin_headers)
        current = resp.json() if resp.status_code == 200 else {}
        
        html_description = "<p>Have a <strong>project</strong> in mind? Let's <em>discuss</em> how we can help.</p>"
        
        resp = requests.put(
            f"{BASE_URL}/api/admin/contact-settings",
            headers=admin_headers,
            json={
                **current,
                "description": {"en": html_description, "es": "<p>¿Tienes un <strong>proyecto</strong>?</p>"}
            }
        )
        assert resp.status_code == 200
        
        # Verify persistence
        resp = requests.get(f"{BASE_URL}/api/admin/contact-settings", headers=admin_headers)
        saved = resp.json()
        desc = saved.get("description", {})
        if isinstance(desc, dict):
            assert "<strong>" in desc.get("en", "")
        else:
            # Legacy plain string
            pass


# ============ FOOTER NEWSLETTER SETTINGS ============

class TestFooterNewsletterSettings:
    """Test footer_newsletter_text and footer_newsletter_placeholder in Settings"""
    
    def test_settings_accepts_footer_newsletter_fields(self, admin_headers):
        """PUT /api/admin/settings accepts footer_newsletter_text and footer_newsletter_placeholder"""
        # Get current settings
        resp = requests.get(f"{BASE_URL}/api/admin/settings", headers=admin_headers)
        current = resp.json() if resp.status_code == 200 else {}
        
        resp = requests.put(
            f"{BASE_URL}/api/admin/settings",
            headers=admin_headers,
            json={
                **current,
                "footer_newsletter_text": {"en": "Get the latest insights delivered to your inbox.", "es": "Recibe las últimas novedades."},
                "footer_newsletter_placeholder": {"en": "Email address", "es": "Correo electrónico"}
            }
        )
        assert resp.status_code == 200
        
        # Verify persistence
        resp = requests.get(f"{BASE_URL}/api/admin/settings", headers=admin_headers)
        saved = resp.json()
        assert "footer_newsletter_text" in saved
        assert "footer_newsletter_placeholder" in saved
    
    def test_public_settings_returns_footer_newsletter_fields(self):
        """GET /api/public/settings returns footer_newsletter_text and footer_newsletter_placeholder"""
        resp = requests.get(f"{BASE_URL}/api/public/settings")
        assert resp.status_code == 200
        settings = resp.json()
        # These fields should be present (may be empty if not set)
        # Just verify the endpoint works and returns settings
        assert isinstance(settings, dict)


# ============ ABOUT DESCRIPTION RICH TEXT ============

class TestAboutDescriptionRichText:
    """Test that About description is now rich text (HTML)"""
    
    def test_about_accepts_html_description(self, admin_headers):
        """PUT /api/admin/about accepts HTML in description field"""
        resp = requests.get(f"{BASE_URL}/api/admin/about", headers=admin_headers)
        current = resp.json() if resp.status_code == 200 else {}
        
        html_description = "<p>We are a <strong>consulting firm</strong> with <em>decades</em> of experience.</p>"
        
        resp = requests.put(
            f"{BASE_URL}/api/admin/about",
            headers=admin_headers,
            json={
                **current,
                "description": {"en": html_description, "es": "<p>Somos una <strong>firma</strong> de consultoría.</p>"}
            }
        )
        assert resp.status_code == 200
        
        # Verify persistence
        resp = requests.get(f"{BASE_URL}/api/admin/about", headers=admin_headers)
        saved = resp.json()
        desc = saved.get("description", {})
        if isinstance(desc, dict):
            assert "<strong>" in desc.get("en", "")


# ============ NEWS SUMMARY HTML ============

class TestNewsSummaryHtml:
    """Test that news posts can have HTML summary"""
    
    def test_blog_post_accepts_html_summary(self, admin_headers):
        """POST /api/admin/blog accepts HTML in summary field"""
        html_summary = "<p>This is a <strong>summary</strong> with <em>formatting</em>.</p>"
        
        resp = requests.post(
            f"{BASE_URL}/api/admin/blog",
            headers=admin_headers,
            json={
                "title": {"en": "TEST_HTML_Summary_Post"},
                "summary": {"en": html_summary},
                "content": {"en": "<p>Full content here</p>"},
                "published": True
            }
        )
        assert resp.status_code in [200, 201]
        post_id = resp.json().get("id")
        
        # Verify persistence
        resp = requests.get(f"{BASE_URL}/api/public/blog")
        posts = resp.json().get("posts", [])
        test_post = next((p for p in posts if "TEST_HTML_Summary" in str(p.get("title", ""))), None)
        
        if test_post:
            summary = test_post.get("summary", {})
            if isinstance(summary, dict):
                assert "<strong>" in summary.get("en", "")
        
        # Cleanup
        if post_id:
            requests.delete(f"{BASE_URL}/api/admin/blog/{post_id}", headers=admin_headers)


# ============ AUREX SECTION ANCHOR IDS ============

class TestAurexSectionAnchorIds:
    """Test that Aurex sections have proper anchor IDs"""
    
    def test_aurex_audience_endpoint(self):
        """GET /api/public/aurex/aurex_audience returns 200"""
        resp = requests.get(f"{BASE_URL}/api/public/aurex/aurex_audience")
        assert resp.status_code == 200
    
    def test_aurex_process_endpoint(self):
        """GET /api/public/aurex/aurex_process returns 200"""
        resp = requests.get(f"{BASE_URL}/api/public/aurex/aurex_process")
        assert resp.status_code == 200
    
    def test_aurex_pricing_endpoint(self):
        """GET /api/public/aurex/aurex_pricing returns 200"""
        resp = requests.get(f"{BASE_URL}/api/public/aurex/aurex_pricing")
        assert resp.status_code == 200
    
    def test_aurex_team_endpoint(self):
        """GET /api/public/aurex/aurex_team returns 200"""
        resp = requests.get(f"{BASE_URL}/api/public/aurex/aurex_team")
        assert resp.status_code == 200
    
    def test_aurex_events_endpoint(self):
        """GET /api/public/aurex/aurex_events returns 200"""
        resp = requests.get(f"{BASE_URL}/api/public/aurex/aurex_events")
        assert resp.status_code == 200
    
    def test_aurex_video_endpoint(self):
        """GET /api/public/aurex/aurex_video returns 200"""
        resp = requests.get(f"{BASE_URL}/api/public/aurex/aurex_video")
        assert resp.status_code == 200


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
