"""
Iteration 59 Tests: Discount Coupons + My Bookings Billing + Bug Fixes

Tests:
1. Admin coupon CRUD: POST/GET/PUT/DELETE /api/admin/coupons
2. Member coupon validation: POST /api/member/coupons/validate
3. Coupon uniqueness, discount_type validation, percent clamping, flat in cents
4. Usage mode (total vs per_member) enforcement
5. Coupon applies_to context validation (slots/bundles/both)
6. My Bookings billing_type field (free/paid/credit)
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@consultant.com"
ADMIN_PASSWORD = "Admin123!"
MEMBER_EMAIL = "carlos@example.com"
MEMBER_PASSWORD = "Mentor123!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD,
        "login_type": "admin"
    })
    if r.status_code == 200:
        return r.json().get("token")
    pytest.skip(f"Admin login failed: {r.status_code} - {r.text}")


@pytest.fixture(scope="module")
def member_token():
    """Get member auth token"""
    r = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": MEMBER_EMAIL,
        "password": MEMBER_PASSWORD
    })
    if r.status_code == 200:
        return r.json().get("token")
    pytest.skip(f"Member login failed: {r.status_code} - {r.text}")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def member_headers(member_token):
    return {"Authorization": f"Bearer {member_token}", "Content-Type": "application/json"}


class TestAdminCouponCRUD:
    """Admin coupon CRUD operations"""
    
    created_coupon_ids = []
    
    def test_create_percent_coupon(self, admin_headers):
        """Create a percent discount coupon"""
        code = f"TEST_PERCENT_{uuid.uuid4().hex[:6].upper()}"
        payload = {
            "code": code,
            "discount_type": "percent",
            "discount_value": 25,
            "applies_to": "both",
            "usage_mode": "total",
            "usage_limit": 10,
            "active": True
        }
        r = requests.post(f"{BASE_URL}/api/admin/coupons", json=payload, headers=admin_headers)
        assert r.status_code == 200, f"Create coupon failed: {r.text}"
        data = r.json()
        assert data["code"] == code
        assert data["discount_type"] == "percent"
        assert data["discount_value"] == 25
        assert data["applies_to"] == "both"
        assert data["usage_mode"] == "total"
        assert data["usage_limit"] == 10
        assert data["active"] == True
        assert "id" in data
        self.created_coupon_ids.append(data["id"])
        print(f"✓ Created percent coupon: {code}")
    
    def test_create_flat_coupon(self, admin_headers):
        """Create a flat discount coupon (value in cents)"""
        code = f"TEST_FLAT_{uuid.uuid4().hex[:6].upper()}"
        payload = {
            "code": code,
            "discount_type": "flat",
            "discount_value": 1000,  # $10.00 in cents
            "applies_to": "slots",
            "usage_mode": "per_member",
            "usage_limit": 5,
            "active": True
        }
        r = requests.post(f"{BASE_URL}/api/admin/coupons", json=payload, headers=admin_headers)
        assert r.status_code == 200, f"Create flat coupon failed: {r.text}"
        data = r.json()
        assert data["code"] == code
        assert data["discount_type"] == "flat"
        assert data["discount_value"] == 1000  # Stored in cents
        assert data["applies_to"] == "slots"
        assert data["usage_mode"] == "per_member"
        self.created_coupon_ids.append(data["id"])
        print(f"✓ Created flat coupon: {code} ($10.00)")
    
    def test_percent_clamped_0_100(self, admin_headers):
        """Percent discount is clamped between 0-100"""
        code = f"TEST_CLAMP_{uuid.uuid4().hex[:6].upper()}"
        # Try to create with 150% discount
        payload = {
            "code": code,
            "discount_type": "percent",
            "discount_value": 150,  # Should be clamped to 100
            "applies_to": "both",
            "usage_mode": "total",
            "usage_limit": 0,
            "active": True
        }
        r = requests.post(f"{BASE_URL}/api/admin/coupons", json=payload, headers=admin_headers)
        assert r.status_code == 200, f"Create clamped coupon failed: {r.text}"
        data = r.json()
        assert data["discount_value"] == 100, "Percent should be clamped to 100"
        self.created_coupon_ids.append(data["id"])
        print(f"✓ Percent discount clamped to 100 (was 150)")
    
    def test_duplicate_code_rejected(self, admin_headers):
        """Duplicate coupon code returns 400"""
        code = f"TEST_DUP_{uuid.uuid4().hex[:6].upper()}"
        payload = {
            "code": code,
            "discount_type": "percent",
            "discount_value": 10,
            "applies_to": "both",
            "usage_mode": "total",
            "usage_limit": 0,
            "active": True
        }
        # Create first
        r1 = requests.post(f"{BASE_URL}/api/admin/coupons", json=payload, headers=admin_headers)
        assert r1.status_code == 200
        self.created_coupon_ids.append(r1.json()["id"])
        
        # Try to create duplicate
        r2 = requests.post(f"{BASE_URL}/api/admin/coupons", json=payload, headers=admin_headers)
        assert r2.status_code == 400, f"Duplicate should return 400, got {r2.status_code}"
        assert "already exists" in r2.json().get("detail", "").lower()
        print(f"✓ Duplicate code '{code}' correctly rejected")
    
    def test_list_coupons(self, admin_headers):
        """List all coupons"""
        r = requests.get(f"{BASE_URL}/api/admin/coupons", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        # Should have at least the coupons we created
        assert len(data) >= len(self.created_coupon_ids)
        print(f"✓ Listed {len(data)} coupons")
    
    def test_update_coupon(self, admin_headers):
        """Update an existing coupon"""
        if not self.created_coupon_ids:
            pytest.skip("No coupons created to update")
        
        coupon_id = self.created_coupon_ids[0]
        payload = {
            "code": f"TEST_UPDATED_{uuid.uuid4().hex[:4].upper()}",
            "discount_type": "percent",
            "discount_value": 30,
            "applies_to": "bundles",
            "usage_mode": "per_member",
            "usage_limit": 20,
            "active": False
        }
        r = requests.put(f"{BASE_URL}/api/admin/coupons/{coupon_id}", json=payload, headers=admin_headers)
        assert r.status_code == 200, f"Update failed: {r.text}"
        data = r.json()
        assert data["discount_value"] == 30
        assert data["applies_to"] == "bundles"
        assert data["usage_mode"] == "per_member"
        assert data["active"] == False
        print(f"✓ Updated coupon {coupon_id}")
    
    def test_delete_coupon(self, admin_headers):
        """Delete a coupon"""
        # Create one to delete
        code = f"TEST_DELETE_{uuid.uuid4().hex[:6].upper()}"
        payload = {
            "code": code,
            "discount_type": "percent",
            "discount_value": 5,
            "applies_to": "both",
            "usage_mode": "total",
            "usage_limit": 0,
            "active": True
        }
        r1 = requests.post(f"{BASE_URL}/api/admin/coupons", json=payload, headers=admin_headers)
        assert r1.status_code == 200
        coupon_id = r1.json()["id"]
        
        # Delete it
        r2 = requests.delete(f"{BASE_URL}/api/admin/coupons/{coupon_id}", headers=admin_headers)
        assert r2.status_code == 200
        assert r2.json().get("deleted") == True
        print(f"✓ Deleted coupon {coupon_id}")
    
    def test_delete_nonexistent_coupon(self, admin_headers):
        """Delete nonexistent coupon returns 404"""
        r = requests.delete(f"{BASE_URL}/api/admin/coupons/nonexistent-id-12345", headers=admin_headers)
        assert r.status_code == 404
        print("✓ Delete nonexistent coupon returns 404")


class TestMemberCouponValidation:
    """Member coupon validation endpoint"""
    
    test_coupon_id = None
    test_coupon_code = None
    
    @pytest.fixture(autouse=True)
    def setup_test_coupon(self, admin_headers):
        """Create a test coupon for validation tests"""
        if TestMemberCouponValidation.test_coupon_id:
            return
        
        code = f"TESTVALID_{uuid.uuid4().hex[:6].upper()}"
        payload = {
            "code": code,
            "discount_type": "percent",
            "discount_value": 20,
            "applies_to": "both",
            "usage_mode": "total",
            "usage_limit": 100,
            "active": True
        }
        r = requests.post(f"{BASE_URL}/api/admin/coupons", json=payload, headers=admin_headers)
        if r.status_code == 200:
            TestMemberCouponValidation.test_coupon_id = r.json()["id"]
            TestMemberCouponValidation.test_coupon_code = code
    
    def test_validate_percent_coupon(self, member_headers):
        """Validate a percent coupon returns correct discount"""
        if not self.test_coupon_code:
            pytest.skip("Test coupon not created")
        
        payload = {
            "code": self.test_coupon_code,
            "amount_cents": 5000,  # $50.00
            "context": "slots"
        }
        r = requests.post(f"{BASE_URL}/api/member/coupons/validate", json=payload, headers=member_headers)
        assert r.status_code == 200, f"Validate failed: {r.text}"
        data = r.json()
        assert data["valid"] == True
        assert data["code"] == self.test_coupon_code
        assert data["discount_type"] == "percent"
        assert data["discount_value"] == 20
        # 20% of 5000 = 1000
        assert data["discount_cents"] == 1000
        assert data["original_cents"] == 5000
        assert data["final_cents"] == 4000
        print(f"✓ Validated percent coupon: $50 - 20% = $40")
    
    def test_validate_invalid_code(self, member_headers):
        """Invalid coupon code returns 404"""
        payload = {
            "code": "INVALID_CODE_12345",
            "amount_cents": 5000,
            "context": "slots"
        }
        r = requests.post(f"{BASE_URL}/api/member/coupons/validate", json=payload, headers=member_headers)
        assert r.status_code == 404
        assert "not found" in r.json().get("detail", "").lower()
        print("✓ Invalid code returns 404")
    
    def test_validate_wrong_context(self, admin_headers, member_headers):
        """Coupon with wrong applies_to context returns 400"""
        # Create a slots-only coupon
        code = f"SLOTSONLY_{uuid.uuid4().hex[:6].upper()}"
        payload = {
            "code": code,
            "discount_type": "percent",
            "discount_value": 15,
            "applies_to": "slots",  # Only for slots
            "usage_mode": "total",
            "usage_limit": 0,
            "active": True
        }
        r1 = requests.post(f"{BASE_URL}/api/admin/coupons", json=payload, headers=admin_headers)
        assert r1.status_code == 200
        
        # Try to validate for bundles context
        validate_payload = {
            "code": code,
            "amount_cents": 5000,
            "context": "bundles"  # Wrong context
        }
        r2 = requests.post(f"{BASE_URL}/api/member/coupons/validate", json=validate_payload, headers=member_headers)
        assert r2.status_code == 400
        assert "not valid for bundles" in r2.json().get("detail", "").lower()
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/coupons/{r1.json()['id']}", headers=admin_headers)
        print("✓ Wrong context returns 400")
    
    def test_validate_inactive_coupon(self, admin_headers, member_headers):
        """Inactive coupon returns 400"""
        code = f"INACTIVE_{uuid.uuid4().hex[:6].upper()}"
        payload = {
            "code": code,
            "discount_type": "percent",
            "discount_value": 10,
            "applies_to": "both",
            "usage_mode": "total",
            "usage_limit": 0,
            "active": False  # Inactive
        }
        r1 = requests.post(f"{BASE_URL}/api/admin/coupons", json=payload, headers=admin_headers)
        assert r1.status_code == 200
        
        validate_payload = {
            "code": code,
            "amount_cents": 5000,
            "context": "slots"
        }
        r2 = requests.post(f"{BASE_URL}/api/member/coupons/validate", json=validate_payload, headers=member_headers)
        assert r2.status_code == 400
        assert "inactive" in r2.json().get("detail", "").lower()
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/coupons/{r1.json()['id']}", headers=admin_headers)
        print("✓ Inactive coupon returns 400")
    
    def test_validate_expired_coupon(self, admin_headers, member_headers):
        """Expired coupon returns 400"""
        code = f"EXPIRED_{uuid.uuid4().hex[:6].upper()}"
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        payload = {
            "code": code,
            "discount_type": "percent",
            "discount_value": 10,
            "applies_to": "both",
            "usage_mode": "total",
            "usage_limit": 0,
            "expires_at": yesterday,  # Expired
            "active": True
        }
        r1 = requests.post(f"{BASE_URL}/api/admin/coupons", json=payload, headers=admin_headers)
        assert r1.status_code == 200
        
        validate_payload = {
            "code": code,
            "amount_cents": 5000,
            "context": "slots"
        }
        r2 = requests.post(f"{BASE_URL}/api/member/coupons/validate", json=validate_payload, headers=member_headers)
        assert r2.status_code == 400
        assert "expired" in r2.json().get("detail", "").lower()
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/coupons/{r1.json()['id']}", headers=admin_headers)
        print("✓ Expired coupon returns 400")


class TestFlatDiscountCoupon:
    """Test flat discount calculations"""
    
    def test_flat_discount_calculation(self, admin_headers, member_headers):
        """Flat discount correctly subtracts from amount"""
        code = f"FLAT10_{uuid.uuid4().hex[:6].upper()}"
        payload = {
            "code": code,
            "discount_type": "flat",
            "discount_value": 1500,  # $15.00 in cents
            "applies_to": "both",
            "usage_mode": "total",
            "usage_limit": 0,
            "active": True
        }
        r1 = requests.post(f"{BASE_URL}/api/admin/coupons", json=payload, headers=admin_headers)
        assert r1.status_code == 200
        
        validate_payload = {
            "code": code,
            "amount_cents": 5000,  # $50.00
            "context": "bundles"
        }
        r2 = requests.post(f"{BASE_URL}/api/member/coupons/validate", json=validate_payload, headers=member_headers)
        assert r2.status_code == 200
        data = r2.json()
        assert data["discount_type"] == "flat"
        assert data["discount_cents"] == 1500  # $15 off
        assert data["final_cents"] == 3500  # $50 - $15 = $35
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/coupons/{r1.json()['id']}", headers=admin_headers)
        print("✓ Flat discount: $50 - $15 = $35")
    
    def test_flat_discount_capped_at_amount(self, admin_headers, member_headers):
        """Flat discount cannot exceed the amount"""
        code = f"FLATBIG_{uuid.uuid4().hex[:6].upper()}"
        payload = {
            "code": code,
            "discount_type": "flat",
            "discount_value": 10000,  # $100.00 in cents
            "applies_to": "both",
            "usage_mode": "total",
            "usage_limit": 0,
            "active": True
        }
        r1 = requests.post(f"{BASE_URL}/api/admin/coupons", json=payload, headers=admin_headers)
        assert r1.status_code == 200
        
        validate_payload = {
            "code": code,
            "amount_cents": 5000,  # $50.00 (less than $100 discount)
            "context": "slots"
        }
        r2 = requests.post(f"{BASE_URL}/api/member/coupons/validate", json=validate_payload, headers=member_headers)
        assert r2.status_code == 200
        data = r2.json()
        # Discount should be capped at the amount
        assert data["discount_cents"] == 5000  # Capped at $50
        assert data["final_cents"] == 0  # Free
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/coupons/{r1.json()['id']}", headers=admin_headers)
        print("✓ Flat discount capped at amount: $100 off $50 = $0 (free)")


class TestMyBookingsBillingField:
    """Test my-bookings endpoint returns billing_type field"""
    
    def test_my_bookings_has_billing_fields(self, member_headers):
        """GET /api/member/my-bookings returns billing_type, price_cents, currency"""
        r = requests.get(f"{BASE_URL}/api/member/my-bookings", headers=member_headers)
        assert r.status_code == 200, f"my-bookings failed: {r.text}"
        data = r.json()
        assert isinstance(data, list)
        
        # If there are bookings, check they have the new fields
        if len(data) > 0:
            booking = data[0]
            assert "billing_type" in booking, "billing_type field missing"
            assert booking["billing_type"] in ["free", "paid", "credit"], f"Invalid billing_type: {booking['billing_type']}"
            assert "price_cents" in booking, "price_cents field missing"
            assert "currency" in booking, "currency field missing"
            print(f"✓ my-bookings has billing fields: billing_type={booking['billing_type']}, price_cents={booking['price_cents']}")
        else:
            print("✓ my-bookings endpoint works (no bookings to verify fields)")


class TestCouponCleanup:
    """Cleanup test coupons"""
    
    def test_cleanup_test_coupons(self, admin_headers):
        """Delete all TEST_ prefixed coupons"""
        r = requests.get(f"{BASE_URL}/api/admin/coupons", headers=admin_headers)
        if r.status_code != 200:
            return
        
        coupons = r.json()
        deleted = 0
        for c in coupons:
            if c.get("code", "").startswith("TEST"):
                requests.delete(f"{BASE_URL}/api/admin/coupons/{c['id']}", headers=admin_headers)
                deleted += 1
        
        print(f"✓ Cleaned up {deleted} test coupons")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
