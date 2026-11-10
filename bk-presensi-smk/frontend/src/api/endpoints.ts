export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    LOGOUT: '/api/v1/auth/logout',
    ME: '/api/v1/auth/me',
    CSRF: '/api/v1/auth/csrf',
    PROFILE: '/api/v1/auth/profile',
  },

  // Dashboard
  DASHBOARD: {
    SUMMARY: '/api/v1/dashboard/summary',
    ATTENDANCE_CHART: '/api/v1/dashboard/attendance-chart',
    COMPLAINT_SUMMARY: '/api/v1/dashboard/complaint-summary',
    RECENT_ACTIVITIES: '/api/v1/dashboard/recent-activities',
  },

  // Students
  STUDENTS: {
    LIST: '/api/v1/students',
    DETAIL: (id: number | string) => `/api/v1/students/${id}`,
    CREATE: '/api/v1/students',
    UPDATE: (id: number | string) => `/api/v1/students/${id}`,
    DELETE: (id: number | string) => `/api/v1/students/${id}`,
    IMPORT: '/api/v1/students/import',
    IMPORT_TEMPLATE: '/api/v1/students/import-template',
    VERIFICATION_CODE: (id: number | string) => `/api/v1/students/${id}/verification-code`,
  },

  // Classes & Academic Years
  CLASSES: {
    LIST: '/api/v1/classes',
    DETAIL: (id: number | string) => `/api/v1/classes/${id}`,
    CREATE: '/api/v1/classes',
    UPDATE: (id: number | string) => `/api/v1/classes/${id}`,
    STUDENTS: (id: number | string) => `/api/v1/classes/${id}/students`,
    ASSIGNMENTS: (id: number | string) => `/api/v1/classes/${id}/assignments`,
  },
  ACADEMIC_YEARS: {
    LIST: '/api/v1/academic-years',
    CREATE: '/api/v1/academic-years',
    UPDATE: (id: number | string) => `/api/v1/academic-years/${id}`,
  },
  CALENDAR: {
    LIST: '/api/v1/school-calendar',
    CREATE: '/api/v1/school-calendar',
    UPDATE: (id: number | string) => `/api/v1/school-calendar/${id}`,
    DELETE: (id: number | string) => `/api/v1/school-calendar/${id}`,
  },

  // Attendance
  ATTENDANCE: {
    LIST: '/api/v1/attendances',
    TODAY: '/api/v1/attendances/today',
    STUDENT: (studentId: number | string) => `/api/v1/attendances/student/${studentId}`,
    CLASS: (classId: number | string) => `/api/v1/attendances/class/${classId}`,
    SAVE: '/api/v1/attendances',
    BULK: '/api/v1/attendances/bulk',
    UPDATE: (id: number | string) => `/api/v1/attendances/${id}`,
    FINALIZE: (id: number | string) => `/api/v1/attendances/${id}/finalize`,
    EXPORT: '/api/v1/attendances/export',
  },

  // Violations
  VIOLATIONS: {
    LIST: '/api/v1/violations',
    DETAIL: (id: number | string) => `/api/v1/violations/${id}`,
    CREATE: '/api/v1/violations',
    UPDATE: (id: number | string) => `/api/v1/violations/${id}`,
    DELETE: (id: number | string) => `/api/v1/violations/${id}`,
  },

  // Complaints
  COMPLAINTS: {
    LIST: '/api/v1/complaints',
    DETAIL: (id: number | string) => `/api/v1/complaints/${id}`,
    CREATE: '/api/v1/complaints',
    UPDATE: (id: number | string) => `/api/v1/complaints/${id}`,
    STATUS: (id: number | string) => `/api/v1/complaints/${id}/status`,
    FOLLOWUPS: (id: number | string) => `/api/v1/complaints/${id}/followups`,
    ATTACHMENTS: (id: number | string) => `/api/v1/complaints/${id}/attachments`,
    ATTACHMENT_DOWNLOAD: (id: number | string, attId: number | string) =>
      `/api/v1/complaints/${id}/attachments/${attId}`,
    LETTER: (id: number | string) => `/api/v1/complaints/${id}/letter`,
    DELETE: (id: number | string) => `/api/v1/complaints/${id}`,
  },

  // Users
  USERS: {
    LIST: '/api/v1/users',
    DETAIL: (id: number | string) => `/api/v1/users/${id}`,
    CREATE: '/api/v1/users',
    UPDATE: (id: number | string) => `/api/v1/users/${id}`,
    DEACTIVATE: (id: number | string) => `/api/v1/users/${id}/deactivate`,
    CLASS_ASSIGNMENTS: '/api/v1/class-assignments',
  },

  // Reports
  REPORTS: {
    ATTENDANCE: '/api/v1/reports/attendance',
    ATTENDANCE_CLASSES: '/api/v1/reports/attendance/classes',
    ATTENDANCE_STUDENTS: '/api/v1/reports/attendance/students',
    COMPLAINTS: '/api/v1/reports/complaints',
    VIOLATIONS: '/api/v1/reports/violations',
    EXPORT: '/api/v1/reports/export',
  },

  // Settings
  SETTINGS: {
    GET: '/api/v1/settings',
    UPDATE: '/api/v1/settings',
  },
}
