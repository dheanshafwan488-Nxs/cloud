from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes
from handlers.student_lookup import run_student_search, bk_menu_handler


async def kasus_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    args = context.args or []
    if args:
        await run_student_search(update, context, " ".join(args), mode="cases")
        return

    await bk_menu_handler(update, context)
