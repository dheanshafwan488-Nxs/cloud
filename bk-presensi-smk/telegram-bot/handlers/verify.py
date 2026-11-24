from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes
from handlers.keyboards import get_main_menu_keyboard
from handlers.student_lookup import run_student_search


async def verify_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    message = update.effective_message
    if not message:
        return

    args = context.args or []
    if args:
        # If user supplied a NIS or name, directly perform search for that student
        await run_student_search(update, context, args[0], mode="overview")
        return

    await message.reply_text(
        "ℹ️ *Verifikasi Akun Tidak Lagi Diperlukan*\n\n"
        "Sistem telah dibuka untuk seluruh orang tua / wali. "
        "Bapak/Ibu dapat langsung mengecek absensi dan catatan BK siswa siapa saja tanpa perlu memasukkan kode verifikasi.\n\n"
        "Silakan ketik langsung *Nama Siswa* / *NIS* di chat atau gunakan tombol menu *🔍 Cari Siswa* di bawah:",
        parse_mode="Markdown",
        reply_markup=get_main_menu_keyboard(),
    )


async def unverify_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    message = update.effective_message
    if not message:
        return

    await message.reply_text(
        "ℹ️ Akses sistem saat ini terbuka untuk seluruh siswa tanpa keterikatan akun atau batasan verifikasi.",
        parse_mode="Markdown",
        reply_markup=get_main_menu_keyboard(),
    )
