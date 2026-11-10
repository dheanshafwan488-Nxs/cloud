// Tipe respons API standar
export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  request_id: string | null
  data: T
  meta?: PaginationMeta | null
  errors?: Record<string, string[]> | null
  error_code?: string
}

export interface PaginationMeta {
  current_page: number
  last_page: number
  total: number
  per_page: number
}

export interface ApiError {
  success: false
  message: string
  error_code?: string
  request_id?: string | null
  errors?: Record<string, string[]>
}

// Auth
export interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'guru_bk' | 'wali_kelas' | 'siswa'
  is_active: boolean
  created_at: string
}

// Academic Year
export interface AcademicYear {
  id: number
  label: string
  start_date: string
  end_date: string
  is_active: boolean
}

// Class
export interface SchoolClass {
  id: number
  academic_year_id: number
  name: string
  grade_level: 'X' | 'XI' | 'XII'
  is_active: boolean
  students_count?: number
  academic_year?: AcademicYear
}

// Student
export interface Student {
  id: number
  nis: string
  nisn?: string
  name: string
  gender?: 'L' | 'P'
  birth_date?: string
  class_id: number
  enrollment_status: 'aktif' | 'lulus' | 'pindah' | 'nonaktif'
  class?: SchoolClass
}

// Attendance
export type AttendanceStatus = 'Hadir' | 'Sakit' | 'Izin' | 'Alpa'
export interface Attendance {
  id: number
  student_id: number
  class_id: number
  date: string
  status: AttendanceStatus
  notes?: string
  recorded_by?: number
  finalized_at?: string
  student?: Student
  class?: SchoolClass
}

// Violation
export interface Violation {
  id: number
  name: string
  description?: string
  points: number
  is_active: boolean
}

// Complaint
export type ComplaintStatus = 'Pending' | 'Diproses' | 'Selesai'
export interface Complaint {
  id: number
  complaint_code: string
  student_id: number
  class_id: number
  chronology: string
  incident_at: string
  status: ComplaintStatus
  parent_visible: boolean
  assigned_to?: number
  resolved_at?: string
  created_at: string
  student?: Student
  class?: SchoolClass
  violations?: Violation[]
  assigned_to_user?: User
  student_name?: string
  class_name?: string
}

export interface ComplaintStatusHistory {
  id: number
  complaint_id: number
  old_status?: string
  new_status: string
  note?: string
  changed_by?: User
  created_at: string
}

export interface CaseFollowup {
  id: number
  complaint_id: number
  user_id: number
  followup_type: string
  notes: string
  parent_visible: boolean
  followed_up_at: string
  user?: User
}

export interface ComplaintAttachment {
  id: number
  complaint_id: number
  original_name: string
  mime_type: string
  file_size: number
  uploaded_by?: User
  created_at: string
}

// Early Warnings
export interface CriticalAttendanceItem {
  id: number
  name: string
  nis: string
  class_name: string
  alpa_count: number
  warning: string
  level: 'warning' | 'critical'
}

export interface CriticalViolationItem {
  id: number
  name: string
  nis: string
  class_name: string
  total_points: number
  level: 'warning' | 'danger' | 'critical'
  sanction_tier: string
}

export interface UrgentComplaintItem {
  id: number
  complaint_code: string
  student_name: string
  class_name: string
  incident_at: string
  days_waiting: number
  chronology: string
}

export interface EarlyWarningsSummary {
  critical_attendance: CriticalAttendanceItem[]
  critical_violations: CriticalViolationItem[]
  urgent_complaints: UrgentComplaintItem[]
  total_alerts: number
}

// Dashboard
export interface DashboardSummary {
  total_students: number
  total_classes: number
  attendance_today: {
    hadir: number
    sakit: number
    izin: number
    alpa: number
  }
  complaints: {
    pending: number
    diproses: number
    selesai: number
  }
  early_warnings?: EarlyWarningsSummary
}

// Filters
export interface StudentFilters {
  search?: string
  class_id?: number | ''
  status?: string
  per_page?: number
  page?: number
  all?: boolean
}

export interface AttendanceFilters {
  date_from?: string
  date_to?: string
  class_id?: number | ''
  student_id?: number | ''
  status?: AttendanceStatus | ''
  per_page?: number
  page?: number
}

export interface ComplaintFilters {
  search?: string
  status?: ComplaintStatus | ''
  class_id?: number | ''
  date_from?: string
  date_to?: string
  per_page?: number
  page?: number
}

// School Settings
export interface SchoolSettings {
  school_name: string
  school_address?: string
  school_phone?: string
  school_email?: string
  cutoff_time?: string
  active_academic_year?: string
}

// Profile
export interface UpdateProfilePayload {
  name: string
  email: string
  current_password?: string
  password?: string
  password_confirmation?: string
}

// Parent Telegram Verification
export interface LinkedParent {
  id: number
  telegram_id: number
  parent_name: string
  is_verified: boolean
  verified_at?: string
  last_interaction_at?: string
}

export interface ParentVerificationData {
  student_id: number
  student_name: string
  nis: string
  class_name: string
  code: string
  expires_at: string
  expires_at_formatted: string
  bot_username: string
  deep_link: string
  qr_link: string
  manual_command: string
  parents: LinkedParent[]
  is_connected: boolean
}

// Official BK Letters (Surat Panggilan & SP)
export interface OfficialLetterData {
  letter_number: string
  letter_type: 'panggilan' | 'sp1' | 'sp2' | 'sp3'
  letter_title: string
  issued_date: string
  school: {
    name: string
    npsn: string
    akreditasi: string
    address: string
    phone: string
    email: string
    website: string
  }
  student: {
    id: number
    name: string
    nis: string
    nisn: string
    class_name: string
    wali_kelas: string
    total_points: number
    cumulative_points: number
  }
  complaint: {
    code: string
    incident_at: string
    chronology: string
    violations: Array<{ name: string; points: number }>
  }
  schedule: {
    date: string
    date_text: string
    time: string
    room: string
    counselor: string
  }
  signatories: {
    kepala_sekolah: {
      title: string
      name: string
      nip: string
    }
    guru_bk: {
      title: string
      name: string
      nip: string
    }
  }
  qr_verification: string
}


