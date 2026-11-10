from telegram import Update
from telegram.ext import ContextTypes
from services.api_service import TelegramApiService

async def button_callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    if not query:
        return

    await query.answer()
    data = query.data

    if data == "contact_bk":
        contacts = await TelegramApiService.get_school_contacts()
        phone = contacts.get("data", {}).get("bk_phone", "0812-3456-7890")
        email = contacts.get("data", {}).get("bk_email", "bk@smkiptek.sch.id")

        await query.message.reply_text(
            f"📞 *Kontak Resmi Guru BK SMK IPTEK SANGGABUANA:*\n\n"
            f"• WhatsApp / Telepon: `{phone}`\n"
            f"• Email: `{email}`\n"
            f"• Jam Kerja: Senin - Jumat (07.00 - 15.30 WIB)\n\n"
            f"Silakan sertakan nama anak dan NIS saat menghubungi petugas.",
            parse_mode="Markdown"
        )

    elif data == "appointment_bk":
        await query.message.reply_text(
            "📅 *Pengajuan Janji Temu Konseling:*\n\n"
            "Untuk menjadwalkan pertemuan tatap muka di ruang BK sekolah, silakan:\n"
            "1. Hubungi WhatsApp Guru BK di menu Kontak Resmi.\n"
            "2. Cantumkan nama siswa, kelas, dan topik pembahasan yang ingin dikonsultasikan.\n"
            "3. Petugas BK akan mengonfirmasi jadwal temu dan menyiapkan ruang bimbingan.",
            parse_mode="Markdown"
        )

    elif data == "help_school":
        contacts = await TelegramApiService.get_school_contacts()
        address = contacts.get("data", {}).get("address", "Kampus SMK IPTEK SANGGABUANA")

        await query.message.reply_text(
            f"🏫 *Informasi Kampus SMK IPTEK SANGGABUANA*\n\n"
            f"📍 *Alamat:* {address}\n"
            f"🕒 *Waktu Layanan:* 07.00 - 16.00 WIB\n"
            f"🔒 Privasi dan keamanan data siswa dijaga sesuai ketentuan perundang-undangan.",
            parse_mode="Markdown"
        )
