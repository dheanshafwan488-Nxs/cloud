from telegram import Update
from telegram.ext import ContextTypes
from services.api_service import TelegramApiService

async def start_handler(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    name = user.first_name if user else "Bapak/Ibu"

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
                    code=code
                )

                if resp.get("success"):
                    data = resp.get("data", {})
                    student_name = data.get("student_name", "Siswa")
                    class_name = data.get("class_name", "-")

                    await update.message.reply_text(
                        f"🎉 *Verifikasi Berhasil Melalui Tautan!*\n\n"
                        f"Akun Telegram Anda kini resmi terhubung dengan:\n"
                        f"👤 *Nama Siswa:* {student_name}\n"
                        f"🔢 *NIS:* `{nis}`\n"
                        f"🏫 *Kelas:* {class_name}\n\n"
                        f"🔔 *Notifikasi Proaktif Aktif:* Anda akan otomatis menerima pemberitahuan setiap ada catatan ketidakhadiran (Alpa/Sakit/Izin) atau laporan bimbingan konseling dari sekolah.\n\n"
                        f"Perintah cepat:\n"
                        f"• `/masuk` — Cek status kehadiran hari ini\n"
                        f"• `/absen` — Riwayat presensi\n"
                        f"• `/kasus` — Catatan bimbingan konseling\n"
                        f"• `/bantuan` — Kontak Guru BK & sekolah",
                        parse_mode="Markdown"
                    )
                    return
                else:
                    err_msg = resp.get("message", "Kode pada tautan verifikasi tidak valid atau kedaluwarsa.")
                    await update.message.reply_text(
                        f"❌ *Gagal Terhubung Melalui Tautan*\n\n{err_msg}\n\n"
                        f"Silakan hubungi Wali Kelas anak Anda untuk mendapatkan kode verifikasi baru, atau ketik manual: `/verifikasi <NIS> <KODE>`.",
                        parse_mode="Markdown"
                    )
                    return

    message = (
        f"👋 *Selamat Datang di Bot Resmi SMK IPTEK SANGGABUANA*, {name}!\n\n"
        "Layanan ini memfasilitasi pemantauan presensi dan informasi bimbingan konseling "
        "siswa oleh Orang Tua / Wali Murid secara terverifikasi dan aman.\n\n"
        "📋 *Daftar Perintah yang Tersedia:*\n"
        "• `/verifikasi <NIS> <KODE>` — Verifikasi akun orang tua dengan kode resmi sekolah\n"
        "• `/profil` — Lihat data siswa yang telah terhubung\n"
        "• `/masuk` — Cek status presensi anak hari ini\n"
        "• `/absen` — Lihat 10 riwayat kehadiran anak terakhir\n"
        "• `/kasus` — Informasi laporan kasus / bimbingan konseling yang terbuka\n"
        "• `/rekap` — Rekap presensi kelas (khusus guru/wali kelas)\n"
        "• `/batal_verifikasi` — Putuskan hubungan akun dengan data anak\n"
        "• `/bantuan` — Kontak resmi Bimbingan Konseling & pihak sekolah\n\n"
        "🔒 _Untuk menjaga privasi siswa, data kehadiran dan kasus hanya dapat diakses setelah akun terverifikasi._"
    )
    await update.message.reply_text(message, parse_mode="Markdown")
