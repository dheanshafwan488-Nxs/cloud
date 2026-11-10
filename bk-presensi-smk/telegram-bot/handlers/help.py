from telegram import Update
from telegram.ext import ContextTypes
from services.api_service import TelegramApiService

async def help_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    resp = await TelegramApiService.get_school_contacts()

    if resp.get("success") and resp.get("data"):
        data = resp.get("data", {})
        school_name = data.get("school_name", "SMK IPTEK SANGGABUANA")
        phone = data.get("bk_phone")
        email = data.get("bk_email")
        address = data.get("address")

        msg = f"🏫 *Kontak Resmi {school_name}*\n\n"
        if phone:
            msg += f"📞 *Telepon / WA Guru BK:* {phone}\n"
        else:
            msg += "📞 *Telepon BK:* _Belum dikonfigurasi_\n"

        if email:
            msg += f"✉️ *Email BK:* `{email}`\n"
        if address:
            msg += f"📍 *Alamat Sekolah:* {address}\n"

        msg += (
            "\n📌 *Bantuan Perintah Bot:*\n"
            "• `/verifikasi <NIS> <KODE>` — Verifikasi akun orang tua\n"
            "• `/masuk` — Cek presensi hari ini\n"
            "• `/absen` — 10 riwayat kehadiran\n"
            "• `/kasus` — Laporan catatan bimbingan terbuka\n"
            "• `/profil` — Data anak yang terhubung\n"
        )
    else:
        msg = (
            "ℹ️ *Informasi Bantuan*\n\n"
            "Konfigurasi kontak resmi sekolah belum tersedia di sistem. "
            "Silakan hubungi pihak tata usaha atau administrasi sekolah secara langsung."
        )

    await update.message.reply_text(msg, parse_mode="Markdown")
