# Aturan Bisnis (Business Rules) & Activity Diagrams
## SMK IPTEK SANGGABUANA

Dokumen ini menjelaskan logika bisnis dan alur kerja Sistem Informasi BK & Presensi Siswa.

---

## 1. Aturan Bisnis Presensi

### 1.1 Status Kehadiran
1. **Hadir**: Siswa hadir di sekolah pada jam pembelajaran.
2. **Sakit**: Siswa berhalangan karena kondisi kesehatan (disertai surat/keterangan).
3. **Izin**: Siswa berhalangan dengan pemberitahuan resmi dari orang tua.
4. **Alpa**: Siswa tidak hadir tanpa keterangan yang sah.

### 1.2 Rumus Perhitungan Kehadiran Fisik
$$\text{Persentase Kehadiran} = \frac{\text{Jumlah Hari Hadir}}{\text{Total Hari Sekolah dengan Presensi Difinalisasi}} \times 100\%$$

*Ketentuan:*
- Hari libur nasional atau non-sekolah pada kalender sekolah tidak dihitung sebagai ketidakhadiran.
- Data presensi yang belum diinput tidak otomatis dianggap sebagai Alpa sebelum batas waktu (cutoff) atau sebelum difinalisasi oleh petugas.

### 1.3 Activity Diagram Alur Presensi

```mermaid
flowchart TD
    Start([Mulai Presensi Kelas]) --> PilihKelasTanggal[Pilih Kelas & Tanggal Kalender Sekolah]
    PilihKelasTanggal --> LoadSiswa[Ambil Daftar Siswa Aktif di Rombel]
    LoadSiswa --> TampilTabel[Tampilkan Tabel Presensi Siswa]
    TampilTabel --> IsiStatus{Input Status Tiap Siswa}
    IsiStatus -->|Opsi Cepat| TandaiHadir[Klik Tombol Tandai Semua Hadir]
    IsiStatus -->|Manual| UbahStatus[Set Hadir / Sakit / Izin / Alpa & Catatan]
    TandaiHadir --> Review[Tinjau Ringkasan Jumlah Status]
    UbahStatus --> Review
    Review --> Konfirmasi{Konfirmasi Simpan?}
    Konfirmasi -->|Batal| TampilTabel
    Konfirmasi -->|Ya| DBTransaction[Jalankan Database Transaction di Backend]
    DBTransaction --> SimpanSnapshot[Simpan / Update Record Presensi dengan Snapshot class_id]
    SimpanSnapshot --> AuditPresensi[Catat Tindakan ke Audit Log]
    AuditPresensi --> Selesai([Presensi Tersimpan Sempurna])
```

---

## 2. Aturan Bisnis Pengaduan BK & Konseling

### 2.1 Alur Status Kasus
$$\text{Pending (Laporan Masuk)} \longrightarrow \text{Diproses (Dalam Bimbingan)} \longrightarrow \text{Selesai (Kasus Tuntas)}$$

- **Pending**: Kasus baru masuk dari laporan mandiri siswa atau wali kelas, menunggu telaah Guru BK.
- **Diproses**: Guru BK memverifikasi insiden, memanggil siswa, menjadwalkan konseling, atau memanggil orang tua.
- **Selesai**: Siswa telah mendapatkan pendampingan, membuat komitmen perbaikan, atau menyelesaikan sanksi edukatif.

### 2.2 Activity Diagram Alur Pengaduan BK

```mermaid
flowchart TD
    StartPengaduan([Pelaporan Insiden / Kasus]) --> InputForm[Isi Form: Siswa, Waktu, Kronologi, Bukti Foto/PDF]
    InputForm --> PilihPelanggaran[Pilih Kategori Pelanggaran]
    PilihPelanggaran --> SetVisibilitas[Tentukan Visibilitas Orang Tua - parent_visible]
    SetVisibilitas --> ValidasiBackend{Validasi Backend & Upload File Aman}
    ValidasiBackend -->|Gagal| NotifError[Tampilkan Error & Request ID]
    ValidasiBackend -->|Sukses| BuatKasus[Buat Record complaints + complaint_code Unik]
    BuatKasus --> SnapshotPoints[Simpan Poin Pelanggaran ke complaint_violations]
    SnapshotPoints --> NotifPending[Status: Pending]

    NotifPending --> GuruBKTinjau[Guru BK Menelaah Kasus]
    GuruBKTinjau --> UbahDiproses[Ubah Status: Diproses]
    UbahDiproses --> CatatHistoriStatus1[Simpan ke complaint_status_histories]

    UbahDiproses --> Bimbingan[Pelaksanaan Sesi Konseling / Pemanggilan]
    Bimbingan --> TambahFollowup[Catat Tindak Lanjut Baru ke case_followups]
    TambahFollowup --> EvaluasiKasus{Apakah Kasus Selesai?}
    EvaluasiKasus -->|Belum| Bimbingan
    EvaluasiKasus -->|Sudah| UbahSelesai[Ubah Status: Selesai + Catatan Penyelesaian]
    UbahSelesai --> CatatHistoriStatus2[Simpan ke complaint_status_histories]
    CatatHistoriStatus2 --> SelesaiKasus([Kasus Diarsipkan])
```

---

## 3. Aturan Bisnis Integrasi Bot Telegram & Verifikasi

### 3.1 Pencegahan Akses Ilegal (Zero Trust on Bot)
- Bot Telegram **TIDAK** boleh mengakses data siswa hanya berbekal NIS.
- Sekolah menerbitkan Kode Verifikasi acak sekali pakai (`parent_verification_codes`).
- Backend memvalidasi `hash(kode)`, tanggal kedaluwarsa, dan batas percobaan sebelum mengaitkan `parent_students`.

### 3.2 Sequence Diagram Verifikasi Orang Tua

```mermaid
sequenceDiagram
    autonumber
    actor Wali as Orang Tua / Wali
    participant Bot as Python Telegram Bot
    participant API as Laravel 13 API
    participant DB as MySQL Database

    Wali->>Bot: /verifikasi 2026001 ABC123
    Bot->>API: POST /api/v1/telegram-bot/verify (telegram_id, nis, code)
    API->>DB: Cari student berdasarkan NIS
    alt Siswa Tidak Ditemukan
        DB-->>API: NULL
        API-->>Bot: 404 Siswa tidak ditemukan
        Bot-->>Wali: ❌ NIS siswa tidak terdaftar
    else Siswa Ditemukan
        API->>DB: Validasi kode verifikasi aktif & belum expired
        alt Kode Tidak Cocok / Expired
            DB-->>API: Invalid Code
            API-->>Bot: 422 Kode tidak valid
            Bot-->>Wali: ❌ Kode verifikasi salah atau telah kedaluwarsa
        else Kode Valid
            API->>DB: Buat / Update relasi telegram_parents & parent_students
            API->>DB: Tandai kode used_at = NOW()
            API->>DB: Catat ke audit_logs
            DB-->>API: Sukses
            API-->>Bot: 200 OK (student_name, class_name)
            Bot-->>Wali: ✅ Verifikasi Berhasil! Akun terhubung dengan anak.
        end
    end
```
