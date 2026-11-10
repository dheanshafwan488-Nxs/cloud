import apiClient from '../api/axios-client'
import { API_ENDPOINTS } from '../api/endpoints'
import { ApiResponse, Violation } from '../types'

export interface CreateViolationPayload {
  name: string
  description?: string
  points: number
  is_active?: boolean
}

export const violationService = {
  async getViolations(params?: { is_active?: boolean }): Promise<ApiResponse<Violation[]>> {
    const response = await apiClient.get<ApiResponse<Violation[]>>(API_ENDPOINTS.VIOLATIONS.LIST, {
      params,
    })
    return response.data
  },

  async createViolation(payload: CreateViolationPayload): Promise<ApiResponse<Violation>> {
    const response = await apiClient.post<ApiResponse<Violation>>(API_ENDPOINTS.VIOLATIONS.CREATE, payload)
    return response.data
  },

  async updateViolation(id: number | string, payload: Partial<CreateViolationPayload>): Promise<ApiResponse<Violation>> {
    const response = await apiClient.put<ApiResponse<Violation>>(API_ENDPOINTS.VIOLATIONS.UPDATE(id), payload)
    return response.data
  },

  async deleteViolation(id: number | string): Promise<ApiResponse<null>> {
    const response = await apiClient.delete<ApiResponse<null>>(API_ENDPOINTS.VIOLATIONS.DELETE(id))
    return response.data
  },
}
