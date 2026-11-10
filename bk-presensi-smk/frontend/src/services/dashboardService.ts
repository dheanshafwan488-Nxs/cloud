import apiClient from '../api/axios-client'
import { API_ENDPOINTS } from '../api/endpoints'
import { ApiResponse, DashboardSummary } from '../types'

export interface AttendanceChartPoint {
  date: string
  hadir: number
  sakit: number
  izin: number
  alpa: number
}

export interface RecentActivity {
  id: number
  action: string
  entity_type: string
  user_name: string
  created_at: string
}

export const dashboardService = {
  async getSummary(): Promise<ApiResponse<DashboardSummary>> {
    const response = await apiClient.get<ApiResponse<DashboardSummary>>(API_ENDPOINTS.DASHBOARD.SUMMARY)
    return response.data
  },

  async getAttendanceChart(params?: { days?: number; class_id?: number }): Promise<ApiResponse<AttendanceChartPoint[]>> {
    const response = await apiClient.get<ApiResponse<AttendanceChartPoint[]>>(
      API_ENDPOINTS.DASHBOARD.ATTENDANCE_CHART,
      { params }
    )
    return response.data
  },

  async getRecentActivities(): Promise<ApiResponse<RecentActivity[]>> {
    const response = await apiClient.get<ApiResponse<RecentActivity[]>>(
      API_ENDPOINTS.DASHBOARD.RECENT_ACTIVITIES
    )
    return response.data
  },
}
