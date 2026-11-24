from __future__ import annotations

from telegram import Update
from telegram.ext import ContextTypes
from services.api_service import TelegramApiService
from handlers.keyboards import get_main_menu_keyboard


async def start_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    name = user.first_name if user else "Bapak/Ibu"
    main_keyboard = get_main_menu_keyboard()

    if user:
        try:
            await TelegramApiService.register_interaction(
                telegram_id=user.id,
                parent_name=user.full_name or user.first_name,
                username=user.username,
            )
        except Exception:
            pass

    # Deep linking support: /start <NIS> or /start v_<NIS>_<CODE>
    args = context.args or []
    if args and user:
        raw_param = args[0]
        query = raw_param
        for prefix in ("v_", "verify_"):
            if raw_param.startswith(prefix):
                parts = raw_param[len(prefix):].split("_")
                query = parts[0]
                break
        from handlers.student_lookup import run_student_search
        await run_student_search(update, context, query, mode="overview")
        return

    message = (
        f"👋 *Selamat Datang, {name}!*\n"
        f"*Bot Layanan Orang Tua — SMK IPTEK SANGGABUANA*\n\n"
        "Bapak/Ibu dapat mencari dan memantau kehadiran serta perkembangan kedisiplinan siswa siapa saja menggunakan *tombol menu di bawah ini*:\n\n"
        "• *🔍 Cari Siswa* — Cari cepat berdasarkan Nama, NIS, atau Kelas\n"
        "• *🏫 Pilih Kelas & Siswa* — Pilih kelas lalu klik nama siswa langsung\n"
        "• *📅 Absensi Siswa* — Cek kehadiran hari ini & rekap absen\n"
        "• *📋 Riwayat Absen* — Lihat 10 catatan kehadiran terakhir\n"
        "• *🛡️ Catatan BK* — Cek status pembinaan Bimbingan Konseling\n"
        "• *📞 Hubungi Guru BK* — Kontak resmi sekolah & jadwal konseling\n\n"
        "💡 _Ketik langsung Nama / NIS / Nama Kelas siswa di kolom chat untuk mencari data siswa._"
    )
    await update.message.reply_text(
        message,
        parse_mode="Markdown",
        reply_markup=main_keyboard,
    )


async def id_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    if not user:
        return

    try:
        await TelegramApiService.register_interaction(
            telegram_id=user.id,
            parent_name=user.full_name or user.first_name,
            username=user.username,
        )
    except Exception:
        pass

    username_str = f"@{user.username}" if user.username else "_Belum disetel_"
    msg = (
        "🆔 *Informasi Akun Telegram Anda*\n\n"
        f"• *Chat ID:* `{user.id}` _(Klik/sentuh angka ID untuk menyalin)_\n"
        f"• *Nama:* {user.full_name or user.first_name}\n"
        f"• *Username:* {username_str}\n\n"
        "💡 *Panduan Uji Coba Notifikasi:*\n"
        "Salin deretan angka *Chat ID* di atas, lalu masukkan ke kolom *'Uji Coba Kirim Notifikasi'* di menu *Pengaturan Sekolah & Bot* pada aplikasi web."
    )
    await update.message.reply_text(msg, parse_mode="Markdown")
