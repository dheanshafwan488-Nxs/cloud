import uuid
import logging
import httpx
from config import LARAVEL_API_BASE_URL, BOT_SERVICE_TOKEN, API_TIMEOUT

logger = logging.getLogger(__name__)

class LaravelApiClient:
    def __init__(self, base_url: str = LARAVEL_API_BASE_URL, service_token: str = BOT_SERVICE_TOKEN):
        self.base_url = base_url.rstrip("/")
        self.service_token = service_token

    def _headers(self, request_id: str | None = None) -> dict:
        req_id = request_id or f"req_bot_{uuid.uuid4().hex[:12]}"
        return {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-Bot-Service-Token": self.service_token,
            "X-Request-ID": req_id,
        }

    async def get(self, endpoint: str, params: dict | None = None) -> dict:
        url = f"{self.base_url}{endpoint}"
        async with httpx.AsyncClient(timeout=API_TIMEOUT) as client:
            try:
                response = await client.get(url, params=params, headers=self._headers())
                return response.json()
            except httpx.HTTPError as exc:
                logger.error(f"HTTP GET Error on {endpoint}: {exc}")
                return {"success": False, "message": "Gagal terhubung ke server sekolah."}

    async def post(self, endpoint: str, json_data: dict | None = None) -> dict:
        url = f"{self.base_url}{endpoint}"
        async with httpx.AsyncClient(timeout=API_TIMEOUT) as client:
            try:
                response = await client.post(url, json=json_data or {}, headers=self._headers())
                return response.json()
            except httpx.HTTPError as exc:
                logger.error(f"HTTP POST Error on {endpoint}: {exc}")
                return {"success": False, "message": "Gagal terhubung ke server sekolah."}

# Global singleton client
api_client = LaravelApiClient()
