import logging
from api_client import api_client

logger = logging.getLogger(__name__)

class TelegramApiService:
    @staticmethod
    async def verify_parent(telegram_id: int, parent_name: str, nis: str, code: str) -> dict:
        return await api_client.post("/api/v1/telegram-bot/verify", {
            "telegram_id": telegram_id,
            "parent_name": parent_name,
            "nis": nis,
            "code": code,
        })

    @staticmethod
    async def unverify_parent(telegram_id: int) -> dict:
        return await api_client.post("/api/v1/telegram-bot/unverify", {
            "telegram_id": telegram_id,
        })

    @staticmethod
    async def get_parent_profile(telegram_id: int) -> dict:
        return await api_client.get(f"/api/v1/telegram-bot/parent/{telegram_id}/profile")

    @staticmethod
    async def get_today_attendance(telegram_id: int, student_id: int | None = None) -> dict:
        params = {"student_id": student_id} if student_id else None
        return await api_client.get(f"/api/v1/telegram-bot/parent/{telegram_id}/attendance/today", params=params)

    @staticmethod
    async def get_attendance_history(telegram_id: int, student_id: int | None = None) -> dict:
        params = {"student_id": student_id} if student_id else None
        return await api_client.get(f"/api/v1/telegram-bot/parent/{telegram_id}/attendance/history", params=params)

    @staticmethod
    async def get_student_cases(telegram_id: int, student_id: int | None = None) -> dict:
        params = {"student_id": student_id} if student_id else None
        return await api_client.get(f"/api/v1/telegram-bot/parent/{telegram_id}/cases", params=params)

    @staticmethod
    async def get_school_contacts() -> dict:
        return await api_client.get("/api/v1/telegram-bot/contact")

    @staticmethod
    async def get_class_rekap(telegram_id: int, class_id: int | None = None) -> dict:
        params = {"class_id": class_id} if class_id else None
        return await api_client.get(f"/api/v1/telegram-bot/teacher/{telegram_id}/rekap", params=params)
