# Sistem Informasi Bimbingan Konseling (BK), Presensi Siswa & Integrasi Bot Telegram
## SMK IPTEK SANGGABUANA

Aplikasi web terpadu dan Bot Telegram resmi yang dikembangkan untuk memfasilitasi administrasi sekolah, pencatatan presensi siswa harian, pengelolaan kasus kedisiplinan dan bimbingan konseling, serta pemantauan transparan oleh orang tua/wali murid secara aman.

---

## 🏗️ Arsitektur Teknologi

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + TanStack Query + Recharts + Lucide React.
- **Backend**: Laravel 13 (PHP 8.3+) + Sanctum + Eloquent ORM + Policies + Form Requests.
- **Database**: MySQL 8.4 LTS (`bk_presensi_smk`) dengan InnoDB engine, Foreign Keys, dan Unique Constraints.
- **Bot Telegram**: Python 3.11+ (`python-telegram-bot` v21+) dengan arsitektur async/await dan integrasi REST API murni (tanpa koneksi langsung ke MySQL).

---

## 📁 Struktur Repositori

```text
bk-presensi-smk/
├── frontend/               # Single Page Application (React + Vite + TypeScript)
│   ├── src/
│   │   ├── api/            # Axios client, endpoints, dan Request ID generator
│   │   ├── components/     # Komponen UI bersama, DataTable, FormField, Toast
│   │   ├── layouts/        # Sidebar responsif, Navbar, ProtectedRoute, RoleGuard
│   │   ├── pages/          # Dashboard, Siswa, Kelas, Presensi, BK, Laporan, Pengguna
│   │   ├── services/       # Komunikasi layer API Laravel
│   │   └── types/          # TypeScript definitions
│   └── package.json
│
├── backend/                # REST API Laravel 13
│   ├── app/
│   │   ├── Http/Controllers/Api/V1/ # Controller resource lengkap
│   │   ├── Middleware/     # RequestIdMiddleware & BotServiceTokenMiddleware
│   │   ├── Models/         # Model Eloquent dan relasi database
│   │   └── Services/       # Business logic presensi, audit, dan pengaduan
│   ├── database/
│   │   ├── migrations/     # Migration skema database lengkap
│   │   └── seeders/        # Seeder data realistis 270+ siswa & akun demo
│   └── routes/api.php      # Definisi seluruh rute API /api/v1
│
├── telegram-bot/           # Layanan Bot Telegram untuk Wali Murid
│   ├── handlers/           # /start, /verifikasi, /masuk, /absen, /kasus, /bantuan
│   ├── services/           # HTTP API client ke Laravel
│   ├── tests/              # Unit testing verifikasi dan otorisasi
│   ├── bot_telegram.py     # Setup aplikasi bot dan error handler
│   └── main.py             # Entry point service polling
│
├── docs/                   # Berkas Dokumentasi KKP & Seminar Proposal
│   ├── arsitektur.md       # Diagram sistem, use case, sequence Request ID
│   ├── database-erd.md     # Mermaid ERD dan integritas tabel
│   ├── api-documentation.md# Rincian seluruh endpoint REST API
│   ├── business-rules.md   # Activity diagram presensi & alur pengaduan
│   ├── testing.md          # Matriks skenario uji dan laporan status
│   └── panduan-seminar.md  # Naskah demo dan FAQ pertanyaan penguji
│
├── .gitignore
└── README.md
```

---

## 🔑 Kredensial Akun Demo (Development & Sempro)

Semua akun demo di bawah ini telah disiapkan oleh `DatabaseSeeder`:

| Peran / Role | Alamat Email | Kata Sandi | Akses Utama |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@smkiptek.sch.id` | `password` | Seluruh dashboard, kelola rombel, siswa, pengguna sistem |
| **Guru BK** | `gurubk@smkiptek.sch.id` | `password` | Master pelanggaran, pengaduan kasus, tindak lanjut konseling |
| **Wali Kelas** | `wali@smkiptek.sch.id` | `password` | Input presensi massal kelas, rekap kehadiran siswa |
| **Siswa** | `siswa@smkiptek.sch.id` | `password` | Mengajukan aduan/konseling mandiri |

*Catatan Demonstrasi Telegram*: Gunakan NIS `2026001` dan Kode Verifikasi `DEMO123` untuk menguji perintah `/verifikasi`.

---

## 🚀 Panduan Instalasi & Menjalankan (macOS & Windows)

### 1. Prasyarat Sistem
- PHP >= 8.3 & Composer
- Node.js >= 18.x & npm
- MySQL Server 8.4 LTS
- Python >= 3.11 & pip

---

### 2. Konfigurasi Backend (Laravel)
```bash
# Masuk ke direktori backend
cd backend

# Salin konfigurasi environment
cp .env.example .env

# Sesuaikan kredensial MySQL pada .env (DB_DATABASE=bk_presensi_smk, DB_USERNAME, DB_PASSWORD)

# Install dependensi PHP
composer install

# Generate application encryption key
php artisan key:generate

# Jalankan migrasi dan seeder data awal (270+ siswa & akun demo)
php artisan migrate:fresh --seed

# Jalankan server API Laravel (Port 8000)
php artisan serve
```

---

### 3. Konfigurasi Frontend (React + Vite)
Buka terminal baru:
```bash
# Masuk ke direktori frontend
cd frontend

# Salin konfigurasi environment
cp .env.example .env

# Install dependensi modul
npm install

# Jalankan Vite development server
npm run dev
```
Akses aplikasi melalui browser di: `http://localhost:5173`.

---

### 4. Konfigurasi Bot Telegram (Python)
Buka terminal baru:
```bash
# Masuk ke direktori bot
cd telegram-bot

# Salin konfigurasi environment
cp .env.example .env

# Buat virtual environment (opsional namun disarankan)
python3 -m venv venv
source venv/bin/activate  # Di Windows: venv\Scripts\activate

# Install dependensi Python
pip install -r requirements.txt

# Masukkan token bot Telegram dari @BotFather ke file .env
# Jalankan bot service
python3 main.py
```

---

## 🧪 Pengujian Otomatis

1. **Menjalankan Unit Test Bot Telegram**:
   ```bash
   cd telegram-bot
   python3 -m unittest tests/test_bot.py
   ```
2. **Menjalankan Test Backend Laravel**:
   ```bash
   cd backend
   php artisan test
   ```

---

## 📐 Rumus Perhitungan Kehadiran Fisik Resmi
$$\text{Persentase Kehadiran} = \frac{\text{Jumlah Hari Hadir}}{\text{Total Hari Sekolah dengan Presensi Difinalisasi}} \times 100\%$$

Hari libur resmi kalender sekolah tidak dihitung sebagai ketidakhadiran.

---

## 🛡️ Pelacakan Error via Request ID
Setiap request HTTP membawa header `X-Request-ID`. Jika terjadi kendala pada antarmuka web, klik tombol **Salin Request ID** pada banner notifikasi, lalu cari ID tersebut pada berkas log backend:
```bash
grep "req_xxxx" backend/storage/logs/laravel.log
```

---

## 📚 Berkas Dokumentasi Tambahan
- [Arsitektur Sistem & Use Case](file:///Users/muhammadshafwan/cloud/bk-presensi-smk/docs/arsitektur.md)
- [Database ERD & Constraints](file:///Users/muhammadshafwan/cloud/bk-presensi-smk/docs/database-erd.md)
- [Dokumentasi REST API](file:///Users/muhammadshafwan/cloud/bk-presensi-smk/docs/api-documentation.md)
- [Aturan Bisnis & Activity Diagram](file:///Users/muhammadshafwan/cloud/bk-presensi-smk/docs/business-rules.md)
- [Laporan Pengujian](file:///Users/muhammadshafwan/cloud/bk-presensi-smk/docs/testing.md)
- [Panduan Presentasi Sempro & KKP](file:///Users/muhammadshafwan/cloud/bk-presensi-smk/docs/panduan-seminar.md)
