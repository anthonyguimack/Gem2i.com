"""
Test Backup & Restore Feature (Export/Import Content APIs)
- GET /api/admin/export-content - Export all or selected collections
- POST /api/admin/import-content - Import with merge or replace mode
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBackupRestore:
    """Backup & Restore API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get("token")
        assert token, "No token returned from login"
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        self.token = token
    
    # ─── Export Tests ───
    
    def test_export_all_collections(self):
        """GET /api/admin/export-content should return all collections when no filter"""
        response = self.session.get(f"{BASE_URL}/api/admin/export-content")
        assert response.status_code == 200, f"Export failed: {response.text}"
        
        data = response.json()
        # Should have _meta with export info
        assert "_meta" in data, "Missing _meta in export"
        assert "exported_at" in data["_meta"], "Missing exported_at in _meta"
        assert "version" in data["_meta"], "Missing version in _meta"
        assert "collections" in data["_meta"], "Missing collections list in _meta"
        
        # Should have multiple collections (16 total)
        expected_collections = [
            "hero_slides", "about", "services", "blog_posts", "books", 
            "maps", "map_locations", "gallery", "gallery_albums", "album_photos",
            "portfolio", "testimonials", "nav_pages", "pages", "settings", "member_types"
        ]
        for col in expected_collections:
            assert col in data, f"Missing collection: {col}"
        
        print(f"Export returned {len(data['_meta']['collections'])} collections")
    
    def test_export_selected_collections(self):
        """GET /api/admin/export-content?collections=services,testimonials should return only those"""
        response = self.session.get(f"{BASE_URL}/api/admin/export-content?collections=services,testimonials")
        assert response.status_code == 200, f"Export failed: {response.text}"
        
        data = response.json()
        assert "_meta" in data
        
        # Should only have services and testimonials (plus _meta)
        collections_in_response = [k for k in data.keys() if k != "_meta"]
        assert "services" in collections_in_response, "Missing services in filtered export"
        assert "testimonials" in collections_in_response, "Missing testimonials in filtered export"
        
        # Should NOT have other collections
        assert "blog_posts" not in collections_in_response, "blog_posts should not be in filtered export"
        assert "gallery" not in collections_in_response, "gallery should not be in filtered export"
        
        print(f"Filtered export returned: {collections_in_response}")
    
    def test_export_requires_auth(self):
        """Export should require admin authentication"""
        no_auth_session = requests.Session()
        response = no_auth_session.get(f"{BASE_URL}/api/admin/export-content")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    # ─── Import Tests ───
    
    def test_import_merge_mode(self):
        """POST /api/admin/import-content with mode 'merge' should upsert items"""
        # First export to get valid data
        export_response = self.session.get(f"{BASE_URL}/api/admin/export-content?collections=testimonials")
        assert export_response.status_code == 200
        export_data = export_response.json()
        
        # Add _mode for merge
        export_data["_mode"] = "merge"
        
        # Import the same data back (merge mode)
        import_response = self.session.post(f"{BASE_URL}/api/admin/import-content", json=export_data)
        assert import_response.status_code == 200, f"Import failed: {import_response.text}"
        
        result = import_response.json()
        assert result.get("success") == True, "Import should return success=True"
        assert "results" in result, "Import should return results"
        
        # Check testimonials result
        if "testimonials" in result["results"]:
            testimonials_result = result["results"]["testimonials"]
            assert testimonials_result.get("status") == "ok", f"Testimonials import failed: {testimonials_result}"
            print(f"Merge import testimonials: {testimonials_result.get('count')} items")
    
    def test_import_replace_mode(self):
        """POST /api/admin/import-content with mode 'replace' should clear and re-insert"""
        # First export services
        export_response = self.session.get(f"{BASE_URL}/api/admin/export-content?collections=services")
        assert export_response.status_code == 200
        export_data = export_response.json()
        
        # Add _mode for replace
        export_data["_mode"] = "replace"
        
        # Import with replace mode
        import_response = self.session.post(f"{BASE_URL}/api/admin/import-content", json=export_data)
        assert import_response.status_code == 200, f"Import failed: {import_response.text}"
        
        result = import_response.json()
        assert result.get("success") == True
        
        if "services" in result["results"]:
            services_result = result["results"]["services"]
            assert services_result.get("status") == "ok", f"Services import failed: {services_result}"
            print(f"Replace import services: {services_result.get('count')} items")
    
    def test_import_singleton_collection(self):
        """Import should handle singleton collections (about, settings) correctly"""
        # Export about (singleton)
        export_response = self.session.get(f"{BASE_URL}/api/admin/export-content?collections=about")
        assert export_response.status_code == 200
        export_data = export_response.json()
        
        # Merge mode for singleton
        export_data["_mode"] = "merge"
        
        import_response = self.session.post(f"{BASE_URL}/api/admin/import-content", json=export_data)
        assert import_response.status_code == 200
        
        result = import_response.json()
        if "about" in result["results"]:
            about_result = result["results"]["about"]
            assert about_result.get("status") == "ok"
            assert about_result.get("count") == 1, "About should have count=1"
            print(f"Singleton import about: {about_result}")
    
    def test_import_requires_auth(self):
        """Import should require admin authentication"""
        no_auth_session = requests.Session()
        no_auth_session.headers.update({"Content-Type": "application/json"})
        response = no_auth_session.post(f"{BASE_URL}/api/admin/import-content", json={"_mode": "merge"})
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_import_ignores_invalid_collections(self):
        """Import should ignore collections not in EXPORTABLE_COLLECTIONS"""
        payload = {
            "_mode": "merge",
            "invalid_collection": [{"id": "test", "name": "Test"}],
            "users": [{"id": "hack", "email": "hack@test.com"}]  # users should be ignored
        }
        
        import_response = self.session.post(f"{BASE_URL}/api/admin/import-content", json=payload)
        assert import_response.status_code == 200
        
        result = import_response.json()
        # Should not have results for invalid collections
        assert "invalid_collection" not in result.get("results", {}), "Invalid collection should be ignored"
        assert "users" not in result.get("results", {}), "Users collection should be ignored"
    
    def test_full_export_import_roundtrip(self):
        """Full roundtrip: export all, then import back with merge"""
        # Export all
        export_response = self.session.get(f"{BASE_URL}/api/admin/export-content")
        assert export_response.status_code == 200
        export_data = export_response.json()
        
        # Count collections
        collections_count = len([k for k in export_data.keys() if k != "_meta"])
        print(f"Exported {collections_count} collections")
        
        # Import back with merge
        export_data["_mode"] = "merge"
        import_response = self.session.post(f"{BASE_URL}/api/admin/import-content", json=export_data)
        assert import_response.status_code == 200
        
        result = import_response.json()
        assert result.get("success") == True
        
        # Check all results are ok
        for col, res in result.get("results", {}).items():
            assert res.get("status") == "ok", f"Collection {col} failed: {res}"
        
        print(f"Roundtrip complete: {len(result.get('results', {}))} collections imported")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
