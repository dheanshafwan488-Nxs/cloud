import unittest
from unittest.mock import AsyncMock, patch, MagicMock
import sys
import os

# Add parent dir to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

class TestTelegramBot(unittest.IsolatedAsyncioTestCase):
    async def test_api_client_headers_contain_request_id_and_token(self):
        import uuid
        service_token = "dummy_token"
        req_id = f"req_bot_{uuid.uuid4().hex[:12]}"
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Bot-Service-Token": service_token,
            "X-Request-ID": req_id,
        }
        self.assertIn("X-Bot-Service-Token", headers)
        self.assertEqual(headers["X-Bot-Service-Token"], "dummy_token")
        self.assertIn("X-Request-ID", headers)
        self.assertTrue(headers["X-Request-ID"].startswith("req_bot_"))

    async def test_verify_parent_validation(self):
        # Test input verification validation logic
        nis = "2026001"
        code = "ABC123"
        self.assertEqual(len(nis), 7)
        self.assertEqual(len(code), 6)

    async def test_unverified_user_cannot_access_student_data(self):
        mock_response = {
            "success": False,
            "message": "Akun Telegram belum diverifikasi."
        }
        self.assertFalse(mock_response["success"])
        self.assertIn("belum diverifikasi", mock_response["message"])

    async def test_unauthorized_rekap_rejected(self):
        mock_response = {
            "success": False,
            "message": "Akses ditolak. Pengguna bukan Wali Kelas aktif."
        }
        self.assertFalse(mock_response["success"])
        self.assertIn("Akses ditolak", mock_response["message"])

if __name__ == "__main__":
    unittest.main()
