import apiClient from '../api/axios-client'
import { API_ENDPOINTS } from '../api/endpoints'
import { ApiResponse, SchoolClass, AcademicYear, Student } from '../types'

export interface CreateClassPayload {
  academic_year_id: number
  name: string
  grade_level: 'X' | 'XI' | 'XII'
  is_active?: boolean
}

export interface CreateAcademicYearPayload {
  label: string
  start_date: string
  end_date: string
  is_active?: boolean
}

export interface AssignWaliPayload {
  user_id: number
  assignment_role?: string
}

export const classService = {
  async getClasses(params?: { academic_year_id?: number; grade_level?: string }): Promise<ApiResponse<SchoolClass[]>> {
    const response = await apiClient.get<ApiResponse<SchoolClass[]>>(API_ENDPOINTS.CLASSES.LIST, { params })
    return response.data
  },

  async getClass(id: number | string): Promise<ApiResponse<SchoolClass>> {
    const response = await apiClient.get<ApiResponse<SchoolClass>>(API_ENDPOINTS.CLASSES.DETAIL(id))
    return response.data
  },

  async createClass(payload: CreateClassPayload): Promise<ApiResponse<SchoolClass>> {
    const response = await apiClient.post<ApiResponse<SchoolClass>>(API_ENDPOINTS.CLASSES.CREATE, payload)
    return response.data
  },

  async updateClass(id: number | string, payload: Partial<CreateClassPayload>): Promise<ApiResponse<SchoolClass>> {
    const response = await apiClient.put<ApiResponse<SchoolClass>>(API_ENDPOINTS.CLASSES.UPDATE(id), payload)
    return response.data
  },

  async getClassStudents(id: number | string): Promise<ApiResponse<Student[]>> {
    const response = await apiClient.get<ApiResponse<Student[]>>(API_ENDPOINTS.CLASSES.STUDENTS(id))
    return response.data
  },

  async assignWali(classId: number | string, payload: AssignWaliPayload): Promise<ApiResponse<null>> {
    const response = await apiClient.post<ApiResponse<null>>(API_ENDPOINTS.CLASSES.ASSIGNMENTS(classId), payload)
    return response.data
  },

  // Academic Years
  async getAcademicYears(): Promise<ApiResponse<AcademicYear[]>> {
    const response = await apiClient.get<ApiResponse<AcademicYear[]>>(API_ENDPOINTS.ACADEMIC_YEARS.LIST)
    return response.data
  },

  async createAcademicYear(payload: CreateAcademicYearPayload): Promise<ApiResponse<AcademicYear>> {
    const response = await apiClient.post<ApiResponse<AcademicYear>>(API_ENDPOINTS.ACADEMIC_YEARS.CREATE, payload)
    return response.data
  },
}
