from telegram import Update
from telegram.ext import ContextTypes
from services.api_service import TelegramApiService

async def verify_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    if not user:
        return

    # Check arguments: /verifikasi <NIS> <KODE>
    args = context.args or []
    if len(args) < 2:
        await update.message.reply_text(
            "⚠️ *Format Verifikasi Belum Tepat*\n\n"
            "Silakan ketik perintah dengan format:\n"
            "`/verifikasi <NIS_SISWA> <KODE_VERIFIKASI>`\n\n"
            "Contoh:\n"
            "`/verifikasi 2026001 ABC123`\n\n"
            "_Catatan: Kode verifikasi resmi diperoleh dari pihak sekolah / Wali Kelas._",
            parse_mode="Markdown"
        )
        return

    nis = args[0].strip()
    code = args[1].strip()
    parent_name = user.full_name or user.first_name or "Orang Tua Siswa"

    await update.message.reply_text("⏳ Memverifikasi data ke sistem sekolah...")

    resp = await TelegramApiService.verify_parent(
        telegram_id=user.id,
        parent_name=parent_name,
        nis=nis,
        code=code
    )

    if resp.get("success"):
        data = resp.get("data", {})
        student_name = data.get("student_name", "Siswa")
        class_name = data.get("class_name", "-")

        await update.message.reply_text(
            f"✅ *Verifikasi Berhasil!*\n\n"
            f"Akun Telegram Anda kini resmi terhubung dengan:\n"
            f"👤 *Nama:* {student_name}\n"
            f"🔢 *NIS:* {nis}\n"
            f"🏫 *Kelas:* {class_name}\n\n"
            f"Anda sekarang dapat menggunakan perintah:\n"
            f"• `/masuk` untuk memeriksa kehadiran hari ini\n"
            f"• `/absen` untuk riwayat kehadiran\n"
            f"• `/kasus` untuk catatan informasi bimbingan\n",
            parse_mode="Markdown"
        )
    else:
        err_msg = resp.get("message", "Kode verifikasi tidak valid atau telah kedaluwarsa.")
        await update.message.reply_text(
            f"❌ *Verifikasi Gagal*\n\n{err_msg}\n\n"
            f"Pastikan NIS dan Kode yang Anda masukkan sesuai, atau hubungi Wali Kelas / Guru BK sekolah melalui `/bantuan`.",
            parse_mode="Markdown"
        )

async def unverify_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    if not user:
        return

    resp = await TelegramApiService.unverify_parent(telegram_id=user.id)
    if resp.get("success"):
        await update.message.reply_text(
            "🔓 *Verifikasi Akun Dibatalkan*\n\n"
            "Hubungan akun Telegram Anda dengan data siswa telah berhasil diputuskan. "
            "Anda dapat melakukan verifikasi kembali kapan saja menggunakan kode baru.",
            parse_mode="Markdown"
        )
    else:
        await update.message.reply_text(
            "⚠️ Anda belum memiliki data siswa yang terhubung.",
            parse_mode="Markdown"
        )
