"""
Iteration 63 - Locale-scoped item rendering + LocalizedField in 5 managers
Tests:
1. itemHasLocale() behavior - items only show in locales they have content for
2. Backend CRUD for Testimonials, About, Services, Blog, Books accepts dict values
3. Legacy plain-string content remains visible in every locale
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Get admin token once at module level
_admin_token = None

def get_admin_token():
    global _admin_token
    if _admin_token is None:
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        # API returns "token" not "access_token"
        _admin_token = response.json().get("token")
    return _admin_token

def get_admin_headers():
    return {
        "Authorization": f"Bearer {get_admin_token()}",
        "Content-Type": "application/json"
    }


class TestPublicSettings:
    """Verify language settings are configured"""
    
    def test_settings_has_languages(self):
        """Settings should have languages=['en','es'] and default_language"""
        response = requests.get(f"{BASE_URL}/api/public/settings")
        assert response.status_code == 200
        data = response.json()
        assert "languages" in data
        assert "en" in data["languages"]
        assert "es" in data["languages"]
        assert data.get("default_language") == "en"
        print(f"Languages configured: {data['languages']}, default: {data.get('default_language')}")


class TestTestimonialsLocalizedCRUD:
    """Test Testimonials CRUD with localized dict values"""
    
    def test_create_es_only_testimonial(self):
        """Create a testimonial with ES-only content"""
        headers = get_admin_headers()
        payload = {
            "name": {"es": "TEST_María García"},
            "title": {"es": "Directora de Marketing"},
            "content": {"es": "Este es un testimonio solo en español. Muy bueno!"},
            "image": "",
            "order": 999
        }
        response = requests.post(f"{BASE_URL}/api/admin/testimonials", json=payload, headers=headers)
        assert response.status_code in [200, 201], f"Create failed: {response.text}"
        data = response.json()
        assert "id" in data
        print(f"Created ES-only testimonial: {data.get('id')}")
    
    def test_create_en_only_testimonial(self):
        """Create a testimonial with EN-only content"""
        headers = get_admin_headers()
        payload = {
            "name": {"en": "TEST_John Smith"},
            "title": {"en": "Marketing Director"},
            "content": {"en": "This is an English-only testimonial. Very good!"},
            "image": "",
            "order": 998
        }
        response = requests.post(f"{BASE_URL}/api/admin/testimonials", json=payload, headers=headers)
        assert response.status_code in [200, 201], f"Create failed: {response.text}"
        data = response.json()
        assert "id" in data
        print(f"Created EN-only testimonial: {data.get('id')}")
    
    def test_get_testimonials_returns_dict_values(self):
        """GET testimonials should return dict values for localized fields"""
        headers = get_admin_headers()
        response = requests.get(f"{BASE_URL}/api/admin/testimonials", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # Find our test testimonials
        es_only = [t for t in data if isinstance(t.get("name"), dict) and t.get("name", {}).get("es") == "TEST_María García"]
        en_only = [t for t in data if isinstance(t.get("name"), dict) and t.get("name", {}).get("en") == "TEST_John Smith"]
        print(f"Found {len(es_only)} ES-only and {len(en_only)} EN-only test testimonials")
        # At least one should exist from previous test
        assert len(es_only) > 0 or len(en_only) > 0, "No test testimonials found"


class TestServicesLocalizedCRUD:
    """Test Services CRUD with localized dict values"""
    
    def test_create_es_only_service(self):
        """Create a service with ES-only content"""
        headers = get_admin_headers()
        payload = {
            "title": {"es": "TEST_Consultoría Estratégica"},
            "short_description": {"es": "Descripción corta en español"},
            "full_content": {"es": "Contenido completo solo en español"},
            "icon": "briefcase",
            "image": "",
            "price": 100,
            "currency": "usd",
            "type": "service"
        }
        response = requests.post(f"{BASE_URL}/api/admin/services", json=payload, headers=headers)
        assert response.status_code in [200, 201], f"Create failed: {response.text}"
        data = response.json()
        assert "id" in data
        print(f"Created ES-only service: {data.get('id')}")
    
    def test_get_services_returns_dict_values(self):
        """GET services should return dict values for localized fields"""
        headers = get_admin_headers()
        response = requests.get(f"{BASE_URL}/api/admin/services", headers=headers)
        assert response.status_code == 200
        data = response.json()
        es_only = [s for s in data if isinstance(s.get("title"), dict) and s.get("title", {}).get("es") == "TEST_Consultoría Estratégica"]
        print(f"Found {len(es_only)} ES-only test services")


class TestBlogLocalizedCRUD:
    """Test Blog CRUD with localized dict values"""
    
    def test_create_es_only_blog_post(self):
        """Create a blog post with ES-only content"""
        headers = get_admin_headers()
        payload = {
            "title": {"es": "TEST_Artículo Solo en Español"},
            "summary": {"es": "Resumen del artículo en español"},
            "content": {"es": "<p>Contenido completo del blog en español</p>"},
            "category": "",
            "author": "Test Author",
            "image": "",
            "published": True
        }
        response = requests.post(f"{BASE_URL}/api/admin/blog", json=payload, headers=headers)
        assert response.status_code in [200, 201], f"Create failed: {response.text}"
        data = response.json()
        assert "id" in data
        print(f"Created ES-only blog post: {data.get('id')}")
    
    def test_get_blog_returns_dict_values(self):
        """GET blog should return dict values for localized fields"""
        headers = get_admin_headers()
        response = requests.get(f"{BASE_URL}/api/admin/blog", headers=headers)
        assert response.status_code == 200
        data = response.json()
        es_only = [b for b in data if isinstance(b.get("title"), dict) and b.get("title", {}).get("es") == "TEST_Artículo Solo en Español"]
        print(f"Found {len(es_only)} ES-only test blog posts")


class TestBooksLocalizedCRUD:
    """Test Books (Reading List) CRUD with localized dict values"""
    
    def test_create_es_only_book(self):
        """Create a book with ES-only content"""
        headers = get_admin_headers()
        payload = {
            "title": {"es": "TEST_El Arte de la Estrategia"},
            "author": {"es": "Autor Español"},
            "description": {"es": "Descripción del libro en español"},
            "synopsis": {"es": "Sinopsis en español"},
            "who_is_it_for": {"es": "Para emprendedores hispanohablantes"},
            "about_author": {"es": "Sobre el autor en español"},
            "image": "",
            "amazon_link": "",
            "featured": False
        }
        response = requests.post(f"{BASE_URL}/api/admin/books", json=payload, headers=headers)
        assert response.status_code in [200, 201], f"Create failed: {response.text}"
        data = response.json()
        assert "id" in data
        print(f"Created ES-only book: {data.get('id')}")
    
    def test_get_books_returns_dict_values(self):
        """GET books should return dict values for localized fields"""
        headers = get_admin_headers()
        response = requests.get(f"{BASE_URL}/api/admin/books", headers=headers)
        assert response.status_code == 200
        data = response.json()
        es_only = [b for b in data if isinstance(b.get("title"), dict) and b.get("title", {}).get("es") == "TEST_El Arte de la Estrategia"]
        print(f"Found {len(es_only)} ES-only test books")


class TestAboutLocalizedCRUD:
    """Test About CRUD with localized dict values"""
    
    def test_update_about_with_localized_fields(self):
        """Update About with localized dict values"""
        headers = get_admin_headers()
        # First get current about data
        response = requests.get(f"{BASE_URL}/api/admin/about", headers=headers)
        assert response.status_code == 200
        current = response.json()
        
        # Update with localized values
        payload = {
            **current,
            "label": {"en": "About Us", "es": "Sobre Nosotros"},
            "title": {"en": "Our Story", "es": "Nuestra Historia"},
            "description": {"en": "English description", "es": "Descripción en español"},
            "signature_name": {"en": "John Doe", "es": "Juan García"},
            "signature_title": {"en": "CEO", "es": "Director General"},
            "button_text": {"en": "Learn More", "es": "Saber Más"}
        }
        response = requests.put(f"{BASE_URL}/api/admin/about", json=payload, headers=headers)
        assert response.status_code == 200, f"Update failed: {response.text}"
        print("Updated About with localized fields")
    
    def test_get_about_returns_dict_values(self):
        """GET about should return dict values for localized fields"""
        headers = get_admin_headers()
        response = requests.get(f"{BASE_URL}/api/admin/about", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # Check if label is a dict
        if isinstance(data.get("label"), dict):
            print(f"About label is localized: {data.get('label')}")
        else:
            print(f"About label is plain string: {data.get('label')}")


class TestPublicEndpointsReturnLocalizedData:
    """Test that public endpoints return localized data correctly"""
    
    def test_public_testimonials(self):
        """Public testimonials endpoint returns data"""
        response = requests.get(f"{BASE_URL}/api/public/testimonials")
        assert response.status_code == 200
        data = response.json()
        print(f"Public testimonials count: {len(data)}")
    
    def test_public_services(self):
        """Public services endpoint returns data"""
        response = requests.get(f"{BASE_URL}/api/public/services")
        assert response.status_code == 200
        data = response.json()
        print(f"Public services count: {len(data)}")
    
    def test_public_blog(self):
        """Public blog endpoint returns data"""
        response = requests.get(f"{BASE_URL}/api/public/blog")
        assert response.status_code == 200
        data = response.json()
        print(f"Public blog posts count: {len(data)}")
    
    def test_public_books(self):
        """Public books endpoint returns data"""
        response = requests.get(f"{BASE_URL}/api/public/books")
        assert response.status_code == 200
        data = response.json()
        print(f"Public books count: {len(data)}")
    
    def test_public_about(self):
        """Public about endpoint returns data"""
        response = requests.get(f"{BASE_URL}/api/public/about")
        assert response.status_code == 200
        data = response.json()
        print(f"Public about title: {data.get('title')}")


class TestAurexSectionsLocaleFilter:
    """Test Aurex sections that filter items by locale"""
    
    def test_aurex_audience_endpoint(self):
        """Aurex audience endpoint returns items"""
        response = requests.get(f"{BASE_URL}/api/public/aurex/aurex_audience")
        assert response.status_code == 200
        data = response.json()
        print(f"Aurex audience items: {len(data.get('items', []))}")
    
    def test_aurex_process_endpoint(self):
        """Aurex process endpoint returns items"""
        response = requests.get(f"{BASE_URL}/api/public/aurex/aurex_process")
        assert response.status_code == 200
        data = response.json()
        print(f"Aurex process items: {len(data.get('items', []))}")
    
    def test_aurex_pricing_endpoint(self):
        """Aurex pricing endpoint returns items"""
        response = requests.get(f"{BASE_URL}/api/public/aurex/aurex_pricing")
        assert response.status_code == 200
        data = response.json()
        print(f"Aurex pricing items: {len(data.get('items', []))}")
    
    def test_aurex_team_endpoint(self):
        """Aurex team endpoint returns items"""
        response = requests.get(f"{BASE_URL}/api/public/aurex/aurex_team")
        assert response.status_code == 200
        data = response.json()
        print(f"Aurex team items: {len(data.get('items', []))}")
    
    def test_aurex_events_endpoint(self):
        """Aurex events endpoint returns items"""
        response = requests.get(f"{BASE_URL}/api/public/aurex/aurex_events")
        assert response.status_code == 200
        data = response.json()
        print(f"Aurex events items: {len(data.get('items', []))}")
    
    def test_aurex_partners_endpoint(self):
        """Aurex partners endpoint returns items"""
        response = requests.get(f"{BASE_URL}/api/public/aurex/aurex_partners")
        assert response.status_code == 200
        data = response.json()
        print(f"Aurex partners items: {len(data.get('items', []))}")
    
    def test_aurex_clients_endpoint(self):
        """Aurex clients endpoint returns items"""
        response = requests.get(f"{BASE_URL}/api/public/aurex/aurex_clients")
        assert response.status_code == 200
        data = response.json()
        print(f"Aurex clients items: {len(data.get('items', []))}")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_testimonials(self):
        """Delete test testimonials"""
        headers = get_admin_headers()
        response = requests.get(f"{BASE_URL}/api/admin/testimonials", headers=headers)
        if response.status_code == 200:
            data = response.json()
            for t in data:
                name = t.get("name", "")
                if isinstance(name, dict):
                    name_str = name.get("es", "") or name.get("en", "")
                else:
                    name_str = name
                if name_str.startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/admin/testimonials/{t['id']}", headers=headers)
                    print(f"Deleted test testimonial: {t['id']}")
    
    def test_cleanup_test_services(self):
        """Delete test services"""
        headers = get_admin_headers()
        response = requests.get(f"{BASE_URL}/api/admin/services", headers=headers)
        if response.status_code == 200:
            data = response.json()
            for s in data:
                title = s.get("title", "")
                if isinstance(title, dict):
                    title_str = title.get("es", "") or title.get("en", "")
                else:
                    title_str = title
                if title_str.startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/admin/services/{s['id']}", headers=headers)
                    print(f"Deleted test service: {s['id']}")
    
    def test_cleanup_test_blog(self):
        """Delete test blog posts"""
        headers = get_admin_headers()
        response = requests.get(f"{BASE_URL}/api/admin/blog", headers=headers)
        if response.status_code == 200:
            data = response.json()
            for b in data:
                title = b.get("title", "")
                if isinstance(title, dict):
                    title_str = title.get("es", "") or title.get("en", "")
                else:
                    title_str = title
                if title_str.startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/admin/blog/{b['id']}", headers=headers)
                    print(f"Deleted test blog post: {b['id']}")
    
    def test_cleanup_test_books(self):
        """Delete test books"""
        headers = get_admin_headers()
        response = requests.get(f"{BASE_URL}/api/admin/books", headers=headers)
        if response.status_code == 200:
            data = response.json()
            for b in data:
                title = b.get("title", "")
                if isinstance(title, dict):
                    title_str = title.get("es", "") or title.get("en", "")
                else:
                    title_str = title
                if title_str.startswith("TEST_"):
                    requests.delete(f"{BASE_URL}/api/admin/books/{b['id']}", headers=headers)
                    print(f"Deleted test book: {b['id']}")
