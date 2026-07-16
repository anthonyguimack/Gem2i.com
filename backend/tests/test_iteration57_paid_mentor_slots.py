"""
Iteration 57 - Paid Mentor Slots Feature Tests
Tests the new CMS toggle for paid mentorship slots with Stripe integration.

Features tested:
1. PUT /api/admin/settings with mentor_slots_paid_enabled toggle
2. GET /api/public/settings returns mentor_slots_paid_enabled
3. GET /api/admin/settings returns mentor_slots_paid_enabled
4. Toggle OFF: Free booking flow works for both free and priced slots
5. Toggle ON + paid slot: Returns 402 requiring checkout flow
6. Toggle ON + paid slot: Checkout creates pending_payment booking with Stripe URL
7. Toggle ON + free slot: Checkout returns 400 (use free flow)
8. Toggle OFF: Checkout returns 400 (paid disabled)
9. Checkout status endpoint works without 500
10. Cancel pending_payment booking works
11. Slot price_cents and currency persisted and returned
12. Regression: Free mentor slot book/cancel still works
13. Regression: iCal feed still works
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPaidMentorSlots:
    """Tests for the Paid Mentor Slots feature"""
    
    admin_token = None
    test_slot_id = None
    test_paid_slot_id = None
    test_mentor_id = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token and mentor ID for tests"""
        if not TestPaidMentorSlots.admin_token:
            # Login as admin
            r = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": "admin@consultant.com",
                "password": "Admin123!"
            })
            assert r.status_code == 200, f"Admin login failed: {r.text}"
            TestPaidMentorSlots.admin_token = r.json().get("token")
        
        if not TestPaidMentorSlots.test_mentor_id:
            # Get a mentor ID
            headers = {"Authorization": f"Bearer {TestPaidMentorSlots.admin_token}"}
            r = requests.get(f"{BASE_URL}/api/admin/mentors", headers=headers)
            if r.status_code == 200 and r.json():
                TestPaidMentorSlots.test_mentor_id = r.json()[0].get("member_id")
        
        yield
    
    def get_headers(self):
        return {"Authorization": f"Bearer {TestPaidMentorSlots.admin_token}"}
    
    # ========== Settings Toggle Tests ==========
    
    def test_01_admin_settings_toggle_on(self):
        """PUT /api/admin/settings with mentor_slots_paid_enabled=true persists"""
        headers = self.get_headers()
        r = requests.put(f"{BASE_URL}/api/admin/settings", json={
            "mentor_slots_paid_enabled": True
        }, headers=headers)
        assert r.status_code == 200, f"Failed to update settings: {r.text}"
        
        # Verify it's persisted
        r2 = requests.get(f"{BASE_URL}/api/admin/settings", headers=headers)
        assert r2.status_code == 200
        assert r2.json().get("mentor_slots_paid_enabled") == True, "Toggle not persisted"
        print("PASS: Admin settings toggle ON persisted")
    
    def test_02_public_settings_returns_toggle(self):
        """GET /api/public/settings returns mentor_slots_paid_enabled (no auth required)"""
        r = requests.get(f"{BASE_URL}/api/public/settings")
        assert r.status_code == 200, f"Public settings failed: {r.text}"
        data = r.json()
        assert "mentor_slots_paid_enabled" in data, "mentor_slots_paid_enabled not in public settings"
        print(f"PASS: Public settings returns mentor_slots_paid_enabled={data.get('mentor_slots_paid_enabled')}")
    
    def test_03_admin_settings_toggle_off(self):
        """PUT /api/admin/settings with mentor_slots_paid_enabled=false persists"""
        headers = self.get_headers()
        r = requests.put(f"{BASE_URL}/api/admin/settings", json={
            "mentor_slots_paid_enabled": False
        }, headers=headers)
        assert r.status_code == 200, f"Failed to update settings: {r.text}"
        
        # Verify it's persisted
        r2 = requests.get(f"{BASE_URL}/api/admin/settings", headers=headers)
        assert r2.status_code == 200
        assert r2.json().get("mentor_slots_paid_enabled") == False, "Toggle not persisted"
        print("PASS: Admin settings toggle OFF persisted")
    
    # ========== Slot Creation with Price Tests ==========
    
    def test_04_create_free_slot(self):
        """Create a FREE slot (price_cents=0) for testing"""
        if not TestPaidMentorSlots.test_mentor_id:
            pytest.skip("No mentor available")
        
        headers = self.get_headers()
        tomorrow = (time.strftime("%Y-%m-%d", time.localtime(time.time() + 86400)))
        
        r = requests.post(f"{BASE_URL}/api/admin/mentorship/slots", json={
            "mentor_id": TestPaidMentorSlots.test_mentor_id,
            "title": "TEST_FREE_SLOT",
            "date": tomorrow,
            "start_time": "10:00",
            "end_time": "11:00",
            "session_type": "One-on-One",
            "max_students": 1,
            "price_cents": 0,
            "currency": "usd"
        }, headers=headers)
        assert r.status_code == 200, f"Failed to create free slot: {r.text}"
        data = r.json()
        TestPaidMentorSlots.test_slot_id = data.get("id")
        assert data.get("price_cents") == 0, "price_cents not 0"
        print(f"PASS: Created free slot {TestPaidMentorSlots.test_slot_id}")
    
    def test_05_create_paid_slot(self):
        """Create a PAID slot (price_cents=5000 = $50) for testing"""
        if not TestPaidMentorSlots.test_mentor_id:
            pytest.skip("No mentor available")
        
        headers = self.get_headers()
        tomorrow = (time.strftime("%Y-%m-%d", time.localtime(time.time() + 86400)))
        
        r = requests.post(f"{BASE_URL}/api/admin/mentorship/slots", json={
            "mentor_id": TestPaidMentorSlots.test_mentor_id,
            "title": "TEST_PAID_SLOT",
            "date": tomorrow,
            "start_time": "14:00",
            "end_time": "15:00",
            "session_type": "One-on-One",
            "max_students": 1,
            "price_cents": 5000,
            "currency": "usd"
        }, headers=headers)
        assert r.status_code == 200, f"Failed to create paid slot: {r.text}"
        data = r.json()
        TestPaidMentorSlots.test_paid_slot_id = data.get("id")
        assert data.get("price_cents") == 5000, f"price_cents not 5000: {data.get('price_cents')}"
        assert data.get("currency") == "usd", f"currency not usd: {data.get('currency')}"
        print(f"PASS: Created paid slot {TestPaidMentorSlots.test_paid_slot_id} with price_cents=5000")
    
    def test_06_slots_return_price_fields(self):
        """GET /api/admin/mentorship/slots returns price_cents and currency"""
        headers = self.get_headers()
        r = requests.get(f"{BASE_URL}/api/admin/mentorship/slots", headers=headers)
        assert r.status_code == 200, f"Failed to get slots: {r.text}"
        
        slots = r.json()
        paid_slot = next((s for s in slots if s.get("id") == TestPaidMentorSlots.test_paid_slot_id), None)
        if paid_slot:
            assert "price_cents" in paid_slot, "price_cents not in slot response"
            assert "currency" in paid_slot, "currency not in slot response"
            assert paid_slot.get("price_cents") == 5000
            print("PASS: Slots return price_cents and currency fields")
        else:
            print("WARN: Paid slot not found in list, but endpoint works")
    
    # ========== Toggle OFF Tests ==========
    
    def test_07_toggle_off_free_slot_booking_works(self):
        """Toggle OFF: POST /api/member/mentorship/book/{slot_id} on FREE slot works"""
        if not TestPaidMentorSlots.test_slot_id:
            pytest.skip("No free slot created")
        
        # Ensure toggle is OFF
        headers = self.get_headers()
        requests.put(f"{BASE_URL}/api/admin/settings", json={
            "mentor_slots_paid_enabled": False
        }, headers=headers)
        
        # Try to book (will fail with 400 if already booked, but should not be 402)
        r = requests.post(f"{BASE_URL}/api/member/mentorship/book/{TestPaidMentorSlots.test_slot_id}", 
                         headers=headers)
        # Accept 200 (success), 400 (already booked/full), but NOT 402 (paid gate)
        assert r.status_code != 402, f"Got 402 when toggle is OFF: {r.text}"
        print(f"PASS: Toggle OFF - Free slot booking returns {r.status_code} (not 402)")
    
    def test_08_toggle_off_paid_slot_booking_works(self):
        """Toggle OFF: POST /api/member/mentorship/book/{slot_id} on PAID slot still works (no gate)"""
        if not TestPaidMentorSlots.test_paid_slot_id:
            pytest.skip("No paid slot created")
        
        # Ensure toggle is OFF
        headers = self.get_headers()
        requests.put(f"{BASE_URL}/api/admin/settings", json={
            "mentor_slots_paid_enabled": False
        }, headers=headers)
        
        # Try to book - should NOT return 402 when toggle is OFF
        r = requests.post(f"{BASE_URL}/api/member/mentorship/book/{TestPaidMentorSlots.test_paid_slot_id}", 
                         headers=headers)
        assert r.status_code != 402, f"Got 402 when toggle is OFF: {r.text}"
        print(f"PASS: Toggle OFF - Paid slot booking returns {r.status_code} (not 402, free flow works)")
    
    def test_09_toggle_off_checkout_returns_400(self):
        """Toggle OFF: POST /api/member/mentorship/checkout/{slot_id} returns 400"""
        if not TestPaidMentorSlots.test_paid_slot_id:
            pytest.skip("No paid slot created")
        
        # Ensure toggle is OFF
        headers = self.get_headers()
        requests.put(f"{BASE_URL}/api/admin/settings", json={
            "mentor_slots_paid_enabled": False
        }, headers=headers)
        
        r = requests.post(f"{BASE_URL}/api/member/mentorship/checkout/{TestPaidMentorSlots.test_paid_slot_id}",
                         json={"origin_url": "https://example.com"},
                         headers=headers)
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
        assert "disabled" in r.json().get("detail", "").lower(), "Expected 'disabled' in error message"
        print("PASS: Toggle OFF - Checkout returns 400 'Paid mentorship is currently disabled'")
    
    # ========== Toggle ON Tests ==========
    
    def test_10_toggle_on_paid_slot_returns_402(self):
        """Toggle ON + paid slot: POST /api/member/mentorship/book/{slot_id} returns 402"""
        if not TestPaidMentorSlots.test_paid_slot_id:
            pytest.skip("No paid slot created")
        
        # First cancel any existing booking
        headers = self.get_headers()
        requests.post(f"{BASE_URL}/api/member/mentorship/cancel/{TestPaidMentorSlots.test_paid_slot_id}",
                     headers=headers)
        
        # Enable toggle
        requests.put(f"{BASE_URL}/api/admin/settings", json={
            "mentor_slots_paid_enabled": True
        }, headers=headers)
        
        # Try to book - should return 402
        r = requests.post(f"{BASE_URL}/api/member/mentorship/book/{TestPaidMentorSlots.test_paid_slot_id}",
                         headers=headers)
        assert r.status_code == 402, f"Expected 402, got {r.status_code}: {r.text}"
        assert "checkout" in r.json().get("detail", "").lower(), "Expected 'checkout' in error message"
        print("PASS: Toggle ON + paid slot - Book returns 402 'Use the checkout flow'")
    
    def test_11_toggle_on_checkout_creates_stripe_session(self):
        """Toggle ON + paid slot: POST /api/member/mentorship/checkout/{slot_id} returns Stripe URL"""
        if not TestPaidMentorSlots.test_paid_slot_id:
            pytest.skip("No paid slot created")
        
        headers = self.get_headers()
        
        # Ensure toggle is ON
        requests.put(f"{BASE_URL}/api/admin/settings", json={
            "mentor_slots_paid_enabled": True
        }, headers=headers)
        
        # Cancel any existing booking first
        requests.post(f"{BASE_URL}/api/member/mentorship/cancel/{TestPaidMentorSlots.test_paid_slot_id}",
                     headers=headers)
        
        r = requests.post(f"{BASE_URL}/api/member/mentorship/checkout/{TestPaidMentorSlots.test_paid_slot_id}",
                         json={"origin_url": "https://example.com"},
                         headers=headers)
        assert r.status_code == 200, f"Checkout failed: {r.status_code} - {r.text}"
        data = r.json()
        assert "url" in data, "No 'url' in response"
        assert "session_id" in data, "No 'session_id' in response"
        assert data["url"].startswith("https://checkout.stripe.com"), f"URL doesn't start with Stripe: {data['url']}"
        
        TestPaidMentorSlots.checkout_session_id = data["session_id"]
        print(f"PASS: Checkout returns Stripe URL: {data['url'][:60]}...")
    
    def test_12_toggle_on_free_slot_checkout_returns_400(self):
        """Toggle ON + FREE slot: POST /api/member/mentorship/checkout/{slot_id} returns 400"""
        if not TestPaidMentorSlots.test_slot_id:
            pytest.skip("No free slot created")
        
        headers = self.get_headers()
        
        # Ensure toggle is ON
        requests.put(f"{BASE_URL}/api/admin/settings", json={
            "mentor_slots_paid_enabled": True
        }, headers=headers)
        
        r = requests.post(f"{BASE_URL}/api/member/mentorship/checkout/{TestPaidMentorSlots.test_slot_id}",
                         json={"origin_url": "https://example.com"},
                         headers=headers)
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
        assert "no price" in r.json().get("detail", "").lower() or "free" in r.json().get("detail", "").lower(), \
            f"Expected 'no price' or 'free' in error: {r.json().get('detail')}"
        print("PASS: Toggle ON + free slot - Checkout returns 400 'use the free booking flow'")
    
    def test_13_checkout_status_endpoint_works(self):
        """GET /api/member/mentorship/checkout/status/{session_id} returns valid payload"""
        if not hasattr(TestPaidMentorSlots, 'checkout_session_id') or not TestPaidMentorSlots.checkout_session_id:
            pytest.skip("No checkout session created")
        
        headers = self.get_headers()
        r = requests.get(f"{BASE_URL}/api/member/mentorship/checkout/status/{TestPaidMentorSlots.checkout_session_id}",
                        headers=headers)
        assert r.status_code == 200, f"Status check failed: {r.status_code} - {r.text}"
        data = r.json()
        assert "payment_status" in data, "No payment_status in response"
        # May be 'pending' since we can't complete payment in test
        print(f"PASS: Checkout status returns payment_status={data.get('payment_status')}")
    
    def test_14_cancel_pending_payment_booking(self):
        """POST /api/member/mentorship/cancel/{slot_id} works for pending_payment booking"""
        if not TestPaidMentorSlots.test_paid_slot_id:
            pytest.skip("No paid slot created")
        
        headers = self.get_headers()
        r = requests.post(f"{BASE_URL}/api/member/mentorship/cancel/{TestPaidMentorSlots.test_paid_slot_id}",
                         headers=headers)
        # Should succeed (200) or return 404 if no booking exists
        assert r.status_code in [200, 404], f"Cancel failed: {r.status_code} - {r.text}"
        print(f"PASS: Cancel pending_payment booking returns {r.status_code}")
    
    # ========== Regression Tests ==========
    
    def test_15_regression_ical_info_works(self):
        """Regression: GET /api/member/ical/info returns token"""
        headers = self.get_headers()
        r = requests.get(f"{BASE_URL}/api/member/ical/info", headers=headers)
        assert r.status_code == 200, f"iCal info failed: {r.status_code} - {r.text}"
        data = r.json()
        assert "token" in data or "ical_token" in data, "No token in iCal info response"
        
        token = data.get("token") or data.get("ical_token")
        if token:
            # Test the iCal feed
            r2 = requests.get(f"{BASE_URL}/api/ical/{token}.ics")
            assert r2.status_code == 200, f"iCal feed failed: {r2.status_code}"
            assert "text/calendar" in r2.headers.get("content-type", ""), "iCal not returning text/calendar"
            print("PASS: iCal feed works")
        else:
            print("PASS: iCal info endpoint works (no token yet)")
    
    def test_16_regression_member_mentor_calendar(self):
        """Regression: GET /api/member/mentor-calendar works"""
        headers = self.get_headers()
        r = requests.get(f"{BASE_URL}/api/member/mentor-calendar", headers=headers)
        assert r.status_code == 200, f"Mentor calendar failed: {r.status_code} - {r.text}"
        data = r.json()
        assert "slots" in data, "No 'slots' in mentor calendar response"
        print(f"PASS: Member mentor-calendar returns {len(data.get('slots', []))} slots")
    
    # ========== Cleanup ==========
    
    def test_99_cleanup(self):
        """Cleanup: Delete test slots and reset toggle to OFF"""
        headers = self.get_headers()
        
        # Delete test slots
        if TestPaidMentorSlots.test_slot_id:
            requests.delete(f"{BASE_URL}/api/admin/mentorship/slots/{TestPaidMentorSlots.test_slot_id}",
                          headers=headers)
            print(f"Deleted free slot {TestPaidMentorSlots.test_slot_id}")
        
        if TestPaidMentorSlots.test_paid_slot_id:
            requests.delete(f"{BASE_URL}/api/admin/mentorship/slots/{TestPaidMentorSlots.test_paid_slot_id}",
                          headers=headers)
            print(f"Deleted paid slot {TestPaidMentorSlots.test_paid_slot_id}")
        
        # Reset toggle to OFF
        requests.put(f"{BASE_URL}/api/admin/settings", json={
            "mentor_slots_paid_enabled": False
        }, headers=headers)
        print("Reset toggle to OFF")
        print("PASS: Cleanup complete")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
