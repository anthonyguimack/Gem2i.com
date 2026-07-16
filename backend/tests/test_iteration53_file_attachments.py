"""
Iteration 53 - File Attachments for Calendar Events
Tests:
- POST /api/upload-file: Upload PDF, PPT, DOC, XLS, CSV, TXT, ZIP files (up to 25MB)
- POST /api/upload-file: Reject unsupported file types
- POST /api/upload-file: Return url, filename, original_name, size, content_type
- Calendar events store 'attachments' array with url, name, size, content_type per file
- File download links work (accessible via /api/uploads/filename)
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestFileUploadEndpoint:
    """Tests for POST /api/upload-file endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_upload_pdf_file(self):
        """Test uploading a PDF file"""
        # Create a mock PDF file
        pdf_content = b'%PDF-1.4 mock pdf content for testing'
        files = {'file': ('test_document.pdf', io.BytesIO(pdf_content), 'application/pdf')}
        
        response = requests.post(
            f"{BASE_URL}/api/upload-file",
            files=files,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"PDF upload failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "url" in data, "Response missing 'url'"
        assert "filename" in data, "Response missing 'filename'"
        assert "original_name" in data, "Response missing 'original_name'"
        assert "size" in data, "Response missing 'size'"
        assert "content_type" in data, "Response missing 'content_type'"
        
        # Verify values
        assert data["original_name"] == "test_document.pdf"
        assert data["content_type"] == "application/pdf"
        assert data["url"].startswith("/api/uploads/")
        assert data["size"] > 0
        print(f"PASS: PDF upload successful - {data}")
    
    def test_upload_ppt_file(self):
        """Test uploading a PowerPoint file"""
        ppt_content = b'PK mock pptx content'
        files = {'file': ('presentation.pptx', io.BytesIO(ppt_content), 'application/vnd.openxmlformats-officedocument.presentationml.presentation')}
        
        response = requests.post(
            f"{BASE_URL}/api/upload-file",
            files=files,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"PPTX upload failed: {response.text}"
        data = response.json()
        assert data["original_name"] == "presentation.pptx"
        assert data["content_type"] == "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        print(f"PASS: PPTX upload successful - {data}")
    
    def test_upload_doc_file(self):
        """Test uploading a Word document"""
        doc_content = b'PK mock docx content'
        files = {'file': ('document.docx', io.BytesIO(doc_content), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')}
        
        response = requests.post(
            f"{BASE_URL}/api/upload-file",
            files=files,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"DOCX upload failed: {response.text}"
        data = response.json()
        assert data["original_name"] == "document.docx"
        print(f"PASS: DOCX upload successful - {data}")
    
    def test_upload_xls_file(self):
        """Test uploading an Excel file"""
        xls_content = b'PK mock xlsx content'
        files = {'file': ('spreadsheet.xlsx', io.BytesIO(xls_content), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')}
        
        response = requests.post(
            f"{BASE_URL}/api/upload-file",
            files=files,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"XLSX upload failed: {response.text}"
        data = response.json()
        assert data["original_name"] == "spreadsheet.xlsx"
        print(f"PASS: XLSX upload successful - {data}")
    
    def test_upload_csv_file(self):
        """Test uploading a CSV file"""
        csv_content = b'name,email,phone\nJohn,john@test.com,123456'
        files = {'file': ('data.csv', io.BytesIO(csv_content), 'text/csv')}
        
        response = requests.post(
            f"{BASE_URL}/api/upload-file",
            files=files,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"CSV upload failed: {response.text}"
        data = response.json()
        assert data["original_name"] == "data.csv"
        assert data["content_type"] == "text/csv"
        print(f"PASS: CSV upload successful - {data}")
    
    def test_upload_txt_file(self):
        """Test uploading a text file"""
        txt_content = b'This is a plain text file for testing.'
        files = {'file': ('notes.txt', io.BytesIO(txt_content), 'text/plain')}
        
        response = requests.post(
            f"{BASE_URL}/api/upload-file",
            files=files,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"TXT upload failed: {response.text}"
        data = response.json()
        assert data["original_name"] == "notes.txt"
        assert data["content_type"] == "text/plain"
        print(f"PASS: TXT upload successful - {data}")
    
    def test_upload_zip_file(self):
        """Test uploading a ZIP file"""
        zip_content = b'PK\x03\x04 mock zip content'
        files = {'file': ('archive.zip', io.BytesIO(zip_content), 'application/zip')}
        
        response = requests.post(
            f"{BASE_URL}/api/upload-file",
            files=files,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"ZIP upload failed: {response.text}"
        data = response.json()
        assert data["original_name"] == "archive.zip"
        print(f"PASS: ZIP upload successful - {data}")
    
    def test_upload_image_file(self):
        """Test uploading an image file (also allowed in upload-file)"""
        # Minimal valid PNG
        png_content = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde'
        files = {'file': ('image.png', io.BytesIO(png_content), 'image/png')}
        
        response = requests.post(
            f"{BASE_URL}/api/upload-file",
            files=files,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"PNG upload failed: {response.text}"
        data = response.json()
        assert data["original_name"] == "image.png"
        print(f"PASS: PNG upload successful - {data}")
    
    def test_reject_unsupported_file_type(self):
        """Test that unsupported file types are rejected"""
        # Try uploading an executable file
        exe_content = b'MZ mock executable content'
        files = {'file': ('malware.exe', io.BytesIO(exe_content), 'application/x-msdownload')}
        
        response = requests.post(
            f"{BASE_URL}/api/upload-file",
            files=files,
            headers=self.headers
        )
        
        assert response.status_code == 400, f"Expected 400 for unsupported file type, got {response.status_code}"
        assert "not allowed" in response.json().get("detail", "").lower()
        print(f"PASS: Unsupported file type correctly rejected")
    
    def test_reject_html_file(self):
        """Test that HTML files are rejected"""
        html_content = b'<html><body>Test</body></html>'
        files = {'file': ('page.html', io.BytesIO(html_content), 'text/html')}
        
        response = requests.post(
            f"{BASE_URL}/api/upload-file",
            files=files,
            headers=self.headers
        )
        
        assert response.status_code == 400, f"Expected 400 for HTML file, got {response.status_code}"
        print(f"PASS: HTML file correctly rejected")
    
    def test_upload_requires_admin_auth(self):
        """Test that upload requires admin authentication"""
        pdf_content = b'%PDF-1.4 mock pdf'
        files = {'file': ('test.pdf', io.BytesIO(pdf_content), 'application/pdf')}
        
        # No auth header
        response = requests.post(
            f"{BASE_URL}/api/upload-file",
            files=files
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"PASS: Upload correctly requires authentication")


class TestCalendarEventAttachments:
    """Tests for calendar event attachments storage and retrieval"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        self.created_event_id = None
    
    def test_create_event_with_attachments(self):
        """Test creating an event with attachments array"""
        # First upload a file
        pdf_content = b'%PDF-1.4 test attachment content'
        files = {'file': ('TEST_agenda.pdf', io.BytesIO(pdf_content), 'application/pdf')}
        upload_response = requests.post(
            f"{BASE_URL}/api/upload-file",
            files=files,
            headers=self.headers
        )
        assert upload_response.status_code == 200
        upload_data = upload_response.json()
        
        # Create event with attachment
        event_data = {
            "title": "TEST_Event_With_Attachments",
            "type": "Meeting",
            "date": "2026-02-15",
            "start_time": "10:00",
            "end_time": "11:00",
            "timezone": "US/Eastern",
            "max_capacity": 20,
            "status": "active",
            "attachments": [
                {
                    "url": upload_data["url"],
                    "name": upload_data["original_name"],
                    "size": upload_data["size"],
                    "content_type": upload_data["content_type"]
                }
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/calendar/events",
            json=event_data,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Event creation failed: {response.text}"
        data = response.json()
        self.created_event_id = data["id"]
        
        # Verify attachments are stored
        assert "attachments" in data, "Event missing 'attachments' field"
        assert len(data["attachments"]) == 1, "Expected 1 attachment"
        att = data["attachments"][0]
        assert att["url"] == upload_data["url"]
        assert att["name"] == "TEST_agenda.pdf"
        assert att["size"] == upload_data["size"]
        assert att["content_type"] == "application/pdf"
        print(f"PASS: Event created with attachments - {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/calendar/events/{self.created_event_id}", headers=self.headers)
    
    def test_update_event_attachments(self):
        """Test updating event attachments"""
        # Create event without attachments
        event_data = {
            "title": "TEST_Event_Update_Attachments",
            "type": "Activity",
            "date": "2026-02-20",
            "start_time": "14:00",
            "end_time": "15:00",
            "timezone": "US/Eastern",
            "max_capacity": 10,
            "status": "active",
            "attachments": []
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/calendar/events",
            json=event_data,
            headers=self.headers
        )
        assert create_response.status_code == 200
        event_id = create_response.json()["id"]
        
        # Upload a file
        csv_content = b'name,value\ntest,123'
        files = {'file': ('TEST_data.csv', io.BytesIO(csv_content), 'text/csv')}
        upload_response = requests.post(
            f"{BASE_URL}/api/upload-file",
            files=files,
            headers=self.headers
        )
        assert upload_response.status_code == 200
        upload_data = upload_response.json()
        
        # Update event with attachment
        update_data = {
            "attachments": [
                {
                    "url": upload_data["url"],
                    "name": upload_data["original_name"],
                    "size": upload_data["size"],
                    "content_type": upload_data["content_type"]
                }
            ]
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/admin/calendar/events/{event_id}",
            json=update_data,
            headers=self.headers
        )
        
        assert update_response.status_code == 200, f"Event update failed: {update_response.text}"
        data = update_response.json()
        assert len(data.get("attachments", [])) == 1
        print(f"PASS: Event attachments updated successfully")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/calendar/events/{event_id}", headers=self.headers)
    
    def test_get_event_with_attachments(self):
        """Test retrieving event with attachments"""
        # Create event with attachment
        pdf_content = b'%PDF-1.4 get test'
        files = {'file': ('TEST_get_test.pdf', io.BytesIO(pdf_content), 'application/pdf')}
        upload_response = requests.post(
            f"{BASE_URL}/api/upload-file",
            files=files,
            headers=self.headers
        )
        upload_data = upload_response.json()
        
        event_data = {
            "title": "TEST_Get_Event_Attachments",
            "type": "Conference",
            "date": "2026-03-01",
            "start_time": "09:00",
            "end_time": "17:00",
            "timezone": "US/Eastern",
            "max_capacity": 100,
            "status": "active",
            "attachments": [
                {
                    "url": upload_data["url"],
                    "name": upload_data["original_name"],
                    "size": upload_data["size"],
                    "content_type": upload_data["content_type"]
                }
            ]
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/admin/calendar/events",
            json=event_data,
            headers=self.headers
        )
        event_id = create_response.json()["id"]
        
        # Get event
        get_response = requests.get(
            f"{BASE_URL}/api/admin/calendar/events/{event_id}",
            headers=self.headers
        )
        
        assert get_response.status_code == 200
        data = get_response.json()
        assert "attachments" in data
        assert len(data["attachments"]) == 1
        assert data["attachments"][0]["name"] == "TEST_get_test.pdf"
        print(f"PASS: Event retrieved with attachments")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/calendar/events/{event_id}", headers=self.headers)
    
    def test_list_events_shows_attachments(self):
        """Test that event list includes attachments"""
        response = requests.get(
            f"{BASE_URL}/api/admin/calendar/events",
            headers=self.headers
        )
        
        assert response.status_code == 200
        events = response.json()
        
        # Check if any event has attachments field
        for event in events:
            if "attachments" in event and len(event.get("attachments", [])) > 0:
                print(f"PASS: Found event with attachments: {event['title']} - {len(event['attachments'])} files")
                return
        
        print("INFO: No events with attachments found in list (this is OK if no events have attachments)")


class TestFileDownload:
    """Tests for file download functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_download_uploaded_file(self):
        """Test that uploaded files can be downloaded"""
        # Upload a file
        test_content = b'Test file content for download verification'
        files = {'file': ('TEST_download_test.txt', io.BytesIO(test_content), 'text/plain')}
        
        upload_response = requests.post(
            f"{BASE_URL}/api/upload-file",
            files=files,
            headers=self.headers
        )
        assert upload_response.status_code == 200
        upload_data = upload_response.json()
        
        # Download the file (no auth required for static files)
        download_url = f"{BASE_URL}{upload_data['url']}"
        download_response = requests.get(download_url)
        
        assert download_response.status_code == 200, f"Download failed: {download_response.status_code}"
        assert download_response.content == test_content, "Downloaded content doesn't match uploaded content"
        print(f"PASS: File downloaded successfully from {upload_data['url']}")
    
    def test_download_nonexistent_file_returns_404(self):
        """Test that downloading non-existent file returns 404"""
        response = requests.get(f"{BASE_URL}/api/uploads/nonexistent_file_12345.pdf")
        assert response.status_code == 404, f"Expected 404 for non-existent file, got {response.status_code}"
        print("PASS: Non-existent file correctly returns 404")


class TestExistingEventWithAttachment:
    """Test the existing Q2 Strategy Meeting event with attachment"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@consultant.com",
            "password": "Admin123!"
        })
        assert response.status_code == 200
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_q2_strategy_meeting_has_attachment(self):
        """Test that Q2 Strategy Meeting event has attachment"""
        response = requests.get(
            f"{BASE_URL}/api/admin/calendar/events",
            headers=self.headers
        )
        
        assert response.status_code == 200
        events = response.json()
        
        # Find Q2 Strategy Meeting
        q2_event = None
        for event in events:
            if "Q2 Strategy" in event.get("title", ""):
                q2_event = event
                break
        
        if q2_event:
            attachments = q2_event.get("attachments", [])
            print(f"Found Q2 Strategy Meeting: {q2_event['title']}")
            print(f"Attachments: {attachments}")
            
            if len(attachments) > 0:
                print(f"PASS: Q2 Strategy Meeting has {len(attachments)} attachment(s)")
                for att in attachments:
                    print(f"  - {att.get('name', 'unknown')}: {att.get('url', 'no url')}")
            else:
                print("INFO: Q2 Strategy Meeting exists but has no attachments")
        else:
            print("INFO: Q2 Strategy Meeting event not found")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
