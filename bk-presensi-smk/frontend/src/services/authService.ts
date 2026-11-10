import apiClient from '../api/axios-client'
import { API_ENDPOINTS } from '../api/endpoints'
import { ApiResponse, User } from '../types'

export interface LoginPayload {
  email: string
  password: string
}

export const authService = {
  async getCsrfCookie(): Promise<void> {
    try {
      await apiClient.get(API_ENDPOINTS.AUTH.CSRF)
    } catch {
      // Sanctum CSRF endpoint fallback
    }
  },

  async login(payload: LoginPayload): Promise<ApiResponse<{ user: User; token?: string }>> {
    await this.getCsrfCookie()
    const response = await apiClient.post<ApiResponse<{ user: User; token?: string }>>(
      API_ENDPOINTS.AUTH.LOGIN,
      payload
    )
    if (response.data.data?.token) {
      localStorage.setItem('bk_token', response.data.data.token)
    }
    if (response.data.data?.user) {
      localStorage.setItem('bk_user', JSON.stringify(response.data.data.user))
    }
    return response.data
  },

  async logout(): Promise<ApiResponse<null>> {
    try {
      const response = await apiClient.post<ApiResponse<null>>(API_ENDPOINTS.AUTH.LOGOUT)
      return response.data
    } finally {
      localStorage.removeItem('bk_token')
      localStorage.removeItem('bk_user')
    }
  },

  async getMe(): Promise<ApiResponse<User>> {
    const response = await apiClient.get<ApiResponse<User>>(API_ENDPOINTS.AUTH.ME)
    if (response.data.data) {
      localStorage.setItem('bk_user', JSON.stringify(response.data.data))
    }
    return response.data
  },

  async updateProfile(payload: import('../types').UpdateProfilePayload): Promise<ApiResponse<User>> {
    const response = await apiClient.put<ApiResponse<User>>(API_ENDPOINTS.AUTH.PROFILE, payload)
    if (response.data.data) {
      localStorage.setItem('bk_user', JSON.stringify(response.data.data))
    }
    return response.data
  },

  getCurrentUser(): User | null {
    const stored = localStorage.getItem('bk_user')
    if (!stored) return null
    try {
      return JSON.parse(stored) as User
    } catch {
      return null
    }
  },
}
