from telegram import Update
from telegram.ext import ContextTypes
from services.api_service import TelegramApiService

async def profile_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    if not user:
        return

    resp = await TelegramApiService.get_parent_profile(telegram_id=user.id)

    if not resp.get("success"):
        await update.message.reply_text(
            "⚠️ *Akun Belum Terverifikasi*\n\n"
            "Anda belum menghubungkan akun Telegram dengan siswa manapun.\n"
            "Gunakan `/verifikasi <NIS> <KODE>` untuk menghubungkan data anak Anda.",
            parse_mode="Markdown"
        )
        return

    data = resp.get("data", {})
    parent_name = data.get("parent_name", user.full_name)
    students = data.get("students", [])

    msg = f"👤 *Profil Wali Murid Terverifikasi*\n"
    msg += f"Nama Wali: *{parent_name}*\n"
    msg += f"ID Telegram: `{user.id}`\n\n"
    msg += f"🎓 *Daftar Siswa Terhubung ({len(students)}):*\n"

    for i, s in enumerate(students, 1):
        msg += (
            f"\n{i}. *{s.get('name')}*\n"
            f"   • NIS: `{s.get('nis')}`\n"
            f"   • Kelas: {s.get('class_name', '-')}\n"
            f"   • Status: {s.get('enrollment_status', 'aktif')}\n"
        )

    await update.message.reply_text(msg, parse_mode="Markdown")
