import apiClient from '../api/axios-client'
import { API_ENDPOINTS } from '../api/endpoints'
import { ApiResponse, Student, StudentFilters } from '../types'

export interface CreateStudentPayload {
  nis: string
  nisn?: string
  name: string
  gender?: 'L' | 'P'
  birth_date?: string
  class_id: number
  enrollment_status?: 'aktif' | 'lulus' | 'pindah' | 'nonaktif'
}

export interface ImportResult {
  total_processed: number
  success_count: number
  failed_count: number
  errors: { row: number; nis?: string; error: string }[]
}

export const studentService = {
  async getStudents(filters?: StudentFilters): Promise<ApiResponse<Student[]>> {
    const response = await apiClient.get<ApiResponse<Student[]>>(API_ENDPOINTS.STUDENTS.LIST, {
      params: filters,
    })
    return response.data
  },

  async getStudent(id: number | string): Promise<ApiResponse<Student>> {
    const response = await apiClient.get<ApiResponse<Student>>(API_ENDPOINTS.STUDENTS.DETAIL(id))
    return response.data
  },

  async createStudent(payload: CreateStudentPayload): Promise<ApiResponse<Student>> {
    const response = await apiClient.post<ApiResponse<Student>>(API_ENDPOINTS.STUDENTS.CREATE, payload)
    return response.data
  },

  async updateStudent(id: number | string, payload: Partial<CreateStudentPayload>): Promise<ApiResponse<Student>> {
    const response = await apiClient.put<ApiResponse<Student>>(API_ENDPOINTS.STUDENTS.UPDATE(id), payload)
    return response.data
  },

  async deleteStudent(id: number | string): Promise<ApiResponse<null>> {
    const response = await apiClient.delete<ApiResponse<null>>(API_ENDPOINTS.STUDENTS.DELETE(id))
    return response.data
  },

  async importStudents(file: File): Promise<ApiResponse<ImportResult>> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await apiClient.post<ApiResponse<ImportResult>>(
      API_ENDPOINTS.STUDENTS.IMPORT,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      }
    )
    return response.data
  },

  getImportTemplateUrl(): string {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
    return `${base}${API_ENDPOINTS.STUDENTS.IMPORT_TEMPLATE}`
  },

  async getVerificationCode(studentId: number | string): Promise<ApiResponse<import('../types').ParentVerificationData>> {
    const response = await apiClient.get<ApiResponse<import('../types').ParentVerificationData>>(
      API_ENDPOINTS.STUDENTS.VERIFICATION_CODE(studentId)
    )
    return response.data
  },

  async generateVerificationCode(studentId: number | string): Promise<ApiResponse<import('../types').ParentVerificationData>> {
    const response = await apiClient.post<ApiResponse<import('../types').ParentVerificationData>>(
      API_ENDPOINTS.STUDENTS.VERIFICATION_CODE(studentId)
    )
    return response.data
  },
}
