from __future__ import annotations

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes
from services.api_service import TelegramApiService
from handlers.keyboards import (
    BTN_SEARCH_STUDENT,
    BTN_BROWSE_CLASSES,
    BTN_ATTENDANCE_TODAY,
    BTN_ATTENDANCE_HISTORY,
    BTN_BK_NOTES,
    BTN_CONTACT_BK,
    get_main_menu_keyboard,
)

STATUS_ICONS = {
    "Hadir": "🟢",
    "Sakit": "🟡",
    "Izin": "🔵",
    "Alpa": "🔴",
}


def esc_md(val: object) -> str:
    """Escape characters that break legacy Telegram Markdown."""
    s = str(val if val is not None else "-")
    for ch in ("\\", "_", "*", "`", "["):
        s = s.replace(ch, f"\\{ch}")
    return s


def build_student_action_buttons(student_id: int) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup([
        [
            InlineKeyboardButton("📅 Absensi & Rekap", callback_data=f"student_overview:{student_id}"),
            InlineKeyboardButton("📋 Riwayat Absen", callback_data=f"student_history:{student_id}"),
        ],
        [
            InlineKeyboardButton("🛡️ Catatan BK", callback_data=f"student_cases:{student_id}"),
            InlineKeyboardButton("🔍 Cari Siswa Lain", callback_data="prompt_search"),
        ],
        [
            InlineKeyboardButton("🏫 Pilih dari Daftar Kelas", callback_data="browse_classes:overview"),
        ],
    ])


def format_student_overview(data: dict) -> str:
    student = data.get("student", {})
    today = data.get("today_attendance", {})
    summary = data.get("attendance_summary", {})
    bk = data.get("bk_summary", {})

    name = student.get("name", "-")
    nis = student.get("nis", "-")
    class_name = student.get("class_name", "-")
    wali_kelas = student.get("wali_kelas", "-")

    today_date = today.get("date", "-")
    today_status = today.get("status")
    today_notes = today.get("notes")

    if today_status:
        icon = STATUS_ICONS.get(today_status, "⚪")
        status_line = f"{icon} *{today_status}*"
        if today_notes:
            status_line += f" (_{today_notes}_)"
    else:
        status_line = "⏳ _Belum dicatat hari ini_"

    hadir = summary.get("hadir", 0)
    sakit = summary.get("sakit", 0)
    izin = summary.get("izin", 0)
    alpa = summary.get("alpa", 0)
    pct = summary.get("percentage", 100)

    total_cases = bk.get("total_cases", 0)
    open_cases = bk.get("open_cases", 0)
    total_points = bk.get("total_points", 0)

    if total_cases == 0:
        bk_line = "✅ Tidak ada catatan pelanggaran/kasus."
    else:
        bk_line = f"⚠️ Total *{total_cases}* catatan ({open_cases} aktif) • Poin: *{total_points}*"

    return (
        f"👤 *Informasi Siswa*\n"
        f"• *Nama:* {name}\n"
        f"• *NIS:* `{nis}`\n"
        f"• *Kelas:* {class_name}\n"
        f"• *Wali Kelas:* {wali_kelas}\n\n"
        f"📅 *Presensi Hari Ini ({today_date})*\n"
        f"• Status: {status_line}\n\n"
        f"📊 *Rekap Kehadiran*\n"
        f"• 🟢 Hadir: {hadir} | 🟡 Sakit: {sakit} | 🔵 Izin: {izin} | 🔴 Alpa: {alpa}\n"
        f"• Persentase Hadir: *{pct}%*\n\n"
        f"🛡️ *Status Bimbingan Konseling (BK)*\n"
        f"• {bk_line}"
    )


def format_student_history(data: dict) -> str:
    student = data.get("student", {})
    records = data.get("recent_attendances", [])
    name = student.get("name", "-")
    class_name = student.get("class_name", "-")

    if not records:
        return (
            f"📋 *Riwayat Absensi — {name} ({class_name})*\n\n"
            "Belum ada data riwayat kehadiran yang tercatat untuk siswa ini."
        )

    lines = [f"📋 *10 Riwayat Absensi Terbaru*\n👤 *{name}* ({class_name})\n"]
    for idx, row in enumerate(records[:10], 1):
        status = row.get("status", "-")
        icon = STATUS_ICONS.get(status, "⚪")
        date_val = row.get("date", "-")
        notes = row.get("notes")
        line = f"{idx}. *{date_val}* — {icon} {status}"
        if notes:
            line += f"\n   _{notes}_"
        lines.append(line)

    return "\n".join(lines)


def format_student_cases(data: dict) -> str:
    student = data.get("student", {})
    bk = data.get("bk_summary", {})
    cases = bk.get("cases", [])
    name = student.get("name", "-")
    class_name = student.get("class_name", "-")

    if not cases:
        return (
            f"🛡️ *Catatan Bimbingan Konseling*\n"
            f"👤 *{name}* ({class_name})\n\n"
            "✅ Saat ini tidak ada catatan pelanggaran atau pembinaan BK yang tercatat."
        )

    lines = [
        f"🛡️ *Catatan Bimbingan Konseling*\n"
        f"👤 *{name}* ({class_name})\n"
        f"Total Catatan: *{bk.get('total_cases', len(cases))}* • Total Poin: *{bk.get('total_points', 0)}*\n"
    ]
    for idx, c in enumerate(cases, 1):
        code = c.get("complaint_code", "-")
        status = c.get("status", "-")
        date_val = c.get("incident_at", "-")
        violation = c.get("violation", "Catatan Pembinaan BK")
        lines.append(
            f"{idx}. *#{code}* — Status: *{status}*\n"
            f"   • Tanggal: {date_val}\n"
            f"   • Keterangan: _{violation}_"
        )

    lines.append("\n_Untuk konsultasi lebih lanjut, silakan klik tombol Hubungi Guru BK._")
    return "\n".join(lines)


async def send_student_detail(message, student_id: int, mode: str = "overview") -> None:
    resp = await TelegramApiService.get_student_overview(student_id)
    if not resp.get("success") or not resp.get("data"):
        await message.reply_text(
            f"⚠️ {resp.get('message', 'Data siswa tidak ditemukan.')}",
            reply_markup=get_main_menu_keyboard(),
        )
        return

    data = resp["data"]
    if mode == "history":
        text = format_student_history(data)
    elif mode == "cases":
        text = format_student_cases(data)
    else:
        text = format_student_overview(data)

    await message.reply_text(
        text,
        parse_mode="Markdown",
        reply_markup=build_student_action_buttons(student_id),
    )


async def send_class_list(message, mode: str = "overview", edit: bool = False) -> None:
    resp = await TelegramApiService.get_classes()
    if not resp.get("success"):
        text = f"⚠️ {resp.get('message', 'Gagal memuat daftar kelas.')}"
        if edit:
            await message.edit_text(text)
        else:
            await message.reply_text(text, reply_markup=get_main_menu_keyboard())
        return

    classes = resp.get("data", [])
    if not classes:
        text = "ℹ️ Belum ada kelas aktif yang terdaftar di sistem."
        if edit:
            await message.edit_text(text)
        else:
            await message.reply_text(text, reply_markup=get_main_menu_keyboard())
        return

    buttons = []
    row = []
    for c in classes:
        label = f"🏫 {c['name']} ({c.get('students_count', 0)})"
        row.append(InlineKeyboardButton(label, callback_data=f"class_students:{c['id']}:1:{mode}"))
        if len(row) == 2:
            buttons.append(row)
            row = []
    if row:
        buttons.append(row)

    buttons.append([InlineKeyboardButton("🔍 Ketik Nama / NIS Manual", callback_data="prompt_search")])

    text = (
        "🏫 *Daftar Kelas Aktif*\n\n"
        "Silakan pilih kelas untuk melihat daftar nama siswa, "
        "atau langsung ketik *Nama / NIS siswa* di kolom chat:"
    )
    markup = InlineKeyboardMarkup(buttons)
    if edit:
        await message.edit_text(text, parse_mode="Markdown", reply_markup=markup)
    else:
        await message.reply_text(text, parse_mode="Markdown", reply_markup=markup)


async def send_class_students(message, class_id: int, page: int = 1, mode: str = "overview", edit: bool = False) -> None:
    resp = await TelegramApiService.get_class_students(class_id, page=page, per_page=10)
    if not resp.get("success") or not resp.get("data"):
        text = f"⚠️ {resp.get('message', 'Gagal memuat daftar siswa.')}"
        if edit:
            await message.edit_text(text)
        else:
            await message.reply_text(text, reply_markup=get_main_menu_keyboard())
        return

    payload = resp["data"]
    cls = payload.get("class", {})
    students = payload.get("students", [])
    meta = payload.get("meta", {})
    current_page = meta.get("current_page", 1)
    last_page = meta.get("last_page", 1)
    total = meta.get("total", len(students))

    callback_prefix = {
        "history": "student_history",
        "cases": "student_cases",
    }.get(mode, "student_overview")

    buttons = [
        [
            InlineKeyboardButton(
                f"👤 {s['name']} ({s['nis']})",
                callback_data=f"{callback_prefix}:{s['id']}",
            )
        ]
        for s in students
    ]

    nav_row = []
    if current_page > 1:
        nav_row.append(
            InlineKeyboardButton("⬅️ Sebelumnya", callback_data=f"class_students:{class_id}:{current_page - 1}:{mode}")
        )
    if current_page < last_page:
        nav_row.append(
            InlineKeyboardButton("Selanjutnya ➡️", callback_data=f"class_students:{class_id}:{current_page + 1}:{mode}")
        )
    if nav_row:
        buttons.append(nav_row)

    buttons.append([
        InlineKeyboardButton("🔙 Pilih Kelas Lain", callback_data=f"browse_classes:{mode}"),
        InlineKeyboardButton("🔍 Cari Nama", callback_data="prompt_search"),
    ])

    cls_name = esc_md(cls.get("name", "Kelas"))
    text = (
        f"🏫 *Siswa Kelas {cls_name}*\n"
        f"Total: *{total} siswa* (Halaman {current_page}/{last_page})\n\n"
        "Silakan pilih nama siswa di bawah ini:"
    )
    markup = InlineKeyboardMarkup(buttons)
    if edit:
        await message.edit_text(text, parse_mode="Markdown", reply_markup=markup)
    else:
        await message.reply_text(text, parse_mode="Markdown", reply_markup=markup)


async def run_student_search(update: Update, context: ContextTypes.DEFAULT_TYPE, query_text: str, mode: str = "overview") -> None:
    message = update.effective_message
    if not message:
        return

    q = query_text.strip()
    if len(q) < 2:
        await message.reply_text(
            "⚠️ Ketik minimal *2 huruf nama siswa*, *nama kelas*, atau *NIS* (contoh: `Budi`, `X RPL`, atau `2026001`).",
            parse_mode="Markdown",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("🏫 Pilih Berdasarkan Kelas", callback_data=f"browse_classes:{mode}")]
            ]),
        )
        return

    resp = await TelegramApiService.search_students(q)
    if not resp.get("success"):
        await message.reply_text(
            f"⚠️ {resp.get('message', 'Gagal mencari data siswa.')}",
            reply_markup=get_main_menu_keyboard(),
        )
        return

    students = resp.get("data", [])
    total = resp.get("total", len(students))
    if not students:
        await message.reply_text(
            f"❌ Tidak ditemukan siswa aktif dengan kata kunci *{esc_md(q)}*.\n\n"
            "Coba ketik sebagian nama depan/belakang, NIS, nama kelas (misal: `X RPL`), atau pilih langsung dari daftar kelas di bawah:",
            parse_mode="Markdown",
            reply_markup=InlineKeyboardMarkup([
                [InlineKeyboardButton("🏫 Pilih Berdasarkan Kelas", callback_data=f"browse_classes:{mode}")],
                [InlineKeyboardButton("🔍 Cari Kata Kunci Lain", callback_data="prompt_search")],
            ]),
        )
        return

    # If exact single match, show details immediately
    if len(students) == 1:
        context.user_data.pop("awaiting_student_search", None)
        await send_student_detail(message, students[0]["id"], mode=mode)
        return

    # Multiple matches -> render clickable inline buttons
    callback_prefix = {
        "history": "student_history",
        "cases": "student_cases",
    }.get(mode, "student_overview")

    buttons = [
        [
            InlineKeyboardButton(
                f"👤 {s['name']} — {s['class_name']} ({s['nis']})",
                callback_data=f"{callback_prefix}:{s['id']}",
            )
        ]
        for s in students
    ]
    buttons.append([
        InlineKeyboardButton("🏫 Pilih per Kelas", callback_data=f"browse_classes:{mode}"),
        InlineKeyboardButton("🔍 Cari Nama Lain", callback_data="prompt_search"),
    ])

    extra_note = ""
    if total > len(students):
        extra_note = f"\n_(Menampilkan {len(students)} dari {total} siswa — ketik nama lebih lengkap/kelas untuk mempersempit hasil)_"

    context.user_data.pop("awaiting_student_search", None)
    await message.reply_text(
        f"🔍 *Ditemukan {total} siswa untuk \"{esc_md(q)}\":*{extra_note}\nSilakan pilih nama siswa di bawah ini:",
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup(buttons),
    )


async def cari_command_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    message = update.effective_message
    if not message:
        return

    args = context.args or []
    if args:
        await run_student_search(update, context, " ".join(args), mode="overview")
        return

    context.user_data["awaiting_student_search"] = "overview"
    await message.reply_text(
        "🔍 *Cari Data Siswa*\n\n"
        "Ketik *Nama Siswa*, *NIS*, atau *Nama Kelas* langsung di chat.\n"
        "Contoh: `Budi`, `Budi RPL`, `X RPL 1`, atau `2026001`\n\n"
        "Atau klik tombol di bawah untuk memilih dari daftar kelas:",
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("🏫 Pilih Berdasarkan Kelas", callback_data="browse_classes:overview")]
        ]),
    )


async def kelas_command_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    message = update.effective_message
    if not message:
        return
    mode = context.user_data.get("awaiting_student_search", "overview")
    await send_class_list(message, mode=mode, edit=False)


async def absensi_menu_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    message = update.effective_message
    if not message:
        return

    context.user_data["awaiting_student_search"] = "overview"
    await message.reply_text(
        "📅 *Cek Absensi Siswa Hari Ini*\n\n"
        "Silakan ketik langsung *Nama Siswa*, *NIS*, atau *Nama Kelas* di kolom chat (contoh: `Budi`, `X RPL`, atau `2026001`), "
        "atau pilih langsung dari daftar kelas di bawah untuk melihat status kehadiran hari ini dan rekap absensi:",
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("🏫 Pilih Berdasarkan Kelas", callback_data="browse_classes:overview")],
            [InlineKeyboardButton("🔍 Ketik Nama / NIS Manual", callback_data="prompt_search")],
        ]),
    )


async def riwayat_menu_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    message = update.effective_message
    if not message:
        return

    context.user_data["awaiting_student_search"] = "history"
    await message.reply_text(
        "📋 *Cek Riwayat Absensi Siswa*\n\n"
        "Silakan ketik langsung *Nama Siswa*, *NIS*, atau *Nama Kelas* di kolom chat (contoh: `Budi`, `X RPL`, atau `2026001`), "
        "atau pilih langsung dari daftar kelas di bawah untuk melihat 10 riwayat kehadiran terakhir:",
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("🏫 Pilih Berdasarkan Kelas", callback_data="browse_classes:history")],
            [InlineKeyboardButton("🔍 Ketik Nama / NIS Manual", callback_data="prompt_search_history")],
        ]),
    )


async def bk_menu_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    message = update.effective_message
    if not message:
        return

    context.user_data["awaiting_student_search"] = "cases"
    await message.reply_text(
        "🛡️ *Cek Catatan Bimbingan Konseling (BK)*\n\n"
        "Silakan ketik langsung *Nama Siswa*, *NIS*, atau *Nama Kelas* di kolom chat (contoh: `Budi`, `X RPL`, atau `2026001`), "
        "atau pilih langsung dari daftar kelas di bawah untuk mengecek catatan kedisiplinan dan pembinaan siswa:",
        parse_mode="Markdown",
        reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("🏫 Pilih Berdasarkan Kelas", callback_data="browse_classes:cases")],
            [InlineKeyboardButton("🔍 Ketik Nama / NIS Manual", callback_data="prompt_search_cases")],
            [InlineKeyboardButton("📞 Hubungi Guru BK", callback_data="contact_bk")],
        ]),
    )


async def contact_menu_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    message = update.effective_message
    if not message:
        return

    resp = await TelegramApiService.get_school_contacts()
    data = resp.get("data", {}) if resp.get("success") else {}
    school_name = data.get("school_name", "SMK IPTEK SANGGABUANA")
    phone = data.get("bk_phone", "0812-3456-7890")
    email = data.get("bk_email", "bk@smkiptek.sch.id")
    address = data.get("address", "Jl. Terusan Pangrango No. 45, Karawang, Jawa Barat")

    buttons = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("📅 Cara Buat Janji Temu", callback_data="appointment_bk"),
            InlineKeyboardButton("🔍 Cari Data Siswa", callback_data="prompt_search"),
        ]
    ])

    await message.reply_text(
        f"📞 *Kontak Resmi Guru BK — {school_name}*\n\n"
        f"• *WhatsApp / Telepon:* `{phone}`\n"
        f"• *Email BK:* `{email}`\n"
        f"• *Alamat:* {address}\n"
        f"• *Jam Layanan:* Senin – Jumat (07.00 – 15.30 WIB)\n\n"
        f"_Sertakan nama lengkap siswa & kelas saat menghubungi Guru BK._",
        parse_mode="Markdown",
        reply_markup=buttons,
    )


async def text_menu_router(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    message = update.effective_message
    if not message or not message.text:
        return

    text = message.text.strip()

    if text == BTN_SEARCH_STUDENT:
        await cari_command_handler(update, context)
    elif text == BTN_BROWSE_CLASSES:
        await kelas_command_handler(update, context)
    elif text == BTN_ATTENDANCE_TODAY:
        await absensi_menu_handler(update, context)
    elif text == BTN_ATTENDANCE_HISTORY:
        await riwayat_menu_handler(update, context)
    elif text == BTN_BK_NOTES:
        await bk_menu_handler(update, context)
    elif text == BTN_CONTACT_BK:
        await contact_menu_handler(update, context)
    else:
        # Treat free text directly as student search (super intuitive for parents!)
        mode = context.user_data.get("awaiting_student_search", "overview")
        await run_student_search(update, context, text, mode=mode)
