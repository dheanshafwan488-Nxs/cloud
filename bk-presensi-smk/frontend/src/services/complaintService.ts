import apiClient from '../api/axios-client'
import { API_ENDPOINTS } from '../api/endpoints'
import { ApiResponse, Complaint, ComplaintFilters, ComplaintStatus, CaseFollowup, ComplaintStatusHistory } from '../types'

export interface CreateComplaintPayload {
  student_id: number
  class_id?: number
  reporter_name?: string
  manual_violation?: string
  chronology: string
  incident_at: string
  violation_ids?: number[]
  parent_visible?: boolean
  file?: File
}

export interface UpdateComplaintStatusPayload {
  status: ComplaintStatus
  note?: string
}

export interface AddFollowupPayload {
  followup_type: string
  notes: string
  parent_visible?: boolean
  followed_up_at?: string
}

export interface PublicComplaintPayload {
  reporter_class_id: number
  reporter_student_id: number
  class_id: number
  student_id: number
  violation_ids?: number[]
  manual_violation?: string
  chronology: string
  incident_at: string
  attachment: File
}

export const complaintService = {
  // Public Student Endpoints (Barcode / QR Code)
  async getPublicClasses(): Promise<ApiResponse<Array<{ id: number; name: string; grade_level?: string; level?: string; major?: string }>>> {
    const response = await apiClient.get<ApiResponse<Array<{ id: number; name: string; grade_level?: string; level?: string; major?: string }>>>(
      API_ENDPOINTS.PUBLIC.CLASSES
    )
    return response.data
  },

  async getPublicStudentsByClass(classId: number | string): Promise<ApiResponse<Array<{ id: number; name: string; nis: string }>>> {
    const response = await apiClient.get<ApiResponse<Array<{ id: number; name: string; nis: string }>>>(
      API_ENDPOINTS.PUBLIC.CLASS_STUDENTS(classId)
    )
    return response.data
  },

  async getPublicViolations(): Promise<ApiResponse<Array<{ id: number; name: string; description?: string; points: number }>>> {
    const response = await apiClient.get<ApiResponse<Array<{ id: number; name: string; description?: string; points: number }>>>(
      API_ENDPOINTS.PUBLIC.VIOLATIONS
    )
    return response.data
  },

  async submitPublicComplaint(payload: PublicComplaintPayload): Promise<ApiResponse<{
    complaint_code: string
    reporter_name: string
    student_name: string
    class_name: string
    manual_violation: string
    total_points?: number
    violations?: Array<{ id: number | null; name: string; points: number }>
    incident_at: string
    status: string
    created_at: string
  }>> {
    const formData = new FormData()
    formData.append('reporter_class_id', String(payload.reporter_class_id))
    formData.append('reporter_student_id', String(payload.reporter_student_id))
    formData.append('class_id', String(payload.class_id))
    formData.append('student_id', String(payload.student_id))
    if (payload.violation_ids && payload.violation_ids.length > 0) {
      payload.violation_ids.forEach((vid) => formData.append('violation_ids[]', String(vid)))
    }
    if (payload.manual_violation && payload.manual_violation.trim() !== '') {
      formData.append('manual_violation', payload.manual_violation.trim())
    }
    formData.append('chronology', payload.chronology)
    formData.append('incident_at', payload.incident_at)
    formData.append('attachment', payload.attachment)

    const response = await apiClient.post(API_ENDPOINTS.PUBLIC.SUBMIT_COMPLAINT, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
  async getComplaints(filters?: ComplaintFilters): Promise<ApiResponse<Complaint[]>> {
    const response = await apiClient.get<ApiResponse<Complaint[]>>(API_ENDPOINTS.COMPLAINTS.LIST, {
      params: filters,
    })
    return response.data
  },

  async getComplaint(id: number | string): Promise<
    ApiResponse<
      Complaint & {
        status_histories?: ComplaintStatusHistory[]
        followups?: CaseFollowup[]
        attachments?: Array<{ id: number; original_name: string; file_size: number; created_at: string }>
      }
    >
  > {
    const response = await apiClient.get(API_ENDPOINTS.COMPLAINTS.DETAIL(id))
    return response.data
  },

  async createComplaint(payload: CreateComplaintPayload): Promise<ApiResponse<Complaint>> {
    const formData = new FormData()
    formData.append('student_id', String(payload.student_id))
    if (payload.class_id) formData.append('class_id', String(payload.class_id))
    if (payload.reporter_name) formData.append('reporter_name', payload.reporter_name)
    if (payload.manual_violation && payload.manual_violation.trim()) {
      formData.append('manual_violation', payload.manual_violation.trim())
    }
    formData.append('chronology', payload.chronology)
    formData.append('incident_at', payload.incident_at)
    formData.append('parent_visible', payload.parent_visible ? '1' : '0')

    if (payload.violation_ids && payload.violation_ids.length > 0) {
      payload.violation_ids.forEach((id) => formData.append('violation_ids[]', String(id)))
    }
    if (payload.file) {
      formData.append('attachment', payload.file)
    }

    const response = await apiClient.post<ApiResponse<Complaint>>(
      API_ENDPOINTS.COMPLAINTS.CREATE,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return response.data
  },

  async updateStatus(id: number | string, payload: UpdateComplaintStatusPayload): Promise<ApiResponse<Complaint>> {
    const response = await apiClient.post<ApiResponse<Complaint>>(
      API_ENDPOINTS.COMPLAINTS.STATUS(id),
      payload
    )
    return response.data
  },

  async updateViolations(
    id: number | string,
    payload: { violation_ids: number[]; manual_violation?: string }
  ): Promise<ApiResponse<{
    id: number
    manual_violation: string | null
    violations: import('../types').Violation[]
    violation_items: Array<{ id: number | null; name: string; points: number; is_manual?: boolean }>
    total_points: number
    student_cumulative_points: number
  }>> {
    const response = await apiClient.put(API_ENDPOINTS.COMPLAINTS.VIOLATIONS(id), payload)
    return response.data
  },

  async addFollowup(id: number | string, payload: AddFollowupPayload): Promise<ApiResponse<CaseFollowup>> {
    const response = await apiClient.post<ApiResponse<CaseFollowup>>(
      API_ENDPOINTS.COMPLAINTS.FOLLOWUPS(id),
      payload
    )
    return response.data
  },

  async deleteComplaint(id: number | string): Promise<ApiResponse<null>> {
    const response = await apiClient.delete<ApiResponse<null>>(API_ENDPOINTS.COMPLAINTS.DELETE(id))
    return response.data
  },

  getAttachmentUrl(complaintId: number | string, attachmentId: number | string): string {
    const base = import.meta.env.VITE_API_BASE_URL || ''
    return `${base}${API_ENDPOINTS.COMPLAINTS.ATTACHMENT_DOWNLOAD(complaintId, attachmentId)}`
  },

  async fetchAttachmentBlob(
    complaintId: number | string,
    attachmentId: number | string,
    fallbackMimeType?: string
  ): Promise<{ blob: Blob; contentType: string }> {
    const response = await apiClient.get(
      API_ENDPOINTS.COMPLAINTS.ATTACHMENT_DOWNLOAD(complaintId, attachmentId),
      { responseType: 'blob' }
    )
    const contentType =
      (response.headers['content-type'] as string | undefined) ||
      fallbackMimeType ||
      response.data?.type ||
      'application/octet-stream'
    const blob =
      response.data instanceof Blob
        ? new Blob([response.data], { type: contentType })
        : new Blob([response.data], { type: contentType })
    return { blob, contentType }
  },

  async getOfficialLetter(
    complaintId: number | string,
    type: 'panggilan' | 'sp1' | 'sp2' | 'sp3' = 'panggilan'
  ): Promise<ApiResponse<import('../types').OfficialLetterData>> {
    const response = await apiClient.get<ApiResponse<import('../types').OfficialLetterData>>(
      API_ENDPOINTS.COMPLAINTS.LETTER(complaintId),
      { params: { type } }
    )
    return response.data
  },

  async saveLetterDefaults(payload: {
    letter_kepsek_name?: string
    letter_kepsek_nip?: string
    letter_kepsek_title?: string
    letter_gurubk_name?: string
    letter_gurubk_nip?: string
    letter_gurubk_title?: string
    letter_counselor?: string
    letter_room?: string
    letter_time?: string
    letter_city?: string
  }): Promise<ApiResponse<Record<string, string>>> {
    const response = await apiClient.put<ApiResponse<Record<string, string>>>(
      API_ENDPOINTS.COMPLAINTS.LETTER_DEFAULTS,
      payload
    )
    return response.data
  },
}
