# Frontend Web Application - Sistem Informasi BK & Presensi Siswa SMK IPTEK SANGGABUANA

Antarmuka web modern dibangun menggunakan React, TypeScript, Vite, Tailwind CSS, TanStack Query, dan Recharts.

## Fitur Utama
1. **Autentikasi & Role-Based Guard**: Admin, Guru BK, Wali Kelas, dan Siswa dengan pemisahan akses yang ketat.
2. **Dashboard Interaktif**: Statistik real-time, grafik tren kehadiran harian, dan audit aktivitas terkini.
3. **Data Siswa & Impor CSV**: Kelola rombel, NIS, filter kelas, dan parser berkas CSV dengan live error diagnosis.
4. **Presensi Siswa Harian**: Dukungan bulk save melalui transaksi database aman, quick status selection, dan rekapitulasi.
5. **Manajemen Kasus & Pengaduan BK**: Alur status (Pending ➔ Diproses ➔ Selesai), catatan tindak lanjut bimbingan, attachment file, dan privasi orang tua (Parent Visible).
6. **Master Pelanggaran & Poin**: Sistem Point Snapshot untuk menjaga integritas data historis.
7. **Laporan & Ekspor**: Rumus kehadiran fisik resmi, rekap per kelas, dan unduhan berkas CSV.
8. **End-to-End Request ID**: Header `X-Request-ID` unik di setiap request untuk memudahkan penelusuran log backend.

## Menjalankan di Lingkungan Lokal
```bash
# Masuk ke folder frontend
cd frontend

# Salin konfigurasi environment
cp .env.example .env

# Install dependensi
npm install

# Jalankan server pengembangan Vite
npm run dev
```

Aplikasi akan berjalan di `http://localhost:5173`. Pastikan backend Laravel berjalan di port 8000.
