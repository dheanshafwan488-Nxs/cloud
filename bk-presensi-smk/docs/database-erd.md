# Database Entity Relationship Diagram (ERD) & Skema Data
## SMK IPTEK SANGGABUANA (Database: `bk_presensi_smk`)

Dokumen ini mendeskripsikan struktur relasional MySQL 8.4 LTS untuk Sistem Informasi BK & Presensi Siswa.

---

## 1. Diagram ERD Lengkap (Mermaid)

```mermaid
erDiagram
    users ||--o{ class_assignments : "assigned_as"
    users ||--o{ audit_logs : "creates"
    users ||--o{ case_followups : "writes"
    users ||--o{ complaint_status_histories : "updates"

    academic_years ||--o{ classes : "has"
    academic_years ||--o{ school_calendar : "schedules"

    classes ||--o{ students : "enrolled_in"
    classes ||--o{ class_assignments : "assigned_to"
    classes ||--o{ attendances : "snapshot_class"
    classes ||--o{ complaints : "snapshot_class"

    students ||--o{ attendances : "recorded"
    students ||--o{ complaints : "reported_for"
    students ||--o{ parent_students : "has_parent"
    students ||--o{ parent_verification_codes : "issued_for"

    violations ||--o{ complaint_violations : "categorized"
    complaints ||--o{ complaint_violations : "has_violation"
    complaints ||--o{ complaint_attachments : "has_evidence"
    complaints ||--o{ complaint_status_histories : "status_track"
    complaints ||--o{ case_followups : "counseled"

    telegram_parents ||--o{ parent_students : "connected_to"
    telegram_parents ||--o{ telegram_notification_logs : "notified"

    users {
        bigint id PK
        string name
        string email UK
        string password
        enum role
        boolean is_active
        datetime created_at
    }

    academic_years {
        bigint id PK
        string label
        date start_date
        date end_date
        boolean is_active
    }

    classes {
        bigint id PK
        bigint academic_year_id FK
        string name
        enum grade_level
        boolean is_active
    }

    students {
        bigint id PK
        bigint user_id FK
        string nis UK
        string nisn UK
        string name
        enum gender
        date birth_date
        bigint class_id FK
        enum enrollment_status
    }

    attendances {
        bigint id PK
        bigint student_id FK
        bigint class_id FK
        date date
        enum status
        text notes
        bigint recorded_by FK
        datetime finalized_at
    }

    violations {
        bigint id PK
        string name UK
        text description
        int points
        boolean is_active
    }

    complaints {
        bigint id PK
        string complaint_code UK
        bigint student_id FK
        bigint class_id FK
        bigint reported_by_user_id FK
        text chronology
        datetime incident_at
        enum status
        bigint assigned_to FK
        boolean parent_visible
        datetime resolved_at
    }

    complaint_violations {
        bigint id PK
        bigint complaint_id FK
        bigint violation_id FK
        int points_snapshot
    }

    case_followups {
        bigint id PK
        bigint complaint_id FK
        bigint user_id FK
        string followup_type
        text notes
        boolean parent_visible
        datetime followed_up_at
    }

    telegram_parents {
        bigint id PK
        bigint telegram_id UK
        string parent_name
        boolean is_verified
        datetime verified_at
    }

    parent_students {
        bigint id PK
        bigint parent_id FK
        bigint student_id FK
        string relationship_type
        datetime verified_at
    }

    parent_verification_codes {
        bigint id PK
        bigint student_id FK
        string code_hash
        datetime expires_at
        datetime used_at
        int attempts_count
    }
```

---

## 2. Integritas Relasi & Constraint Penting

1. **Aturan Unique Presensi Siswa**:
   - `UNIQUE(student_id, date)` pada tabel `attendances` menjamin satu siswa tidak dapat memiliki 2 record presensi pada tanggal yang sama.
2. **Snapshot Class ID**:
   - Tabel `attendances` dan `complaints` menyimpan snapshot `class_id` saat presensi atau insiden dicatat, sehingga mutasi/kenaikan kelas siswa di masa depan tidak merusak laporan historis.
3. **Point Snapshot Pelanggaran**:
   - Tabel penghubung `complaint_violations` menyimpan kolom `points_snapshot` dari tabel `violations`. Ketika bobot master pelanggaran diubah oleh Guru BK, nilai poin kasus terdahulu tidak terpengaruh.
4. **Verifikasi Orang Tua Dua Faktor**:
   - Kolom `code_hash` menyimpan nilai SHA-256 / bcrypt dari kode verifikasi. Kolom `expires_at`, `used_at`, dan `attempts_count` mencegah serangan brute-force dan replay attacks.
5. **Privasi Kasus (Parent Visible)**:
   - Kolom boolean `parent_visible` pada `complaints` dan `case_followups` mengontrol secara presisi apakah laporan tersebut dapat ditarik oleh bot Telegram orang tua.
