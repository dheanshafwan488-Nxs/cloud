import apiClient from '../api/axios-client'
import { API_ENDPOINTS } from '../api/endpoints'
import { ApiResponse } from '../types'

export interface AttendanceReportSummary {
  total_days: number
  total_present: number
  total_sick: number
  total_permission: number
  total_absent: number
  attendance_percentage: number
  by_class: Array<{
    class_id: number
    class_name: string
    total_students: number
    hadir: number
    sakit: number
    izin: number
    alpa: number
    percentage: number
  }>
}

export interface ComplaintReportSummary {
  total_complaints: number
  pending: number
  diproses: number
  selesai: number
  by_violation: Array<{
    violation_name: string
    total_cases: number
    total_points: number
  }>
}

export const reportService = {
  async getAttendanceReport(params?: {
    date_from?: string
    date_to?: string
    class_id?: number
  }): Promise<ApiResponse<AttendanceReportSummary>> {
    const response = await apiClient.get<ApiResponse<AttendanceReportSummary>>(
      API_ENDPOINTS.REPORTS.ATTENDANCE,
      { params }
    )
    return response.data
  },

  async getComplaintReport(params?: {
    date_from?: string
    date_to?: string
  }): Promise<ApiResponse<ComplaintReportSummary>> {
    const response = await apiClient.get<ApiResponse<ComplaintReportSummary>>(
      API_ENDPOINTS.REPORTS.COMPLAINTS,
      { params }
    )
    return response.data
  },

  getExportUrl(type: 'attendance' | 'complaints', format: 'csv' | 'xlsx', params?: Record<string, string>): string {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
    const query = new URLSearchParams({ type, format, ...params })
    return `${base}${API_ENDPOINTS.REPORTS.EXPORT}?${query.toString()}`
  },
}
