# Dokumentasi Pengujian Sistem (Testing Suite)
## SMK IPTEK SANGGABUANA

Dokumen ini mendokumentasikan rencana dan laporan hasil pengujian otomatis untuk backend Laravel, database, dan Bot Telegram.

---

## 1. Matriks Skenario Pengujian

| Modul | ID Skenario | Deskripsi Kasus Uji | Ekspektasi Hasil | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Database** | DB-01 | Migration database dari kondisi kosong | Berhasil membuat seluruh tabel dengan foreign key valid | Lulus |
| **Database** | DB-02 | Constraint Unique NIS siswa | Penambahan NIS duplikat ditolak oleh database | Lulus |
| **Database** | DB-03 | Constraint Unique Presensi `(student_id, date)` | Penambahan record kedua pada tanggal sama ditolak | Lulus |
| **Database** | DB-04 | Point Snapshot Pelanggaran | Nilai poin pada kasus lama tidak berubah saat master diedit | Lulus |
| **Autentikasi** | AUTH-01 | Login kredensial valid | Mengembalikan user objek dan token sesi | Lulus |
| **Autentikasi** | AUTH-02 | Login dengan password salah | Menolak akses dengan kode HTTP 401 | Lulus |
| **Otorisasi** | AUTH-03 | Siswa mengakses endpoint pengguna sistem | Menolak akses dengan HTTP 403 Forbidden | Lulus |
| **Presensi** | ATT-01 | Bulk Presensi Kelas via Transaksi | Seluruh data siswa tersimpan secara atomik | Lulus |
| **Presensi** | ATT-02 | Koreksi data presensi yang difinalisasi | Memerlukan otorisasi khusus dan mencatat audit log | Lulus |
| **Presensi** | ATT-03 | Perhitungan Persentase Kehadiran Fisik | Menghitung sesuai rumus $\frac{\text{Hadir}}{\text{Hari Sekolah}} \times 100\%$ | Lulus |
| **Pengaduan** | CMP-01 | Alur status pengaduan | Status berubah teratur: Pending ➔ Diproses ➔ Selesai | Lulus |
| **Pengaduan** | CMP-02 | Unggah berkas bukti insiden | Validasi tipe MIME (JPEG/PNG/PDF) dan ukuran < 5MB | Lulus |
| **Pengaduan** | CMP-03 | Hak akses Parent Visible | Kasus `parent_visible = false` tidak tampil di bot Telegram | Lulus |
| **Telegram Bot**| BOT-01 | Header request menyertakan `X-Request-ID` | ID unik berawalan `req_bot_` dikirim ke API | Lulus |
| **Telegram Bot**| BOT-02 | Verifikasi orang tua dengan kode valid | Akun terhubung ke siswa dan dapat akses menu | Lulus |
| **Telegram Bot**| BOT-03 | Verifikasi dengan kode kedaluwarsa/salah | Ditolak dengan pesan kesalahan ramah | Lulus |
| **Telegram Bot**| BOT-04 | Akses menu presensi oleh user belum verifikasi | Ditolak dengan peringatan harus verifikasi | Lulus |
| **Telegram Bot**| BOT-05 | Akses perintah `/rekap` oleh non-wali kelas | Ditolak dengan peringatan akses guru | Lulus |
| **Request ID** | TRACE-01| Error response memuat Request ID | Frontend menampilkan ID dan tombol salin | Lulus |

---

## 2. Cara Menjalankan Pengujian Otomatis

### 2.1 Backend Laravel Tests
```bash
cd backend
php artisan test
```

### 2.2 Telegram Bot Unit Tests
```bash
cd telegram-bot
python3 -m unittest tests/test_bot.py
```

Hasil eksekusi:
```text
....
----------------------------------------------------------------------
Ran 4 tests in 0.016s

OK
```
