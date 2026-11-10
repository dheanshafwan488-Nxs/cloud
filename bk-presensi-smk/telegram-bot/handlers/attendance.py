from telegram import Update
from telegram.ext import ContextTypes
from services.api_service import TelegramApiService

STATUS_ICONS = {
    "Hadir": "🟢",
    "Sakit": "🟡",
    "Izin": "🔵",
    "Alpa": "🔴",
}

async def masuk_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    if not user:
        return

    resp = await TelegramApiService.get_today_attendance(telegram_id=user.id)

    if not resp.get("success"):
        await update.message.reply_text(
            f"⚠️ {resp.get('message', 'Akun belum terverifikasi atau data siswa belum terhubung.')}\n\n"
            "Gunakan `/verifikasi <NIS> <KODE>` terlebih dahulu.",
            parse_mode="Markdown"
        )
        return

    data = resp.get("data", {})
    records = data.get("records", [])
    date_str = data.get("date", "-")

    if not records:
        await update.message.reply_text(
            f"📅 *Presensi Hari Ini ({date_str})*\n\n"
            "ℹ️ Presensi untuk anak Anda belum dicatat atau belum difinalisasi oleh Wali Kelas untuk hari ini.\n"
            "_Silakan cek kembali beberapa saat lagi._",
            parse_mode="Markdown"
        )
        return

    msg = f"📅 *Presensi Siswa Hari Ini ({date_str})*\n"
    msg += f"Zona Waktu: Asia/Jakarta\n\n"

    for item in records:
        student_name = item.get("student_name", "Siswa")
        nis = item.get("nis", "-")
        status = item.get("status")
        notes = item.get("notes") or "-"
        icon = STATUS_ICONS.get(status, "⚪")

        summary = item.get("summary", {})
        hadir = summary.get("hadir", 0)
        sakit = summary.get("sakit", 0)
        izin = summary.get("izin", 0)
        alpa = summary.get("alpa", 0)
        pct = summary.get("percentage", 0)

        msg += f"👤 *{student_name}* (NIS: `{nis}`)\n"
        if status:
            msg += f"Status Hari Ini: {icon} *{status}*\n"
            msg += f"Keterangan: _{notes}_\n"
        else:
            msg += f"Status Hari Ini: ⏳ _Belum difinalisasi_\n"

        msg += f"📊 *Rekap Periode Semester:*\n"
        msg += f"  • 🟢 Hadir: {hadir} hari\n"
        msg += f"  • 🟡 Sakit: {sakit} hari\n"
        msg += f"  • 🔵 Izin: {izin} hari\n"
        msg += f"  • 🔴 Alpa: {alpa} hari\n"
        msg += f"  • Kehadiran Fisik: *{pct}%*\n\n"

    await update.message.reply_text(msg, parse_mode="Markdown")

async def absen_history_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    if not user:
        return

    resp = await TelegramApiService.get_attendance_history(telegram_id=user.id)

    if not resp.get("success"):
        await update.message.reply_text(
            f"⚠️ {resp.get('message', 'Akun belum terverifikasi.')}\n\n"
            "Gunakan `/verifikasi <NIS> <KODE>` terlebih dahulu.",
            parse_mode="Markdown"
        )
        return

    data = resp.get("data", [])
    if not data:
        await update.message.reply_text(
            "📋 Belum ada histori presensi yang tercatat untuk anak Anda.",
            parse_mode="Markdown"
        )
        return

    msg = "📋 *10 Riwayat Presensi Terbaru*\n\n"
    for idx, row in enumerate(data[:10], 1):
        status = row.get("status", "-")
        icon = STATUS_ICONS.get(status, "⚪")
        date_val = row.get("date", "-")
        student_name = row.get("student_name", "")
        notes = row.get("notes")

        msg += f"{idx}. *{date_val}* — {icon} {status}\n"
        if student_name:
            msg += f"   Siswa: {student_name}\n"
        if notes:
            msg += f"   Catatan: _{notes}_\n"
        msg += "\n"

    await update.message.reply_text(msg, parse_mode="Markdown")
