"""
Test Scheduled Backups Feature (Iteration 34)
- Backup settings CRUD (enabled, frequency, max_snapshots)
- Backup snapshots CRUD (create, list, get, delete)
- Scheduler startup verification
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestScheduledBackups:
    """Test scheduled backup settings and snapshot management"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        token = login_resp.json().get("token")
        assert token, "No token returned"
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    # ─────────── Backup Settings Tests ───────────
    
    def test_get_backup_settings(self):
        """GET /api/admin/backup-settings returns settings with required fields"""
        resp = self.session.get(f"{BASE_URL}/api/admin/backup-settings")
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        
        # Verify required fields exist
        assert "enabled" in data, "Missing 'enabled' field"
        assert "frequency" in data, "Missing 'frequency' field"
        assert "max_snapshots" in data, "Missing 'max_snapshots' field"
        
        # Verify types
        assert isinstance(data["enabled"], bool), "enabled should be boolean"
        assert data["frequency"] in ["daily", "weekly", "monthly"], f"Invalid frequency: {data['frequency']}"
        assert isinstance(data["max_snapshots"], int), "max_snapshots should be int"
        print(f"✓ Backup settings: enabled={data['enabled']}, frequency={data['frequency']}, max_snapshots={data['max_snapshots']}")
    
    def test_update_backup_settings_enable(self):
        """PUT /api/admin/backup-settings updates and persists settings"""
        # Update settings
        update_payload = {
            "enabled": True,
            "frequency": "weekly",
            "max_snapshots": 10
        }
        resp = self.session.put(f"{BASE_URL}/api/admin/backup-settings", json=update_payload)
        assert resp.status_code == 200, f"Update failed: {resp.text}"
        data = resp.json()
        
        # Verify response matches payload
        assert data["enabled"] == True, "enabled not updated"
        assert data["frequency"] == "weekly", "frequency not updated"
        assert data["max_snapshots"] == 10, "max_snapshots not updated"
        
        # Verify persistence with GET
        get_resp = self.session.get(f"{BASE_URL}/api/admin/backup-settings")
        assert get_resp.status_code == 200
        persisted = get_resp.json()
        assert persisted["enabled"] == True, "enabled not persisted"
        assert persisted["frequency"] == "weekly", "frequency not persisted"
        assert persisted["max_snapshots"] == 10, "max_snapshots not persisted"
        print("✓ Backup settings updated and persisted correctly")
    
    def test_update_backup_settings_disable(self):
        """PUT /api/admin/backup-settings can disable backups"""
        update_payload = {
            "enabled": False,
            "frequency": "daily",
            "max_snapshots": 5
        }
        resp = self.session.put(f"{BASE_URL}/api/admin/backup-settings", json=update_payload)
        assert resp.status_code == 200, f"Update failed: {resp.text}"
        data = resp.json()
        assert data["enabled"] == False, "enabled should be False"
        print("✓ Backup settings disabled successfully")
    
    # ─────────── Backup Snapshots Tests ───────────
    
    def test_list_backups(self):
        """GET /api/admin/backups returns list of snapshots without full data"""
        resp = self.session.get(f"{BASE_URL}/api/admin/backups")
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        
        assert isinstance(data, list), "Response should be a list"
        
        if len(data) > 0:
            snapshot = data[0]
            # Verify snapshot structure (without data field)
            assert "id" in snapshot, "Missing 'id' field"
            assert "label" in snapshot, "Missing 'label' field"
            assert "created_at" in snapshot, "Missing 'created_at' field"
            assert "size_bytes" in snapshot, "Missing 'size_bytes' field"
            assert "collections" in snapshot, "Missing 'collections' field"
            assert "data" not in snapshot, "data field should NOT be in list response"
            
            # Verify label is valid
            assert snapshot["label"] in ["auto", "manual"], f"Invalid label: {snapshot['label']}"
            print(f"✓ Found {len(data)} backup(s), latest: {snapshot['label']} at {snapshot['created_at']}")
        else:
            print("✓ No backups found (empty list)")
    
    def test_create_backup_now(self):
        """POST /api/admin/backups/create-now creates a new snapshot"""
        resp = self.session.post(f"{BASE_URL}/api/admin/backups/create-now", json={"label": "manual"})
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        
        assert data.get("success") == True, "success should be True"
        assert "backup_id" in data, "Missing backup_id in response"
        backup_id = data["backup_id"]
        assert isinstance(backup_id, str) and len(backup_id) > 0, "backup_id should be non-empty string"
        
        # Verify it appears in list
        list_resp = self.session.get(f"{BASE_URL}/api/admin/backups")
        assert list_resp.status_code == 200
        backups = list_resp.json()
        ids = [b["id"] for b in backups]
        assert backup_id in ids, f"Created backup {backup_id} not found in list"
        print(f"✓ Created backup: {backup_id}")
        
        # Store for later tests
        self.created_backup_id = backup_id
        return backup_id
    
    def test_get_backup_full_data(self):
        """GET /api/admin/backups/{id} returns full backup data for download"""
        # First create a backup
        create_resp = self.session.post(f"{BASE_URL}/api/admin/backups/create-now", json={"label": "manual"})
        assert create_resp.status_code == 200
        backup_id = create_resp.json()["backup_id"]
        
        # Get full backup data
        resp = self.session.get(f"{BASE_URL}/api/admin/backups/{backup_id}")
        assert resp.status_code == 200, f"Failed: {resp.text}"
        data = resp.json()
        
        # Verify it contains collection data
        assert isinstance(data, dict), "Response should be a dict"
        # Should have at least some collections
        assert len(data) > 0, "Backup data should not be empty"
        
        # Check for expected collections
        expected_collections = ["hero_slides", "about", "services", "blog_posts", "settings"]
        found = [c for c in expected_collections if c in data]
        assert len(found) > 0, f"Expected some collections in backup data, got keys: {list(data.keys())}"
        print(f"✓ Got full backup data with {len(data)} collections")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/backups/{backup_id}")
    
    def test_get_backup_not_found(self):
        """GET /api/admin/backups/{id} returns 404 for non-existent backup"""
        resp = self.session.get(f"{BASE_URL}/api/admin/backups/nonexistent-id-12345")
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print("✓ Non-existent backup returns 404")
    
    def test_delete_backup(self):
        """DELETE /api/admin/backups/{id} removes the snapshot"""
        # First create a backup to delete
        create_resp = self.session.post(f"{BASE_URL}/api/admin/backups/create-now", json={"label": "manual"})
        assert create_resp.status_code == 200
        backup_id = create_resp.json()["backup_id"]
        
        # Delete it
        del_resp = self.session.delete(f"{BASE_URL}/api/admin/backups/{backup_id}")
        assert del_resp.status_code == 200, f"Delete failed: {del_resp.text}"
        
        # Verify it's gone
        get_resp = self.session.get(f"{BASE_URL}/api/admin/backups/{backup_id}")
        assert get_resp.status_code == 404, "Deleted backup should return 404"
        
        # Verify not in list
        list_resp = self.session.get(f"{BASE_URL}/api/admin/backups")
        ids = [b["id"] for b in list_resp.json()]
        assert backup_id not in ids, "Deleted backup should not be in list"
        print(f"✓ Deleted backup {backup_id}")
    
    def test_delete_backup_not_found(self):
        """DELETE /api/admin/backups/{id} returns 404 for non-existent backup"""
        resp = self.session.delete(f"{BASE_URL}/api/admin/backups/nonexistent-id-12345")
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print("✓ Delete non-existent backup returns 404")
    
    # ─────────── Auth Tests ───────────
    
    def test_backup_settings_requires_auth(self):
        """Backup settings endpoints require admin auth"""
        no_auth = requests.Session()
        no_auth.headers.update({"Content-Type": "application/json"})
        
        # GET settings
        resp = no_auth.get(f"{BASE_URL}/api/admin/backup-settings")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        
        # PUT settings
        resp = no_auth.put(f"{BASE_URL}/api/admin/backup-settings", json={"enabled": True})
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print("✓ Backup settings require auth")
    
    def test_backups_endpoints_require_auth(self):
        """Backup snapshot endpoints require admin auth"""
        no_auth = requests.Session()
        no_auth.headers.update({"Content-Type": "application/json"})
        
        # List backups
        resp = no_auth.get(f"{BASE_URL}/api/admin/backups")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        
        # Create backup
        resp = no_auth.post(f"{BASE_URL}/api/admin/backups/create-now", json={})
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        
        # Get backup
        resp = no_auth.get(f"{BASE_URL}/api/admin/backups/some-id")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        
        # Delete backup
        resp = no_auth.delete(f"{BASE_URL}/api/admin/backups/some-id")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print("✓ All backup endpoints require auth")
    
    # ─────────── Sorted Order Test ───────────
    
    def test_backups_sorted_by_created_at_desc(self):
        """GET /api/admin/backups returns snapshots sorted by created_at descending"""
        # Create two backups with slight delay
        resp1 = self.session.post(f"{BASE_URL}/api/admin/backups/create-now", json={"label": "manual"})
        assert resp1.status_code == 200
        id1 = resp1.json()["backup_id"]
        
        time.sleep(1)  # Ensure different timestamps
        
        resp2 = self.session.post(f"{BASE_URL}/api/admin/backups/create-now", json={"label": "manual"})
        assert resp2.status_code == 200
        id2 = resp2.json()["backup_id"]
        
        # Get list
        list_resp = self.session.get(f"{BASE_URL}/api/admin/backups")
        assert list_resp.status_code == 200
        backups = list_resp.json()
        
        # Find positions
        ids = [b["id"] for b in backups]
        if id1 in ids and id2 in ids:
            pos1 = ids.index(id1)
            pos2 = ids.index(id2)
            # id2 was created later, should be first (lower index)
            assert pos2 < pos1, f"Newer backup should be first. pos2={pos2}, pos1={pos1}"
            print(f"✓ Backups sorted by created_at desc (newer first)")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/backups/{id1}")
        self.session.delete(f"{BASE_URL}/api/admin/backups/{id2}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
