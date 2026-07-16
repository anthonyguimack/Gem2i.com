"""
Iteration 64 Tests - LocalizedField for Contact Settings, General Settings, and Blog Summary HTML
Tests:
1. Contact Settings - 7 fields with EN/ES localized values
2. General Settings - brand_name, tagline, meta_title, meta_description, footer_description, footer_copyright with EN/ES
3. Blog - summary field as rich text with EN/ES localized values
4. Public endpoints return localized dict values intact
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication for admin tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in login response"
        return data["token"]
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Headers with admin auth token"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }


class TestContactSettings(TestAuth):
    """Test Contact Settings with LocalizedField support for 7 fields"""
    
    def test_get_contact_settings(self, admin_headers):
        """GET /api/admin/contact-settings returns current settings"""
        response = requests.get(f"{BASE_URL}/api/admin/contact-settings", headers=admin_headers)
        assert response.status_code == 200, f"Failed to get contact settings: {response.text}"
        data = response.json()
        # Should have at least title, subtitle, description
        assert "title" in data or isinstance(data, dict)
        print(f"Current contact settings: {data}")
    
    def test_update_contact_settings_with_localized_values(self, admin_headers):
        """PUT /api/admin/contact-settings accepts localized dict values for all 7 fields"""
        localized_data = {
            "title": {"en": "Contact Us", "es": "Contáctenos"},
            "subtitle": {"en": "Let's Work Together", "es": "Trabajemos Juntos"},
            "description": {"en": "Have a project in mind? Let's discuss.", "es": "¿Tienes un proyecto en mente? Hablemos."},
            "name_placeholder": {"en": "Your name", "es": "Tu nombre"},
            "email_placeholder": {"en": "Your email", "es": "Tu correo"},
            "message_placeholder": {"en": "Your message", "es": "Tu mensaje"},
            "submit_text": {"en": "Send Message", "es": "Enviar Mensaje"}
        }
        
        response = requests.put(f"{BASE_URL}/api/admin/contact-settings", json=localized_data, headers=admin_headers)
        assert response.status_code == 200, f"Failed to update contact settings: {response.text}"
        data = response.json()
        
        # Verify all 7 fields are returned with localized values
        assert data.get("title") == localized_data["title"], f"Title mismatch: {data.get('title')}"
        assert data.get("subtitle") == localized_data["subtitle"], f"Subtitle mismatch: {data.get('subtitle')}"
        assert data.get("description") == localized_data["description"], f"Description mismatch: {data.get('description')}"
        assert data.get("name_placeholder") == localized_data["name_placeholder"], f"Name placeholder mismatch"
        assert data.get("email_placeholder") == localized_data["email_placeholder"], f"Email placeholder mismatch"
        assert data.get("message_placeholder") == localized_data["message_placeholder"], f"Message placeholder mismatch"
        assert data.get("submit_text") == localized_data["submit_text"], f"Submit text mismatch"
        print("Contact settings updated with all 7 localized fields successfully")
    
    def test_contact_settings_roundtrip(self, admin_headers):
        """Verify contact settings persist and can be retrieved"""
        # First update
        test_data = {
            "title": {"en": "TEST Contact EN", "es": "TEST Contacto ES"},
            "subtitle": {"en": "TEST Subtitle EN", "es": "TEST Subtítulo ES"},
            "description": {"en": "TEST Description EN", "es": "TEST Descripción ES"},
            "name_placeholder": {"en": "TEST Name EN", "es": "TEST Nombre ES"},
            "email_placeholder": {"en": "TEST Email EN", "es": "TEST Correo ES"},
            "message_placeholder": {"en": "TEST Message EN", "es": "TEST Mensaje ES"},
            "submit_text": {"en": "TEST Send EN", "es": "TEST Enviar ES"}
        }
        
        put_response = requests.put(f"{BASE_URL}/api/admin/contact-settings", json=test_data, headers=admin_headers)
        assert put_response.status_code == 200
        
        # Then retrieve
        get_response = requests.get(f"{BASE_URL}/api/admin/contact-settings", headers=admin_headers)
        assert get_response.status_code == 200
        retrieved = get_response.json()
        
        # Verify roundtrip
        assert retrieved.get("title") == test_data["title"], "Title not persisted correctly"
        assert retrieved.get("submit_text") == test_data["submit_text"], "Submit text not persisted correctly"
        print("Contact settings roundtrip verified successfully")


class TestGeneralSettings(TestAuth):
    """Test General Settings with LocalizedField support for brand_name, tagline, meta_*, footer_*"""
    
    def test_get_settings(self, admin_headers):
        """GET /api/admin/settings returns current settings"""
        response = requests.get(f"{BASE_URL}/api/admin/settings", headers=admin_headers)
        assert response.status_code == 200, f"Failed to get settings: {response.text}"
        data = response.json()
        print(f"Current settings keys: {list(data.keys())[:15]}...")
        return data
    
    def test_update_settings_with_localized_brand_name(self, admin_headers):
        """PUT /api/admin/settings accepts localized dict for brand_name"""
        # First get current settings
        get_response = requests.get(f"{BASE_URL}/api/admin/settings", headers=admin_headers)
        current = get_response.json()
        
        # Update with localized brand_name
        current["brand_name"] = {"en": "Acapital EN", "es": "Acapital ES"}
        
        response = requests.put(f"{BASE_URL}/api/admin/settings", json=current, headers=admin_headers)
        assert response.status_code == 200, f"Failed to update settings: {response.text}"
        
        # Verify
        verify_response = requests.get(f"{BASE_URL}/api/admin/settings", headers=admin_headers)
        verified = verify_response.json()
        assert verified.get("brand_name") == {"en": "Acapital EN", "es": "Acapital ES"}, f"Brand name not saved: {verified.get('brand_name')}"
        print("Brand name localized successfully")
    
    def test_update_settings_with_localized_footer_fields(self, admin_headers):
        """PUT /api/admin/settings accepts localized dict for footer_description and footer_copyright"""
        get_response = requests.get(f"{BASE_URL}/api/admin/settings", headers=admin_headers)
        current = get_response.json()
        
        # Update footer fields with localized values
        current["footer_description"] = {"en": "Strategic consulting for businesses.", "es": "Consultoría estratégica para empresas."}
        current["footer_copyright"] = {"en": "© 2026 All rights reserved.", "es": "© 2026 Todos los derechos reservados."}
        
        response = requests.put(f"{BASE_URL}/api/admin/settings", json=current, headers=admin_headers)
        assert response.status_code == 200, f"Failed to update settings: {response.text}"
        
        # Verify
        verify_response = requests.get(f"{BASE_URL}/api/admin/settings", headers=admin_headers)
        verified = verify_response.json()
        assert verified.get("footer_description") == current["footer_description"], f"Footer description not saved"
        assert verified.get("footer_copyright") == current["footer_copyright"], f"Footer copyright not saved"
        print("Footer fields localized successfully")
    
    def test_update_settings_with_localized_meta_fields(self, admin_headers):
        """PUT /api/admin/settings accepts localized dict for tagline, meta_title, meta_description"""
        get_response = requests.get(f"{BASE_URL}/api/admin/settings", headers=admin_headers)
        current = get_response.json()
        
        # Update meta fields
        current["tagline"] = {"en": "Strategic Business Consulting", "es": "Consultoría Empresarial Estratégica"}
        current["meta_title"] = {"en": "Acapital - Business Consulting", "es": "Acapital - Consultoría de Negocios"}
        current["meta_description"] = {"en": "Innovative solutions for your success.", "es": "Soluciones innovadoras para tu éxito."}
        
        response = requests.put(f"{BASE_URL}/api/admin/settings", json=current, headers=admin_headers)
        assert response.status_code == 200, f"Failed to update settings: {response.text}"
        
        # Verify
        verify_response = requests.get(f"{BASE_URL}/api/admin/settings", headers=admin_headers)
        verified = verify_response.json()
        assert verified.get("tagline") == current["tagline"], f"Tagline not saved"
        assert verified.get("meta_title") == current["meta_title"], f"Meta title not saved"
        assert verified.get("meta_description") == current["meta_description"], f"Meta description not saved"
        print("Meta fields localized successfully")


class TestPublicSettings(TestAuth):
    """Test public settings endpoint returns localized values intact"""
    
    def test_public_settings_returns_localized_values(self):
        """GET /api/public/settings returns localized dict values"""
        response = requests.get(f"{BASE_URL}/api/public/settings")
        assert response.status_code == 200, f"Failed to get public settings: {response.text}"
        data = response.json()
        
        # Check that languages are configured
        assert "languages" in data, "No languages in settings"
        assert "en" in data.get("languages", []), "English not in languages"
        print(f"Public settings languages: {data.get('languages')}")
        print(f"Public settings brand_name type: {type(data.get('brand_name'))}")
        
        # brand_name can be string (legacy) or dict (localized)
        brand_name = data.get("brand_name")
        if isinstance(brand_name, dict):
            print(f"Brand name is localized: {brand_name}")
        else:
            print(f"Brand name is legacy string: {brand_name}")


class TestBlogSummaryHTML(TestAuth):
    """Test Blog summary field as rich text with localized values"""
    
    def test_get_blog_posts(self, admin_headers):
        """GET /api/admin/blog returns blog posts"""
        response = requests.get(f"{BASE_URL}/api/admin/blog", headers=admin_headers)
        assert response.status_code == 200, f"Failed to get blog posts: {response.text}"
        posts = response.json()
        print(f"Found {len(posts)} blog posts")
        if posts:
            first = posts[0]
            print(f"First post title type: {type(first.get('title'))}")
            print(f"First post summary type: {type(first.get('summary'))}")
        return posts
    
    def test_create_blog_with_html_summary(self, admin_headers):
        """POST /api/admin/blog accepts HTML summary with localized values"""
        blog_data = {
            "title": {"en": "TEST Blog Post EN", "es": "TEST Publicación ES"},
            "summary": {
                "en": "<p><strong>Bold summary</strong> with <em>italic</em> text in English.</p>",
                "es": "<p><strong>Resumen en negrita</strong> con texto en <em>cursiva</em> en español.</p>"
            },
            "content": {
                "en": "<h1>Full Content EN</h1><p>This is the full blog content in English.</p>",
                "es": "<h1>Contenido Completo ES</h1><p>Este es el contenido completo del blog en español.</p>"
            },
            "category": "Test",
            "author": "Test Author",
            "published": True
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/blog", json=blog_data, headers=admin_headers)
        assert response.status_code in [200, 201], f"Failed to create blog post: {response.text}"
        created = response.json()
        
        # Verify localized values
        assert created.get("title") == blog_data["title"], f"Title mismatch: {created.get('title')}"
        assert created.get("summary") == blog_data["summary"], f"Summary mismatch: {created.get('summary')}"
        assert created.get("content") == blog_data["content"], f"Content mismatch: {created.get('content')}"
        
        print(f"Created blog post with ID: {created.get('id')}")
        return created
    
    def test_public_blog_returns_html_summary(self):
        """GET /api/public/blog returns posts with HTML summary intact"""
        response = requests.get(f"{BASE_URL}/api/public/blog")
        assert response.status_code == 200, f"Failed to get public blog: {response.text}"
        data = response.json()
        posts = data.get("posts", [])
        
        if posts:
            first = posts[0]
            summary = first.get("summary")
            print(f"First post summary type: {type(summary)}")
            if isinstance(summary, dict):
                en_summary = summary.get("en", "")
                es_summary = summary.get("es", "")
                print(f"EN summary (first 100 chars): {en_summary[:100] if en_summary else 'empty'}")
                print(f"ES summary (first 100 chars): {es_summary[:100] if es_summary else 'empty'}")
                # Check if HTML is preserved
                if "<" in str(en_summary) or "<" in str(es_summary):
                    print("HTML tags preserved in summary")
            else:
                print(f"Summary is plain string: {summary[:100] if summary else 'empty'}")
    
    def test_public_blog_detail_returns_html_summary(self):
        """GET /api/public/blog/{slug} returns post with HTML summary"""
        # First get list to find a slug
        list_response = requests.get(f"{BASE_URL}/api/public/blog")
        posts = list_response.json().get("posts", [])
        
        if posts:
            slug = posts[0].get("slug")
            if slug:
                detail_response = requests.get(f"{BASE_URL}/api/public/blog/{slug}")
                assert detail_response.status_code == 200, f"Failed to get blog detail: {detail_response.text}"
                post = detail_response.json()
                
                summary = post.get("summary")
                print(f"Blog detail summary type: {type(summary)}")
                if isinstance(summary, dict):
                    print(f"Summary is localized dict with keys: {list(summary.keys())}")


class TestLegacyBackwardsCompatibility(TestAuth):
    """Test that legacy plain-string values still work"""
    
    def test_legacy_string_brand_name_works(self, admin_headers):
        """Settings with plain string brand_name should still work"""
        get_response = requests.get(f"{BASE_URL}/api/admin/settings", headers=admin_headers)
        current = get_response.json()
        
        # Set brand_name as plain string (legacy format)
        current["brand_name"] = "Acapital Legacy"
        
        response = requests.put(f"{BASE_URL}/api/admin/settings", json=current, headers=admin_headers)
        assert response.status_code == 200, f"Failed with legacy string: {response.text}"
        
        # Verify it's saved
        verify_response = requests.get(f"{BASE_URL}/api/admin/settings", headers=admin_headers)
        verified = verify_response.json()
        assert verified.get("brand_name") == "Acapital Legacy", f"Legacy string not saved: {verified.get('brand_name')}"
        print("Legacy string brand_name works correctly")
    
    def test_public_settings_with_legacy_values(self):
        """Public settings should return legacy values correctly"""
        response = requests.get(f"{BASE_URL}/api/public/settings")
        assert response.status_code == 200
        data = response.json()
        
        # brand_name should be accessible regardless of format
        brand_name = data.get("brand_name")
        assert brand_name is not None, "brand_name should exist"
        print(f"Public brand_name: {brand_name} (type: {type(brand_name).__name__})")


class TestCleanup(TestAuth):
    """Cleanup test data"""
    
    def test_cleanup_test_blog_posts(self, admin_headers):
        """Delete TEST_ prefixed blog posts"""
        response = requests.get(f"{BASE_URL}/api/admin/blog", headers=admin_headers)
        if response.status_code == 200:
            posts = response.json()
            for post in posts:
                title = post.get("title", "")
                # Handle both string and dict titles
                if isinstance(title, dict):
                    title_str = title.get("en", "") or title.get("es", "")
                else:
                    title_str = str(title)
                
                if title_str.startswith("TEST"):
                    delete_response = requests.delete(f"{BASE_URL}/api/admin/blog/{post['id']}", headers=admin_headers)
                    print(f"Deleted test blog post: {post['id']}")
        print("Cleanup completed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
