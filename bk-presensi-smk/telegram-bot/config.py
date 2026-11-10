import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
LARAVEL_API_BASE_URL = os.getenv("LARAVEL_API_BASE_URL", "http://localhost:8000")
BOT_SERVICE_TOKEN = os.getenv("BOT_SERVICE_TOKEN", "secret_bot_service_token_smk_iptek_2026")
TIMEZONE = os.getenv("TIMEZONE", "Asia/Jakarta")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
API_TIMEOUT = 10.0
