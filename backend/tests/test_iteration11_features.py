"""
Test Iteration 11 Features:
1. Date filtering for hero slides (public endpoint filters by date_start/date_end)
2. Admin endpoint returns ALL slides (no date filtering)
3. Expired slides (date_end in past) excluded from public
4. Slides with no dates always visible
"""
import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@consultant.com"
ADMIN_PASSWORD = "Admin123!"

@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    data = response.json()
    assert "token" in data, "No token in login response"
    return data["token"]

@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers with admin auth token"""
    return {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }


class TestDateFilteringPublicEndpoint:
    """Test that public endpoint filters slides by date range"""
    
    expired_slide_id = None
    active_slide_id = None
    future_slide_id = None
    no_dates_slide_id = None
    
    def test_01_create_expired_slide(self, admin_headers):
        """Create a slide with date_end in the past (should NOT appear in public)"""
        yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        two_days_ago = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
        
        slide_data = {
            "title": "TEST_EXPIRED Slide",
            "subtitle": "This slide has expired",
            "date_start": two_days_ago,
            "date_end": yesterday,
            "slide_type": "photo"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/hero-slides", json=slide_data, headers=admin_headers)
        assert response.status_code == 200, f"Failed to create expired slide: {response.text}"
        
        data = response.json()
        TestDateFilteringPublicEndpoint.expired_slide_id = data["id"]
        print(f"Created expired slide: {data['id']}")
    
    def test_02_create_active_slide(self, admin_headers):
        """Create a slide with current date in range (should appear in public)"""
        yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        
        slide_data = {
            "title": "TEST_ACTIVE Slide",
            "subtitle": "This slide is currently active",
            "date_start": yesterday,
            "date_end": tomorrow,
            "slide_type": "photo"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/hero-slides", json=slide_data, headers=admin_headers)
        assert response.status_code == 200, f"Failed to create active slide: {response.text}"
        
        data = response.json()
        TestDateFilteringPublicEndpoint.active_slide_id = data["id"]
        print(f"Created active slide: {data['id']}")
    
    def test_03_create_future_slide(self, admin_headers):
        """Create a slide with date_start in the future (should NOT appear in public)"""
        tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        next_week = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
        
        slide_data = {
            "title": "TEST_FUTURE Slide",
            "subtitle": "This slide starts in the future",
            "date_start": tomorrow,
            "date_end": next_week,
            "slide_type": "photo"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/hero-slides", json=slide_data, headers=admin_headers)
        assert response.status_code == 200, f"Failed to create future slide: {response.text}"
        
        data = response.json()
        TestDateFilteringPublicEndpoint.future_slide_id = data["id"]
        print(f"Created future slide: {data['id']}")
    
    def test_04_create_no_dates_slide(self, admin_headers):
        """Create a slide with no dates (should ALWAYS appear in public)"""
        slide_data = {
            "title": "TEST_NO_DATES Slide",
            "subtitle": "This slide has no date restrictions",
            "date_start": "",
            "date_end": "",
            "slide_type": "photo"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/hero-slides", json=slide_data, headers=admin_headers)
        assert response.status_code == 200, f"Failed to create no-dates slide: {response.text}"
        
        data = response.json()
        TestDateFilteringPublicEndpoint.no_dates_slide_id = data["id"]
        print(f"Created no-dates slide: {data['id']}")
    
    def test_05_admin_returns_all_slides(self, admin_headers):
        """Admin endpoint should return ALL slides regardless of dates"""
        response = requests.get(f"{BASE_URL}/api/admin/hero-slides", headers=admin_headers)
        assert response.status_code == 200, f"Failed to get admin slides: {response.text}"
        
        data = response.json()
        slide_ids = [s["id"] for s in data]
        
        # All 4 test slides should be in admin response
        assert TestDateFilteringPublicEndpoint.expired_slide_id in slide_ids, "Expired slide missing from admin"
        assert TestDateFilteringPublicEndpoint.active_slide_id in slide_ids, "Active slide missing from admin"
        assert TestDateFilteringPublicEndpoint.future_slide_id in slide_ids, "Future slide missing from admin"
        assert TestDateFilteringPublicEndpoint.no_dates_slide_id in slide_ids, "No-dates slide missing from admin"
        
        print(f"Admin endpoint returned {len(data)} slides (all test slides present)")
    
    def test_06_public_filters_by_date(self):
        """Public endpoint should only return active and no-dates slides"""
        response = requests.get(f"{BASE_URL}/api/public/hero-slides")
        assert response.status_code == 200, f"Failed to get public slides: {response.text}"
        
        data = response.json()
        slide_ids = [s["id"] for s in data]
        
        # Active slide should be present
        assert TestDateFilteringPublicEndpoint.active_slide_id in slide_ids, "Active slide should appear in public"
        
        # No-dates slide should be present
        assert TestDateFilteringPublicEndpoint.no_dates_slide_id in slide_ids, "No-dates slide should appear in public"
        
        # Expired slide should NOT be present
        assert TestDateFilteringPublicEndpoint.expired_slide_id not in slide_ids, "Expired slide should NOT appear in public"
        
        # Future slide should NOT be present
        assert TestDateFilteringPublicEndpoint.future_slide_id not in slide_ids, "Future slide should NOT appear in public"
        
        print(f"Public endpoint correctly filtered: {len(data)} slides returned")
    
    def test_07_cleanup_test_slides(self, admin_headers):
        """Delete all test slides"""
        for slide_id in [
            TestDateFilteringPublicEndpoint.expired_slide_id,
            TestDateFilteringPublicEndpoint.active_slide_id,
            TestDateFilteringPublicEndpoint.future_slide_id,
            TestDateFilteringPublicEndpoint.no_dates_slide_id
        ]:
            if slide_id:
                response = requests.delete(f"{BASE_URL}/api/admin/hero-slides/{slide_id}", headers=admin_headers)
                assert response.status_code == 200, f"Failed to delete slide {slide_id}"
                print(f"Deleted test slide: {slide_id}")


class TestOnlyStartDateSlide:
    """Test slide with only date_start set (no date_end)"""
    
    slide_id = None
    
    def test_01_create_slide_only_start_date_past(self, admin_headers):
        """Slide with only start date in past should appear in public"""
        yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
        
        slide_data = {
            "title": "TEST_ONLY_START Slide",
            "subtitle": "Only start date set",
            "date_start": yesterday,
            "date_end": "",
            "slide_type": "photo"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/hero-slides", json=slide_data, headers=admin_headers)
        assert response.status_code == 200, f"Failed to create slide: {response.text}"
        
        data = response.json()
        TestOnlyStartDateSlide.slide_id = data["id"]
        print(f"Created only-start-date slide: {data['id']}")
    
    def test_02_public_shows_slide(self):
        """Public endpoint should show slide with past start date and no end date"""
        response = requests.get(f"{BASE_URL}/api/public/hero-slides")
        assert response.status_code == 200
        
        data = response.json()
        slide_ids = [s["id"] for s in data]
        
        assert TestOnlyStartDateSlide.slide_id in slide_ids, "Slide with past start date should appear"
        print("Slide with only start date (past) correctly appears in public")
    
    def test_03_cleanup(self, admin_headers):
        """Delete test slide"""
        if TestOnlyStartDateSlide.slide_id:
            response = requests.delete(f"{BASE_URL}/api/admin/hero-slides/{TestOnlyStartDateSlide.slide_id}", headers=admin_headers)
            assert response.status_code == 200


class TestOnlyEndDateSlide:
    """Test slide with only date_end set (no date_start)"""
    
    slide_id = None
    
    def test_01_create_slide_only_end_date_future(self, admin_headers):
        """Slide with only end date in future should appear in public"""
        tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
        
        slide_data = {
            "title": "TEST_ONLY_END Slide",
            "subtitle": "Only end date set",
            "date_start": "",
            "date_end": tomorrow,
            "slide_type": "photo"
        }
        
        response = requests.post(f"{BASE_URL}/api/admin/hero-slides", json=slide_data, headers=admin_headers)
        assert response.status_code == 200, f"Failed to create slide: {response.text}"
        
        data = response.json()
        TestOnlyEndDateSlide.slide_id = data["id"]
        print(f"Created only-end-date slide: {data['id']}")
    
    def test_02_public_shows_slide(self):
        """Public endpoint should show slide with future end date and no start date"""
        response = requests.get(f"{BASE_URL}/api/public/hero-slides")
        assert response.status_code == 200
        
        data = response.json()
        slide_ids = [s["id"] for s in data]
        
        assert TestOnlyEndDateSlide.slide_id in slide_ids, "Slide with future end date should appear"
        print("Slide with only end date (future) correctly appears in public")
    
    def test_03_cleanup(self, admin_headers):
        """Delete test slide"""
        if TestOnlyEndDateSlide.slide_id:
            response = requests.delete(f"{BASE_URL}/api/admin/hero-slides/{TestOnlyEndDateSlide.slide_id}", headers=admin_headers)
            assert response.status_code == 200


class TestExistingSlides:
    """Test existing slides in database match expected behavior"""
    
    def test_01_check_existing_slides(self, admin_headers):
        """Check existing slides and their date filtering behavior"""
        # Get admin slides
        admin_response = requests.get(f"{BASE_URL}/api/admin/hero-slides", headers=admin_headers)
        assert admin_response.status_code == 200
        admin_slides = admin_response.json()
        
        # Get public slides
        public_response = requests.get(f"{BASE_URL}/api/public/hero-slides")
        assert public_response.status_code == 200
        public_slides = public_response.json()
        
        print(f"\nAdmin sees {len(admin_slides)} slides")
        print(f"Public sees {len(public_slides)} slides")
        
        # Log each slide's date range
        now = datetime.now(timezone.utc).isoformat()
        print(f"\nCurrent UTC time: {now}")
        
        for slide in admin_slides:
            ds = slide.get("date_start", "")
            de = slide.get("date_end", "")
            title = slide.get("title", "")[:30]
            in_public = slide["id"] in [s["id"] for s in public_slides]
            print(f"  Slide '{title}': start={ds}, end={de}, in_public={in_public}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
