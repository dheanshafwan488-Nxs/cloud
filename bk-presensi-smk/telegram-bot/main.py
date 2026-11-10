import sys
import logging
from bot_telegram import build_application
from config import TELEGRAM_BOT_TOKEN

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

def main():
    logger.info("Memulai Bot Telegram Presensi & BK SMK IPTEK SANGGABUANA...")
    if not TELEGRAM_BOT_TOKEN or TELEGRAM_BOT_TOKEN == "YOUR_BOT_TOKEN_FROM_BOTFATHER":
        logger.error("TELEGRAM_BOT_TOKEN belum diset di file .env! Harap isi token dari @BotFather.")
        print("\n[PERINGATAN] TELEGRAM_BOT_TOKEN belum diset di .env!")
        print("Silakan salin .env.example ke .env dan isi TELEGRAM_BOT_TOKEN dari BotFather.\n")
        sys.exit(1)

    app = build_application()
    logger.info("Bot siap menerima perintah via polling.")
    app.run_polling()

if __name__ == "__main__":
    main()
