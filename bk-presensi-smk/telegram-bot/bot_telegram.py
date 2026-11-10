import logging
from telegram import Update
from telegram.ext import (
    Application,
    ApplicationBuilder,
    CommandHandler,
    CallbackQueryHandler,
    ContextTypes,
)
from config import TELEGRAM_BOT_TOKEN, LOG_LEVEL
from handlers.start import start_handler
from handlers.verify import verify_handler, unverify_handler
from handlers.profile import profile_handler
from handlers.attendance import masuk_handler, absen_history_handler
from handlers.cases import kasus_handler
from handlers.rekap import rekap_handler
from handlers.help import help_handler
from handlers.callback import button_callback_handler

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=getattr(logging, LOG_LEVEL.upper(), logging.INFO),
)
logger = logging.getLogger(__name__)

async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    logger.error("Exception while handling an update:", exc_info=context.error)
    if isinstance(update, Update) and update.effective_message:
        await update.effective_message.reply_text(
            "⚠️ Terjadi kendala saat memproses permintaan Anda ke server. "
            "Silakan coba beberapa saat lagi atau hubungi pihak sekolah."
        )

def build_application() -> Application:
    if not TELEGRAM_BOT_TOKEN or TELEGRAM_BOT_TOKEN == "YOUR_BOT_TOKEN_FROM_BOTFATHER":
        logger.warning("TELEGRAM_BOT_TOKEN belum diset. Gunakan bot token nyata dari @BotFather saat menjalankan di produksi.")

    # Create application instance
    app = ApplicationBuilder().token(TELEGRAM_BOT_TOKEN or "dummy_token").build()

    # Register command handlers
    app.add_handler(CommandHandler("start", start_handler))
    app.add_handler(CommandHandler("verifikasi", verify_handler))
    app.add_handler(CommandHandler("batal_verifikasi", unverify_handler))
    app.add_handler(CommandHandler("profil", profile_handler))
    app.add_handler(CommandHandler("masuk", masuk_handler))
    app.add_handler(CommandHandler("absen", absen_history_handler))
    app.add_handler(CommandHandler("kasus", kasus_handler))
    app.add_handler(CommandHandler("rekap", rekap_handler))
    app.add_handler(CommandHandler("bantuan", help_handler))

    # Register inline button callback
    app.add_handler(CallbackQueryHandler(button_callback_handler))

    # Register global error handler
    app.add_error_handler(error_handler)

    return app
