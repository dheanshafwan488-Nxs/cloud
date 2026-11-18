from __future__ import annotations

from telegram import ReplyKeyboardMarkup, KeyboardButton

BTN_SEARCH_STUDENT = "🔍 Cari Siswa"
BTN_ATTENDANCE_TODAY = "📅 Absensi Siswa"
BTN_ATTENDANCE_HISTORY = "📋 Riwayat Absen"
BTN_BK_NOTES = "🛡️ Catatan BK"
BTN_CONTACT_BK = "📞 Hubungi Guru BK"


def get_main_menu_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        [
            [KeyboardButton(BTN_SEARCH_STUDENT), KeyboardButton(BTN_ATTENDANCE_TODAY)],
            [KeyboardButton(BTN_ATTENDANCE_HISTORY), KeyboardButton(BTN_BK_NOTES)],
            [KeyboardButton(BTN_CONTACT_BK)],
        ],
        resize_keyboard=True,
        input_field_placeholder="Pilih tombol menu atau ketik nama/NIS siswa...",
    )
