import apiClient from '../api/axios-client'
import { API_ENDPOINTS } from '../api/endpoints'
import { ApiResponse, Attendance, AttendanceFilters, AttendanceStatus } from '../types'

export interface BulkAttendanceItem {
  student_id: number
  status: AttendanceStatus
  notes?: string
}

export interface BulkAttendancePayload {
  class_id: number
  date: string
  attendances: BulkAttendanceItem[]
}

export const attendanceService = {
  async getAttendances(filters?: AttendanceFilters): Promise<ApiResponse<Attendance[]>> {
    const response = await apiClient.get<ApiResponse<Attendance[]>>(API_ENDPOINTS.ATTENDANCE.LIST, {
      params: filters,
    })
    return response.data
  },

  async getToday(classId?: number): Promise<ApiResponse<Attendance[]>> {
    const response = await apiClient.get<ApiResponse<Attendance[]>>(API_ENDPOINTS.ATTENDANCE.TODAY, {
      params: { class_id: classId },
    })
    return response.data
  },

  async getByClass(classId: number | string, date?: string): Promise<ApiResponse<Attendance[]>> {
    const response = await apiClient.get<ApiResponse<Attendance[]>>(API_ENDPOINTS.ATTENDANCE.CLASS(classId), {
      params: { date },
    })
    return response.data
  },

  async saveSingle(payload: {
    student_id: number
    class_id: number
    date: string
    status: AttendanceStatus
    notes?: string
  }): Promise<ApiResponse<Attendance>> {
    const response = await apiClient.post<ApiResponse<Attendance>>(API_ENDPOINTS.ATTENDANCE.SAVE, payload)
    return response.data
  },

  async saveBulk(payload: BulkAttendancePayload): Promise<ApiResponse<{ saved_count: number }>> {
    const response = await apiClient.post<ApiResponse<{ saved_count: number }>>(
      API_ENDPOINTS.ATTENDANCE.BULK,
      payload
    )
    return response.data
  },

  async updateAttendance(id: number | string, payload: { status: AttendanceStatus; notes?: string }): Promise<ApiResponse<Attendance>> {
    const response = await apiClient.patch<ApiResponse<Attendance>>(API_ENDPOINTS.ATTENDANCE.UPDATE(id), payload)
    return response.data
  },

  async finalizeAttendance(id: number | string): Promise<ApiResponse<Attendance>> {
    const response = await apiClient.post<ApiResponse<Attendance>>(API_ENDPOINTS.ATTENDANCE.FINALIZE(id))
    return response.data
  },

  getExportUrl(params?: AttendanceFilters): string {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
    const query = new URLSearchParams()
    if (params?.date_from) query.append('date_from', params.date_from)
    if (params?.date_to) query.append('date_to', params.date_to)
    if (params?.class_id) query.append('class_id', String(params.class_id))
    return `${base}${API_ENDPOINTS.ATTENDANCE.EXPORT}?${query.toString()}`
  },
}
