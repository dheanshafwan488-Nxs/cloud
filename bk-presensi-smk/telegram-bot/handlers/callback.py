from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes
from services.api_service import TelegramApiService
from handlers.student_lookup import send_student_detail
from handlers.keyboards import get_main_menu_keyboard


async def button_callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    if not query:
        return

    await query.answer()
    data = query.data or ""

    if data.startswith("student_overview:"):
        student_id = int(data.split(":", 1)[1])
        await send_student_detail(query.message, student_id, mode="overview")

    elif data.startswith("student_history:"):
        student_id = int(data.split(":", 1)[1])
        await send_student_detail(query.message, student_id, mode="history")

    elif data.startswith("student_cases:"):
        student_id = int(data.split(":", 1)[1])
        await send_student_detail(query.message, student_id, mode="cases")

    elif data == "prompt_search":
        context.user_data["awaiting_student_search"] = "overview"
        await query.message.reply_text(
            "🔍 Ketik *Nama Siswa* atau *NIS* yang ingin Bapak/Ibu cari (contoh: `Budi` atau `2026001`):",
            parse_mode="Markdown",
            reply_markup=get_main_menu_keyboard(),
        )

    elif data == "prompt_search_history":
        context.user_data["awaiting_student_search"] = "history"
        await query.message.reply_text(
            "📋 Ketik *Nama Siswa* atau *NIS* untuk melihat 10 riwayat absensi terakhir:",
            parse_mode="Markdown",
            reply_markup=get_main_menu_keyboard(),
        )

    elif data == "prompt_search_cases":
        context.user_data["awaiting_student_search"] = "cases"
        await query.message.reply_text(
            "🛡️ Ketik *Nama Siswa* atau *NIS* untuk mengecek catatan Bimbingan Konseling:",
            parse_mode="Markdown",
            reply_markup=get_main_menu_keyboard(),
        )

    elif data == "contact_bk":
        contacts = await TelegramApiService.get_school_contacts()
        info = contacts.get("data", {})
        school_name = info.get("school_name", "SMK IPTEK SANGGABUANA")
        phone = info.get("bk_phone", "0812-3456-7890")
        email = info.get("bk_email", "bk@smkiptek.sch.id")

        await query.message.reply_text(
            f"📞 *Kontak Resmi Guru BK — {school_name}*\n\n"
            f"• WhatsApp / Telepon: `{phone}`\n"
            f"• Email: `{email}`\n"
            f"• Jam Kerja: Senin – Jumat (07.00 – 15.30 WIB)\n\n"
            f"Silakan sertakan nama anak dan kelas saat menghubungi petugas.",
            parse_mode="Markdown",
        )

    elif data == "appointment_bk":
        await query.message.reply_text(
            "📅 *Cara Buat Janji Temu Konseling*\n\n"
            "1. Hubungi WhatsApp / Telepon Guru BK pada menu *📞 Hubungi Guru BK*.\n"
            "2. Sertakan nama siswa, kelas, dan keperluan konsultasi.\n"
            "3. Guru BK akan mengonfirmasi jadwal pertemuan di Ruang BK sekolah.",
            parse_mode="Markdown",
        )

    elif data == "verify_guide":
        await query.message.reply_text(
            "🔗 *Cara Aktivasi Notifikasi Otomatis Wali Murid*\n\n"
            "1. Minta *Kartu Akses / Kode Verifikasi* dari Guru BK sekolah.\n"
            "2. Pindai QR Code pada kartu, atau ketik perintah:\n"
            "   `/verifikasi <NIS> <KODE>`\n"
            "   Contoh: `/verifikasi 2026001 DEMO123`\n\n"
            "Setelah terhubung, Anda akan otomatis mendapat notifikasi setiap anak Alpa/Sakit/Izin atau ada info BK.",
            parse_mode="Markdown",
        )

    elif data == "help_school":
        contacts = await TelegramApiService.get_school_contacts()
        info = contacts.get("data", {})
        school_name = info.get("school_name", "SMK IPTEK SANGGABUANA")
        address = info.get("address", "Kampus SMK IPTEK SANGGABUANA")

        await query.message.reply_text(
            f"🏫 *Informasi {school_name}*\n\n"
            f"📍 *Alamat:* {address}\n"
            f"🕒 *Waktu Layanan:* 07.00 – 15.30 WIB",
            parse_mode="Markdown",
        )
