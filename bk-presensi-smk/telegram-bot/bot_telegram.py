from __future__ import annotations

import logging
from telegram import Update, BotCommand
from telegram.ext import (
    Application,
    ApplicationBuilder,
    CommandHandler,
    CallbackQueryHandler,
    MessageHandler,
    ContextTypes,
    filters,
)
from config import TELEGRAM_BOT_TOKEN, LOG_LEVEL
from handlers.start import start_handler, id_handler
from handlers.verify import verify_handler, unverify_handler
from handlers.profile import profile_handler
from handlers.attendance import masuk_handler, absen_history_handler
from handlers.cases import kasus_handler
from handlers.rekap import rekap_handler
from handlers.help import help_handler
from handlers.callback import button_callback_handler
from handlers.student_lookup import (
    cari_command_handler,
    kelas_command_handler,
    absensi_menu_handler,
    bk_menu_handler,
    text_menu_router,
)

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=getattr(logging, LOG_LEVEL.upper(), logging.INFO),
)
logger = logging.getLogger(__name__)


async def post_init(application: Application) -> None:
    """Register compact, essential slash commands in Telegram's Menu button."""
    commands = [
        BotCommand("start", "Menu Utama & Tombol Layanan"),
        BotCommand("cari", "Cari Data Siswa (Nama / NIS / Kelas)"),
        BotCommand("kelas", "Pilih Kelas & Daftar Nama Siswa"),
        BotCommand("absensi", "Cek Absensi Siswa Hari Ini"),
        BotCommand("kasus", "Cek Catatan Bimbingan Konseling"),
        BotCommand("bantuan", "Kontak Resmi Guru BK & Sekolah"),
    ]
    try:
        await application.bot.set_my_commands(commands)
        logger.info("Bot commands menu berhasil didaftarkan ke Telegram.")
    except Exception as exc:
        logger.warning("Gagal mendaftarkan commands menu saat startup (bot tetap berjalan): %s", exc)


async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    logger.error("Exception while handling an update:", exc_info=context.error)
    if isinstance(update, Update) and update.effective_message:
        await update.effective_message.reply_text(
            "⚠️ Terjadi kendala saat memproses permintaan Anda ke server. "
            "Silakan coba beberapa saat lagi atau hubungi Guru BK."
        )


def build_application() -> Application:
    if not TELEGRAM_BOT_TOKEN or TELEGRAM_BOT_TOKEN == "YOUR_BOT_TOKEN_FROM_BOTFATHER":
        logger.warning("TELEGRAM_BOT_TOKEN belum diset. Gunakan bot token nyata dari @BotFather.")

    app = (
        ApplicationBuilder()
        .token(TELEGRAM_BOT_TOKEN or "dummy_token")
        .connect_timeout(20.0)
        .read_timeout(20.0)
        .write_timeout(20.0)
        .post_init(post_init)
        .build()
    )

    # Core & compatibility command handlers
    app.add_handler(CommandHandler("start", start_handler))
    app.add_handler(CommandHandler(["id", "myid"], id_handler))
    app.add_handler(CommandHandler("cari", cari_command_handler))
    app.add_handler(CommandHandler("kelas", kelas_command_handler))
    app.add_handler(CommandHandler("absensi", absensi_menu_handler))
    app.add_handler(CommandHandler("verifikasi", verify_handler))
    app.add_handler(CommandHandler("batal_verifikasi", unverify_handler))
    app.add_handler(CommandHandler("profil", profile_handler))
    app.add_handler(CommandHandler("masuk", masuk_handler))
    app.add_handler(CommandHandler("absen", absen_history_handler))
    app.add_handler(CommandHandler("kasus", kasus_handler))
    app.add_handler(CommandHandler("rekap", rekap_handler))
    app.add_handler(CommandHandler("bantuan", help_handler))

    # Inline button callbacks
    app.add_handler(CallbackQueryHandler(button_callback_handler))

    # Bottom keyboard buttons + direct student search by text
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, text_menu_router))

    # Global error handler
    app.add_error_handler(error_handler)

    return app
