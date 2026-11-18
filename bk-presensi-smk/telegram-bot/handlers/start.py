from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes
from services.api_service import TelegramApiService
from handlers.keyboards import get_main_menu_keyboard


async def start_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    name = user.first_name if user else "Bapak/Ibu"
    main_keyboard = get_main_menu_keyboard()

    # Deep linking support: /start v_<NIS>_<CODE> or /start verify_<NIS>_<CODE>
    args = context.args or []
    if args and user:
        raw_param = args[0]
        prefix = None
        if raw_param.startswith("v_"):
            prefix = "v_"
        elif raw_param.startswith("verify_"):
            prefix = "verify_"

        if prefix:
            parts = raw_param[len(prefix):].split("_")
            if len(parts) >= 2:
                nis = parts[0]
                code = "_".join(parts[1:])
                parent_name = user.full_name or user.first_name or "Orang Tua Siswa"

                await update.message.reply_text("⏳ Memproses verifikasi otomatis melalui tautan akses...")

                resp = await TelegramApiService.verify_parent(
                    telegram_id=user.id,
                    parent_name=parent_name,
                    nis=nis,
                    code=code,
                )

                if resp.get("success"):
                    data = resp.get("data", {})
                    student_name = data.get("student_name", "Siswa")
                    class_name = data.get("class_name", "-")

                    await update.message.reply_text(
                        f"🎉 *Verifikasi Berhasil!*\n\n"
                        f"Akun Telegram Anda kini terhubung dengan:\n"
                        f"👤 *Nama Siswa:* {student_name}\n"
                        f"🔢 *NIS:* `{nis}`\n"
                        f"🏫 *Kelas:* {class_name}\n\n"
                        f"🔔 *Notifikasi Otomatis Aktif:* Anda akan langsung menerima info jika ada catatan kehadiran (Sakit/Izin/Alpa) atau info dari Guru BK.\n\n"
                        f"Silakan gunakan tombol menu di bawah untuk mulai mengecek data siswa:",
                        parse_mode="Markdown",
                        reply_markup=main_keyboard,
                    )
                    return
                else:
                    err_msg = resp.get("message", "Kode pada tautan verifikasi tidak valid atau kedaluwarsa.")
                    await update.message.reply_text(
                        f"❌ *Gagal Terhubung Melalui Tautan*\n\n{err_msg}\n\n"
                        f"Anda tetap bisa langsung mencari info siswa menggunakan tombol *🔍 Cari Siswa* di bawah, atau hubungi Guru BK untuk kode verifikasi baru.",
                        parse_mode="Markdown",
                        reply_markup=main_keyboard,
                    )
                    return

    message = (
        f"👋 *Selamat Datang, {name}!*\n"
        f"*Bot Layanan Orang Tua — SMK IPTEK SANGGABUANA*\n\n"
        "Bapak/Ibu dapat memantau kehadiran dan perkembangan kedisiplinan siswa secara cepat menggunakan *tombol menu di bawah ini*:\n\n"
        "• *🔍 Cari Siswa* — Cari info lengkap siswa (ketik Nama atau NIS)\n"
        "• *📅 Absensi Siswa* — Cek kehadiran hari ini & rekap absen\n"
        "• *📋 Riwayat Absen* — Lihat 10 catatan kehadiran terakhir\n"
        "• *🛡️ Catatan BK* — Cek status pembinaan Bimbingan Konseling\n"
        "• *📞 Hubungi Guru BK* — Kontak resmi sekolah & jadwal konseling\n\n"
        "💡 _Atau langsung ketik Nama / NIS siswa di kolom chat untuk mencari dengan cepat._"
    )
    await update.message.reply_text(
        message,
        parse_mode="Markdown",
        reply_markup=main_keyboard,
    )
