# Arsitektur Sistem Informasi BK & Presensi SMK IPTEK SANGGABUANA

Dokumen ini disusun untuk keperluan Kuliah Kerja Praktik (KKP) dan Seminar Proposal (Sempro).

---

## 1. Latar Belakang & Tujuan
SMK IPTEK SANGGABUANA membutuhkan sistem informasi terpadu untuk pencatatan presensi kehadiran siswa harian dan penanganan kasus Bimbingan Konseling (BK) yang terhubung langsung dengan Orang Tua/Wali murid melalui Bot Telegram secara aman dan menjaga kerahasiaan data siswa.

Tujuan utama sistem:
1. Mengotomatiskan rekapitulasi kehadiran fisik dengan rumus standar akademik.
2. Mencatat siklus penanganan kasus BK secara transparan (Pending ➔ Diproses ➔ Selesai).
3. Memberikan akses notifikasi dan pengecekan kehadiran kepada orang tua tanpa memberikan akses bebas ke seluruh database sekolah.
4. Menerapkan pelacakan error end-to-end melalui `X-Request-ID`.

---

## 2. Diagram Arsitektur Sistem

```mermaid
graph TD
    subgraph ClientLayer["Client Layer"]
        Browser["React 18 SPA (Vite + TS)<br/>Admin / Guru BK / Wali / Siswa"]
        Telegram["Telegram App<br/>Orang Tua / Wali Murid"]
    end

    subgraph ServiceLayer["Application & Bot Layer"]
        LaravelAPI["Laravel 13 REST API (/api/v1)<br/>Sanctum Auth & Policies & Audit"]
        PythonBot["Telegram Bot Service (Python 3.11)<br/>python-telegram-bot v21"]
    end

    subgraph DataLayer["Storage Layer"]
        MySQL[("MySQL 8.4 LTS<br/>Database: bk_presensi_smk")]
        Storage["Private Storage<br/>(Bukti Kasus & Lampiran)"]
    end

    Browser -->|HTTP/JSON + Cookies + X-Request-ID| LaravelAPI
    Telegram -->|Telegram Bot API| PythonBot
    PythonBot -->|REST API + X-Bot-Service-Token| LaravelAPI
    LaravelAPI -->|Eloquent ORM & Transactions| MySQL
    LaravelAPI -->|Authorized File Storage| Storage
```

---

## 3. Use Case Diagram

```mermaid
graph LR
    Admin((Admin))
    GuruBK((Guru BK))
    WaliKelas((Wali Kelas))
    Siswa((Siswa))
    OrangTua((Orang Tua))

    subgraph SistemBK["Sistem Informasi BK & Presensi"]
        UC1[Kelola Pengguna & Penugasan]
        UC2[Kelola Data Siswa & Rombel]
        UC3[Input & Bulk Presensi Kelas]
        UC4[Kelola Master Pelanggaran & Poin]
        UC5[Buat Pengaduan & Unggah Bukti]
        UC6[Tindak Lanjut & Konseling]
        UC7[Rekapitulasi & Ekspor Laporan]
        UC8[Verifikasi Akun Telegram via Kode]
        UC9[Cek Presensi & Kasus via Telegram]
    end

    Admin --> UC1
    Admin --> UC2
    Admin --> UC3
    Admin --> UC7

    GuruBK --> UC4
    GuruBK --> UC5
    GuruBK --> UC6
    GuruBK --> UC7

    WaliKelas --> UC3
    WaliKelas --> UC7

    Siswa --> UC5

    OrangTua --> UC8
    OrangTua --> UC9
```

---

## 4. Sequence Diagram Pelacakan Error End-to-End (Request ID)

```mermaid
sequenceDiagram
    autonumber
    actor User as Pengguna
    participant Frontend as React Client
    participant Middleware as RequestIdMiddleware
    participant Controller as Laravel Controller
    participant Logger as Log & Audit System

    User->>Frontend: Klik Aksi / Kirim Formulir
    Frontend->>Frontend: Generate Request ID unik (req_uuid)
    Frontend->>Middleware: HTTP Request + Header [X-Request-ID: req_uuid]
    Middleware->>Logger: Set log context [request_id = req_uuid]
    Middleware->>Controller: Teruskan request yang divalidasi
    alt Operasi Berhasil
        Controller-->>Middleware: 200 OK + Data
        Middleware-->>Frontend: 200 OK + Header [X-Request-ID] + body.request_id
        Frontend-->>User: Tampilkan notifikasi sukses
    else Terjadi Exception / Error
        Controller->>Logger: Log error detail + stack trace aman dengan context req_uuid
        Controller-->>Middleware: 4xx / 5xx JSON Error Response
        Middleware-->>Frontend: Header [X-Request-ID: req_uuid] + body.request_id
        Frontend-->>User: Tampilkan Alert Error + Tombol Salin Request ID
        User->>User: Salin Request ID untuk dilaporkan ke Administrator
    end
```

---

## 5. Kebutuhan Fungsional & Nonfungsional

### Kebutuhan Fungsional
1. **Autentikasi & Otorisasi**: Role Admin, Guru BK, Wali Kelas, dan Siswa dengan Policy backend.
2. **Presensi Massal**: Input presensi per kelas dengan status Hadir, Sakit, Izin, Alpa menggunakan transaksi database.
3. **Pengaduan & Konseling**: Pencatatan kasus dengan `complaint_code`, upload berkas bukti, histori status, dan tindak lanjut rahasia.
4. **Verifikasi Wali Telegram**: Verifikasi 2 faktor menggunakan NIS dan kode pairing sekali pakai dari sekolah.
5. **Rumus Kehadiran**: Persentase Kehadiran = Hadir / Hari Sekolah Difinalisasi x 100%.

### Kebutuhan Nonfungsional
1. **Keamanan Data**: Bot Telegram dilarang mengakses MySQL secara langsung; seluruh akses harus melewati API Laravel dengan token terisolasi.
2. **Kerahasiaan Privasi**: Flag `parent_visible` membatasi catatan konseling rahasia agar tidak bocor ke publik atau bot.
3. **Audit Trail**: Seluruh operasi perubahan presensi, status pengaduan, dan pengguna dicatat di tabel `audit_logs`.
4. **Kinerja & Skalabilitas**: Frontend menggunakan caching TanStack Query dan debounced searching.
