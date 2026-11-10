import apiClient from '../api/axios-client'
import { API_ENDPOINTS } from '../api/endpoints'
import { ApiResponse, SchoolSettings } from '../types'

export const settingService = {
  async getSettings(): Promise<ApiResponse<SchoolSettings>> {
    const response = await apiClient.get<ApiResponse<SchoolSettings>>(API_ENDPOINTS.SETTINGS.GET)
    if (response.data.data) {
      localStorage.setItem('bk_school_settings', JSON.stringify(response.data.data))
    }
    return response.data
  },

  async updateSettings(payload: SchoolSettings): Promise<ApiResponse<SchoolSettings>> {
    const response = await apiClient.put<ApiResponse<SchoolSettings>>(
      API_ENDPOINTS.SETTINGS.UPDATE,
      payload
    )
    if (response.data.data) {
      localStorage.setItem('bk_school_settings', JSON.stringify(response.data.data))
    }
    return response.data
  },

  getCachedSettings(): SchoolSettings {
    const defaultSettings: SchoolSettings = {
      school_name: 'SMK IPTEK SANGGABUANA',
      school_address: 'Jl. Terusan Pangrango No. 45, Karawang, Jawa Barat',
      school_phone: '0812-3456-7890',
      school_email: 'bk@smkiptek.sch.id',
      cutoff_time: '08:00',
      active_academic_year: '2026/2027',
    }

    const stored = localStorage.getItem('bk_school_settings')
    if (!stored) return defaultSettings
    try {
      return { ...defaultSettings, ...JSON.parse(stored) }
    } catch {
      return defaultSettings
    }
  },
}
