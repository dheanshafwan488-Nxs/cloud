# Dokumentasi REST API v1
## Sistem Informasi BK & Presensi SMK IPTEK SANGGABUANA

Base URL: `http://localhost:8000/api/v1`  
Semua request API menerima dan mengembalikan format `application/json`.  
Setiap request wajib menyertakan atau akan menerima header `X-Request-ID`.

---

## 1. Format Standar Respons

### 1.1 Respons Berhasil (200 / 201)
```json
{
  "success": true,
  "message": "Data berhasil diambil.",
  "request_id": "req_8f142e09-b4ec-4f27-a068-07d0f9715568",
  "data": {},
  "meta": null
}
```

### 1.2 Respons Validasi Gagal (422 Unprocessable Entity)
```json
{
  "success": false,
  "message": "Data yang dikirim tidak valid.",
  "error_code": "VALIDATION_ERROR",
  "request_id": "req_8f142e09-b4ec-4f27-a068-07d0f9715568",
  "errors": {
    "nis": ["NIS sudah terdaftar di sistem."]
  }
}
```

### 1.3 Respons Akses Ditolak (403 Forbidden)
```json
{
  "success": false,
  "message": "Anda tidak memiliki wewenang untuk mengakses sumber daya ini.",
  "error_code": "FORBIDDEN",
  "request_id": "req_8f142e09-b4ec-4f27-a068-07d0f9715568",
  "errors": null
}
```

---

## 2. Rincian Endpoint Utama

### 2.1 Autentikasi
| Method | Endpoint | Role | Deskripsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/auth/csrf` | Publik | Inisialisasi CSRF cookie untuk Sanctum SPA |
| `POST` | `/api/v1/auth/login` | Publik | Autentikasi pengguna dengan email & password |
| `POST` | `/api/v1/auth/logout` | Authenticated | Menghapus token / sesi login |
| `GET` | `/api/v1/auth/me` | Authenticated | Mengambil profil pengguna yang sedang login |

### 2.2 Dashboard
| Method | Endpoint | Role | Deskripsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/dashboard/summary` | All Roles | Ringkasan KPI total siswa, kelas, presensi & pengaduan |
| `GET` | `/api/v1/dashboard/attendance-chart` | All Roles | Data grafik tren kehadiran harian untuk Recharts |
| `GET` | `/api/v1/dashboard/recent-activities` | Admin, Guru BK | Aktivitas audit log terbaru |

### 2.3 Siswa (Students)
| Method | Endpoint | Role | Deskripsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/students` | Admin, Guru BK, Wali | Daftar siswa dengan filter pencarian dan pagination |
| `POST` | `/api/v1/students` | Admin, Guru BK | Menambah data siswa baru |
| `GET` | `/api/v1/students/{id}` | All Roles | Detail profil siswa dan histori presensi |
| `PUT` | `/api/v1/students/{id}` | Admin, Guru BK | Memperbarui data siswa |
| `DELETE` | `/api/v1/students/{id}` | Admin | Menonaktifkan / mengarsipkan siswa |
| `POST` | `/api/v1/students/import` | Admin | Mengimpor berkas CSV data siswa massal |
| `GET` | `/api/v1/students/import-template`| Admin | Mengunduh berkas template CSV resmi |

### 2.4 Kelas & Tahun Ajaran
| Method | Endpoint | Role | Deskripsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/classes` | All Roles | Daftar rombongan belajar kelas |
| `POST` | `/api/v1/classes` | Admin, Guru BK | Menambah rombel kelas baru |
| `GET` | `/api/v1/classes/{id}/students` | All Roles | Mengambil seluruh siswa dalam satu kelas |
| `POST` | `/api/v1/classes/{id}/assignments`| Admin | Menugaskan wali kelas |
| `GET` | `/api/v1/academic-years` | All Roles | Daftar tahun ajaran sekolah |

### 2.5 Presensi (Attendances)
| Method | Endpoint | Role | Deskripsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/attendances` | All Roles | Filter presensi berdasarkan kelas & tanggal |
| `GET` | `/api/v1/attendances/today` | All Roles | Data presensi hari ini |
| `GET` | `/api/v1/attendances/class/{id}` | All Roles | Presensi satu kelas pada tanggal tertentu |
| `POST` | `/api/v1/attendances/bulk` | Admin, Wali, Guru BK | Simpan presensi massal via database transaction |
| `PATCH` | `/api/v1/attendances/{id}` | Admin, Wali Kelas | Mengoreksi satu entri presensi siswa |
| `POST` | `/api/v1/attendances/{id}/finalize` | Admin, Wali Kelas | Memfinalisasi status presensi harian |
| `GET` | `/api/v1/attendances/export` | Admin, Guru BK, Wali | Ekspor rekap presensi format CSV |

### 2.6 Master Pelanggaran (Violations)
| Method | Endpoint | Role | Deskripsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/violations` | All Roles | Daftar referensi pelanggaran tata tertib |
| `POST` | `/api/v1/violations` | Admin, Guru BK | Menambah referensi pelanggaran baru |
| `PUT` | `/api/v1/violations/{id}` | Admin, Guru BK | Memperbarui nama/poin master |
| `DELETE` | `/api/v1/violations/{id}` | Admin, Guru BK | Mengarsipkan jenis pelanggaran |

### 2.7 Pengaduan & Kasus BK (Complaints)
| Method | Endpoint | Role | Deskripsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/complaints` | All Roles | Daftar kasus (dibatasi sesuai hak akses) |
| `POST` | `/api/v1/complaints` | All Roles | Membuat pengaduan baru + upload berkas bukti |
| `GET` | `/api/v1/complaints/{id}` | All Roles | Detail kasus, kronologi, bukti, dan tindak lanjut |
| `POST` | `/api/v1/complaints/{id}/status` | Admin, Guru BK | Mengubah status (Pending ➔ Diproses ➔ Selesai) |
| `POST` | `/api/v1/complaints/{id}/followups`| Admin, Guru BK | Menambah catatan tindak lanjut bimbingan |
| `GET` | `/api/v1/complaints/{id}/attachments/{attId}` | Authorized | Mengunduh file bukti secara aman |

### 2.8 Bot Telegram Internal Service
Semua endpoint ini dilindungi oleh header `X-Bot-Service-Token`.
| Method | Endpoint | Deskripsi |
| :--- | :--- | :--- |
| `POST` | `/api/v1/telegram-bot/verify` | Memverifikasi akun orang tua dengan NIS dan kode resmi |
| `POST` | `/api/v1/telegram-bot/unverify` | Memutuskan relasi akun wali murid dengan siswa |
| `GET` | `/api/v1/telegram-bot/parent/{id}/profile` | Profil wali dan daftar anak yang terhubung |
| `GET` | `/api/v1/telegram-bot/parent/{id}/attendance/today` | Presensi anak hari ini dengan rekapitulasi |
| `GET` | `/api/v1/telegram-bot/parent/{id}/attendance/history` | 10 histori kehadiran terbaru anak |
| `GET` | `/api/v1/telegram-bot/parent/{id}/cases` | Kasus yang berstatus `parent_visible = true` |
| `GET` | `/api/v1/telegram-bot/contact` | Kontak resmi Guru BK dari konfigurasi sistem |
| `GET` | `/api/v1/telegram-bot/teacher/{id}/rekap` | Rekapitulasi kelas untuk akun wali kelas terverifikasi |
