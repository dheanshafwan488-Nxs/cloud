from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes
from handlers.student_lookup import (
    run_student_search,
    absensi_menu_handler,
    riwayat_menu_handler,
)

STATUS_ICONS = {
    "Hadir": "🟢",
    "Sakit": "🟡",
    "Izin": "🔵",
    "Alpa": "🔴",
}


async def masuk_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    args = context.args or []
    if args:
        await run_student_search(update, context, " ".join(args), mode="overview")
        return

    await absensi_menu_handler(update, context)


async def absen_history_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    args = context.args or []
    if args:
        await run_student_search(update, context, " ".join(args), mode="history")
        return

    await riwayat_menu_handler(update, context)
