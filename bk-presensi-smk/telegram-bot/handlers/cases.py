from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes
from services.api_service import TelegramApiService

async def kasus_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    if not user:
        return

    resp = await TelegramApiService.get_student_cases(telegram_id=user.id)

    if not resp.get("success"):
        await update.message.reply_text(
            f"⚠️ {resp.get('message', 'Akun belum terverifikasi.')}\n\n"
            "Gunakan `/verifikasi <NIS> <KODE>` terlebih dahulu.",
            parse_mode="Markdown"
        )
        return

    cases = resp.get("data", [])

    keyboard = [
        [
            InlineKeyboardButton("📞 Hubungi Guru BK", callback_data="contact_bk"),
            InlineKeyboardButton("📅 Buat Janji Temu", callback_data="appointment_bk"),
        ],
        [
            InlineKeyboardButton("ℹ️ Informasi Kontak Sekolah", callback_data="help_school"),
        ],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    if not cases:
        await update.message.reply_text(
            "🛡️ *Informasi Bimbingan Konseling*\n\n"
            "Saat ini tidak ada laporan kasus kedisiplinan terbuka yang memerlukan perhatian khusus untuk anak Anda.\n\n"
            "Untuk konsultasi umum atau bimbingan karir, silakan gunakan tombol di bawah:",
            reply_markup=reply_markup,
            parse_mode="Markdown"
        )
        return

    msg = f"⚠️ *Pemberitahuan Kasus / Bimbingan Terbuka ({len(cases)} Kasus)*\n\n"
    for i, c in enumerate(cases, 1):
        status = c.get("status", "Pending")
        incident_date = c.get("incident_at", "-")
        student_name = c.get("student_name", "Siswa")
        code = c.get("complaint_code", "-")
        summary_note = c.get("summary", "Memerlukan perhatian dan pendampingan orang tua.")

        msg += f"{i}. *Kasus #{code}* ({status})\n"
        msg += f"   • Siswa: {student_name}\n"
        msg += f"   • Tanggal Kejadian: {incident_date}\n"
        msg += f"   • Catatan Pihak Sekolah: _{summary_note}_\n\n"

    msg += "Silakan hubungi pihak Guru BK untuk koordinasi dan pendampingan siswa:"

    await update.message.reply_text(msg, reply_markup=reply_markup, parse_mode="Markdown")
