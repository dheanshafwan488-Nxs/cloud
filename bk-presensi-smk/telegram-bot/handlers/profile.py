from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes
from handlers.keyboards import get_main_menu_keyboard


async def profile_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    if not user:
        return

    name = user.full_name or user.first_name or "Bapak/Ibu"
    msg = (
        f"👤 *Profil Pengguna Layanan*\n"
        f"• *Nama Akun:* {name}\n\n"
        "ℹ️ *Status Akses: Terbuka untuk Semua Siswa*\n"
        "Sistem ini tidak membatasi akses pada murid tertentu. Anda dapat langsung mencari, memilih kelas, dan mengecek data presensi serta catatan BK siswa siapa saja secara bebas dan mudah.\n\n"
        "Silakan gunakan tombol menu di bawah untuk mulai mencari data siswa:"
    )
    await update.message.reply_text(msg, parse_mode="Markdown", reply_markup=get_main_menu_keyboard())
