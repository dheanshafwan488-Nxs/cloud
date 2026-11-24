from __future__ import annotations

import logging
from api_client import api_client

logger = logging.getLogger(__name__)

class TelegramApiService:
    @staticmethod
    async def register_interaction(telegram_id: int, parent_name: str | None = None, username: str | None = None) -> dict:
        try:
            return await api_client.post("/api/v1/telegram-bot/register-interaction", {
                "telegram_id": telegram_id,
                "parent_name": parent_name,
                "username": username,
            })
        except Exception as e:
            logger.warning("Gagal mencatat interaksi telegram user: %s", e)
            return {"success": False, "message": str(e)}

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
    async def search_students(query: str) -> dict:
        return await api_client.get("/api/v1/telegram-bot/students/search", params={"q": query})

    @staticmethod
    async def get_classes() -> dict:
        return await api_client.get("/api/v1/telegram-bot/classes")

    @staticmethod
    async def get_class_students(class_id: int, page: int = 1, per_page: int = 10) -> dict:
        return await api_client.get(
            f"/api/v1/telegram-bot/classes/{class_id}/students",
            params={"page": page, "per_page": per_page},
        )

    @staticmethod
    async def get_student_overview(student_id: int) -> dict:
        return await api_client.get(f"/api/v1/telegram-bot/students/{student_id}/overview")

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
