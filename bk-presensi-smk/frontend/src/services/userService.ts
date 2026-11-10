import apiClient from '../api/axios-client'
import { API_ENDPOINTS } from '../api/endpoints'
import { ApiResponse, User } from '../types'

export interface CreateUserPayload {
  name: string
  email: string
  password: string
  role: 'admin' | 'guru_bk' | 'wali_kelas' | 'siswa'
  is_active?: boolean
}

export const userService = {
  async getUsers(params?: { role?: string; is_active?: boolean }): Promise<ApiResponse<User[]>> {
    const response = await apiClient.get<ApiResponse<User[]>>(API_ENDPOINTS.USERS.LIST, { params })
    return response.data
  },

  async createUser(payload: CreateUserPayload): Promise<ApiResponse<User>> {
    const response = await apiClient.post<ApiResponse<User>>(API_ENDPOINTS.USERS.CREATE, payload)
    return response.data
  },

  async updateUser(id: number | string, payload: Partial<CreateUserPayload>): Promise<ApiResponse<User>> {
    const response = await apiClient.put<ApiResponse<User>>(API_ENDPOINTS.USERS.UPDATE(id), payload)
    return response.data
  },

  async deactivateUser(id: number | string): Promise<ApiResponse<null>> {
    const response = await apiClient.post<ApiResponse<null>>(API_ENDPOINTS.USERS.DEACTIVATE(id))
    return response.data
  },
}
