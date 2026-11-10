# Panduan Presentasi Seminar Proposal & Demonstrasi KKP
## Sistem Informasi BK, Presensi Siswa & Integrasi Bot Telegram SMK IPTEK SANGGABUANA

Panduan ini disusun untuk membantu mahasiswa dalam mempresentasikan dan mendemonstrasikan aplikasi di hadapan dosen penguji.

---

## 1. Skenario Demonstrasi Live (Demo Flow)

### Skenario 1: Tinjauan Dashboard & Manajemen Master
1. **Login sebagai Administrator** (`admin@smkiptek.sch.id` / `password`).
2. Tunjukkan **Dashboard Interaktif**:
   - Jelaskan bahwa kartu KPI (Total Siswa: 270+, Total Rombel, Kehadiran Hari Ini) membaca database MySQL secara dinamis.
   - Perlihatkan grafik tren presensi Recharts dan log audit aktivitas terkini.
3. Buka **Data Siswa**:
   - Tunjukkan pencarian debounced nama dan NIS.
   - Tunjukkan fitur **Impor CSV** dan template resmi.
4. Buka **Master Pelanggaran**:
   - Jelaskan konsep **Point Snapshot** agar histori kasus lama tidak terganggu saat bobot poin diubah.

### Skenario 2: Pencatatan Presensi Massal Kelas (Wali Kelas)
1. **Login sebagai Wali Kelas** (`wali@smkiptek.sch.id` / `password`).
2. Masuk ke menu **Presensi Siswa**:
   - Pilih tanggal dan rombel kelas (misal: X RPL 1).
   - Tunjukkan tombol **Tandai Semua Hadir** untuk efisiensi pengisian.
   - Ubah status 1 siswa menjadi *Sakit* dan 1 siswa menjadi *Alpa* disertai keterangan.
   - Klik **Simpan Presensi** dan jelaskan bahwa sistem menggunakan **Database Transaction** agar data tersimpan aman secara utuh.
   - Tunjukkan perolehan persentase kehadiran fisik sesuai rumus resmi.

### Skenario 3: Alur Pengaduan BK & Bimbingan Konseling (Guru BK)
1. **Login sebagai Guru BK** (`gurubk@smkiptek.sch.id` / `password`).
2. Masuk ke menu **Pengaduan BK**:
   - Buka salah satu kasus dengan status *Pending*.
   - Ubah status menjadi *Diproses*, perlihatkan bahwa histori tercatat di tabel audit timeline.
   - Tambahkan **Tindak Lanjut Konseling** (misal: *Konseling Individual*).
   - Atur toggle **Terlihat oleh Orang Tua** menjadi aktif agar dapat dipantau wali di Telegram.

### Skenario 4: Pemantauan oleh Orang Tua via Bot Telegram
1. Buka aplikasi Telegram dan akses Bot sekolah.
2. Jalankan perintah `/start` untuk melihat panduan layanan.
3. Jalankan `/verifikasi 2026001 DEMO123` untuk menghubungkan akun wali dengan data anak.
4. Jalankan perintah `/masuk`:
   - Tunjukkan laporan status presensi hari ini lengkap dengan ikon 🟢 Hadir / 🟡 Sakit / 🔵 Izin / 🔴 Alpa dan rekap semester.
5. Jalankan `/kasus`:
   - Perlihatkan bahwa kasus yang diset `parent_visible = true` muncul secara ringkas dan aman.
   - Klik tombol **Hubungi Guru BK** untuk mendapatkan kontak resmi sekolah.

---

## 2. Antisipasi Pertanyaan Penguji & Jawaban Teknis

**T: Mengapa Bot Telegram tidak langsung membaca database MySQL agar lebih cepat?**  
> **J:** Demi prinsip *Zero Trust* dan keamanan data siswa. Jika bot terhubung langsung ke MySQL, kredensial database tersimpan di bot dan tidak ada layer otorisasi terpusat. Dengan melewati REST API Laravel, backend menjadi *Single Source of Truth* yang mengontrol validasi, role permissions, rate limiting, dan pencatatan audit log.

**T: Bagaimana sistem mencegah manipulasi poin pelanggaran pada kasus yang telah lampau?**  
> **J:** Sistem menerapkan arsitektur *Point Snapshot* pada tabel penghubung `complaint_violations`. Ketika jenis pelanggaran diubah bobotnya di master, kasus masa lalu tetap membaca nilai snapshot saat kejadian dicatat.

**T: Apa fungsi Request ID pada antarmuka frontend?**  
> **J:** Request ID (`X-Request-ID`) mengikat satu siklus request dari browser, middleware Laravel, hingga baris error log server. Jika pengguna mengalami kendala, mereka cukup menyalin Request ID tersebut dan tim teknis dapat melacak baris error query spesifik di log server dalam hitungan detik.

**T: Bagaimana jika presensi belum diinput oleh wali kelas? Apakah otomatis Alpa?**  
> **J:** Tidak. Sistem tidak mengasumsikan ketiadaan data sebagai Alpa sebelum periode difinalisasi atau melewati cutoff jadwal resmi kalender sekolah, guna menghindari kesalahan laporan akademik.
