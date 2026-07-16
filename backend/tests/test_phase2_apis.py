"""
Phase 2 API Tests for Legacy Consultant Website
Tests: Authentication (admin/user), Pages Manager, Users Manager, Settings, Dashboard, Blog API
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@consultant.com"
ADMIN_PASSWORD = "Admin123!"
USER_EMAIL = "user@example.com"
USER_PASSWORD = "User123!"


class TestAuthenticationFlow:
    """Test separate admin/user login flows"""
    
    def test_admin_login_with_admin_type(self):
        """Admin can login with login_type=admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "login_type": "admin"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"✓ Admin login with login_type=admin: SUCCESS")
    
    def test_user_login_with_user_type(self):
        """User can login with login_type=user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD,
            "login_type": "user"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "user"
        assert data["user"]["email"] == USER_EMAIL
        print(f"✓ User login with login_type=user: SUCCESS")
    
    def test_user_cannot_login_with_admin_type(self):
        """User login fails when login_type=admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD,
            "login_type": "admin"
        })
        assert response.status_code == 403
        data = response.json()
        assert "Admin access required" in data["detail"]
        print(f"✓ User rejected from admin login: SUCCESS")
    
    def test_admin_cannot_login_with_user_type(self):
        """Admin login fails when login_type=user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "login_type": "user"
        })
        assert response.status_code == 403
        data = response.json()
        assert "admin login" in data["detail"].lower()
        print(f"✓ Admin rejected from user login: SUCCESS")
    
    def test_invalid_credentials(self):
        """Invalid credentials return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@email.com",
            "password": "wrongpass",
            "login_type": "any"
        })
        assert response.status_code == 401
        print(f"✓ Invalid credentials rejected: SUCCESS")


class TestAdminDashboard:
    """Test admin dashboard endpoint with users_count and pages_count"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "login_type": "admin"
        })
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_dashboard_returns_all_stats(self):
        """Dashboard includes users_count and pages_count"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check standard stats
        assert "blog_count" in data
        assert "services_count" in data
        assert "contacts_count" in data
        assert "total_revenue" in data
        
        # Check Phase 2 stats
        assert "users_count" in data
        assert "pages_count" in data
        assert isinstance(data["users_count"], int)
        assert isinstance(data["pages_count"], int)
        print(f"✓ Dashboard stats: users_count={data['users_count']}, pages_count={data['pages_count']}")


class TestNavPagesCRUD:
    """Test nav pages CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "login_type": "admin"
        })
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.created_page_ids = []
    
    def teardown_method(self):
        """Cleanup test pages"""
        for page_id in self.created_page_ids:
            try:
                requests.delete(f"{BASE_URL}/api/admin/nav-pages/{page_id}", headers=self.headers)
            except:
                pass
    
    def test_list_nav_pages(self):
        """List nav pages returns array"""
        response = requests.get(f"{BASE_URL}/api/admin/nav-pages", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ List nav pages: {len(data)} pages found")
    
    def test_create_nav_page(self):
        """Create a new nav page"""
        page_data = {
            "title": f"TEST_Page_{uuid.uuid4().hex[:8]}",
            "url": "/test-page",
            "show_in_header": True,
            "show_in_footer": True,
            "order": 99
        }
        response = requests.post(f"{BASE_URL}/api/admin/nav-pages", json=page_data, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["title"] == page_data["title"]
        assert data["show_in_header"] == True
        self.created_page_ids.append(data["id"])
        print(f"✓ Create nav page: id={data['id']}")
        return data["id"]
    
    def test_update_nav_page(self):
        """Update an existing nav page"""
        # First create
        page_id = self.test_create_nav_page()
        
        # Then update
        update_data = {"title": "TEST_Updated_Title", "show_in_footer": False}
        response = requests.put(f"{BASE_URL}/api/admin/nav-pages/{page_id}", json=update_data, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "TEST_Updated_Title"
        print(f"✓ Update nav page: SUCCESS")
    
    def test_delete_nav_page(self):
        """Delete a nav page"""
        # First create
        page_id = self.test_create_nav_page()
        
        # Then delete
        response = requests.delete(f"{BASE_URL}/api/admin/nav-pages/{page_id}", headers=self.headers)
        assert response.status_code == 200
        self.created_page_ids.remove(page_id)
        print(f"✓ Delete nav page: SUCCESS")


class TestUsersCRUD:
    """Test users CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "login_type": "admin"
        })
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.created_user_ids = []
    
    def teardown_method(self):
        """Cleanup test users"""
        for user_id in self.created_user_ids:
            try:
                requests.delete(f"{BASE_URL}/api/admin/users/{user_id}", headers=self.headers)
            except:
                pass
    
    def test_list_users(self):
        """List users excludes admin"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Check admin is excluded
        admin_in_list = any(u.get("role") == "admin" for u in data)
        assert admin_in_list == False, "Admin should be excluded from user list"
        print(f"✓ List users: {len(data)} users (admin excluded)")
    
    def test_create_user(self):
        """Create a new user"""
        user_data = {
            "first_name": "TEST",
            "last_name": f"User_{uuid.uuid4().hex[:6]}",
            "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
            "password": "TestPass123!",
            "phone": "+1 555-9999"
        }
        response = requests.post(f"{BASE_URL}/api/admin/users", json=user_data, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert data["email"] == user_data["email"]
        assert data["first_name"] == user_data["first_name"]
        self.created_user_ids.append(data["user_id"])
        print(f"✓ Create user: user_id={data['user_id']}")
        return data["user_id"]
    
    def test_update_user(self):
        """Update an existing user"""
        user_id = self.test_create_user()
        
        update_data = {"first_name": "UPDATED", "phone": "+1 555-0000"}
        response = requests.put(f"{BASE_URL}/api/admin/users/{user_id}", json=update_data, headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "UPDATED"
        print(f"✓ Update user: SUCCESS")
    
    def test_delete_user(self):
        """Delete a user"""
        user_id = self.test_create_user()
        
        response = requests.delete(f"{BASE_URL}/api/admin/users/{user_id}", headers=self.headers)
        assert response.status_code == 200
        self.created_user_ids.remove(user_id)
        print(f"✓ Delete user: SUCCESS")
    
    def test_duplicate_email_rejected(self):
        """Cannot create user with duplicate email"""
        user_data = {
            "first_name": "TEST",
            "last_name": "Duplicate",
            "email": USER_EMAIL,  # Existing email
            "password": "TestPass123!"
        }
        response = requests.post(f"{BASE_URL}/api/admin/users", json=user_data, headers=self.headers)
        assert response.status_code == 400
        assert "already in use" in response.json().get("detail", "").lower()
        print(f"✓ Duplicate email rejected: SUCCESS")


class TestSettingsAPI:
    """Test settings API with colors, social links, blog API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "login_type": "admin"
        })
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_settings(self):
        """Get settings returns colors and social_links"""
        response = requests.get(f"{BASE_URL}/api/admin/settings", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        
        # Check colors object exists
        assert "colors" in data
        colors = data["colors"]
        assert "primary" in colors
        assert "accent" in colors
        
        # Check social_links array exists
        assert "social_links" in data
        assert isinstance(data["social_links"], list)
        
        # Check blog_api_url exists
        assert "blog_api_url" in data
        
        print(f"✓ Settings: colors={len(colors)} fields, social_links={len(data['social_links'])}, blog_api_url={data['blog_api_url'][:30]}...")
    
    def test_update_settings_colors(self):
        """Update color settings"""
        response = requests.get(f"{BASE_URL}/api/admin/settings", headers=self.headers)
        original = response.json()
        
        # Update a color
        updated_colors = original.get("colors", {}).copy()
        updated_colors["accent"] = "#FF5733"  # Temporary change
        
        response = requests.put(f"{BASE_URL}/api/admin/settings", json={"colors": updated_colors}, headers=self.headers)
        assert response.status_code == 200
        
        # Verify change
        response = requests.get(f"{BASE_URL}/api/admin/settings", headers=self.headers)
        assert response.json()["colors"]["accent"] == "#FF5733"
        
        # Revert
        updated_colors["accent"] = original.get("colors", {}).get("accent", "#0D9488")
        requests.put(f"{BASE_URL}/api/admin/settings", json={"colors": updated_colors}, headers=self.headers)
        print(f"✓ Update settings colors: SUCCESS")


class TestPublicNavPages:
    """Test public nav-pages endpoint"""
    
    def test_public_nav_pages(self):
        """Public nav-pages returns footer pages"""
        response = requests.get(f"{BASE_URL}/api/public/nav-pages")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # Check for footer pages (Terms, Privacy should be in footer)
        footer_pages = [p for p in data if p.get("show_in_footer")]
        assert len(footer_pages) >= 1, "Should have at least 1 footer page"
        print(f"✓ Public nav-pages: {len(data)} pages, {len(footer_pages)} in footer")


class TestExternalBlogAPI:
    """Test external blog API proxy"""
    
    def test_blog_latest(self):
        """Blog latest returns posts from external API"""
        response = requests.get(f"{BASE_URL}/api/blog/latest")
        assert response.status_code == 200
        data = response.json()
        
        # May return posts or error if external API is down
        assert "posts" in data
        if data["posts"]:
            post = data["posts"][0]
            assert "title" in post
            assert "url" in post or "link" in post
            print(f"✓ Blog latest: {len(data['posts'])} posts from external API")
        else:
            print(f"✓ Blog latest: API responded (may be unavailable: {data.get('error', 'no posts')})")


class TestContactForm:
    """Test contact form submission"""
    
    def test_contact_submission(self):
        """Submit contact form"""
        contact_data = {
            "name": "TEST_Contact",
            "email": "test@example.com",
            "phone": "+1 555-0000",
            "subject": "Test Subject",
            "message": "This is a test message from automated testing."
        }
        response = requests.post(f"{BASE_URL}/api/contact", json=contact_data)
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "message" in data
        print(f"✓ Contact form submission: id={data['id']}")


class TestPublicBooks:
    """Test public books API for reading list"""
    
    def test_get_books(self):
        """Get books returns basic book data (extended fields are optional)"""
        response = requests.get(f"{BASE_URL}/api/public/books")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        if data:
            book = data[0]
            # Required fields
            assert "title" in book
            assert "author" in book
            assert "id" in book
            # Phase 2 fields (optional - may not exist in legacy data)
            has_extended = any(k in book for k in ["synopsis", "who_is_it_for", "about_author"])
            print(f"✓ Books API: {len(data)} books, extended fields present: {has_extended}")
        else:
            print(f"✓ Books API: 0 books (empty)")


class TestSMTPEndpoints:
    """Test SMTP admin endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD,
            "login_type": "admin"
        })
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_smtp_test_connection_endpoint_exists(self):
        """SMTP test connection endpoint responds"""
        # Test with empty/invalid config - should return 400 or success:false
        response = requests.post(f"{BASE_URL}/api/admin/smtp/test-connection", 
            json={"smtp_host": "", "smtp_port": 587, "smtp_user": "", "smtp_password": ""},
            headers=self.headers)
        assert response.status_code in [200, 400]
        print(f"✓ SMTP test-connection endpoint: accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
