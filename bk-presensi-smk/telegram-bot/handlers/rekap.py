from telegram import Update
from telegram.ext import ContextTypes
from services.api_service import TelegramApiService

async def rekap_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    if not user:
        return

    resp = await TelegramApiService.get_class_rekap(telegram_id=user.id)

    if not resp.get("success"):
        await update.message.reply_text(
            "🔒 *Akses Ditolak*\n\n"
            "Perintah `/rekap` hanya dapat diakses oleh Guru atau Wali Kelas yang akun Telegram-nya "
            "telah diautentikasi dan ditugaskan secara resmi oleh Admin melalui web dashboard.\n\n"
            "Jika Anda adalah Wali Kelas, silakan hubungi Administrator untuk menghubungkan akun.",
            parse_mode="Markdown"
        )
        return

    data = resp.get("data", {})
    class_name = data.get("class_name", "-")
    total_students = data.get("total_students", 0)
    summary = data.get("attendance_summary", {})

    msg = f"📊 *Rekapitulasi Presensi Kelas {class_name}*\n"
    msg += f"Wali Kelas: *{user.full_name}*\n"
    msg += f"Total Siswa: {total_students} Siswa\n\n"
    msg += f"• 🟢 Hadir: {summary.get('hadir', 0)}\n"
    msg += f"• 🟡 Sakit: {summary.get('sakit', 0)}\n"
    msg += f"• 🔵 Izin: {summary.get('izin', 0)}\n"
    msg += f"• 🔴 Alpa: {summary.get('alpa', 0)}\n"
    msg += f"• Tingkat Kehadiran: *{summary.get('percentage', 0)}%*\n"

    await update.message.reply_text(msg, parse_mode="Markdown")
