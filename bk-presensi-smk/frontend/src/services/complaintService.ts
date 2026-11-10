import apiClient from '../api/axios-client'
import { API_ENDPOINTS } from '../api/endpoints'
import { ApiResponse, Complaint, ComplaintFilters, ComplaintStatus, CaseFollowup, ComplaintStatusHistory } from '../types'

export interface CreateComplaintPayload {
  student_id: number
  class_id?: number
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

export const complaintService = {
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
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
    return `${base}${API_ENDPOINTS.COMPLAINTS.ATTACHMENT_DOWNLOAD(complaintId, attachmentId)}`
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
}
