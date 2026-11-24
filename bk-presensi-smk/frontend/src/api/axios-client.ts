import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'
import { generateRequestId } from './request-id'
import { ApiError } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retryCsrf?: boolean
}

let csrfRefreshPromise: Promise<unknown> | null = null

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

// Request Interceptor: Attach unique X-Request-ID and Bearer Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const requestId = generateRequestId()
    config.headers.set('X-Request-ID', requestId)
    const token = localStorage.getItem('bk_token')
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`)
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response Interceptor: Parse Request ID and normalize API errors
apiClient.interceptors.response.use(
  (response) => {
    // If backend returns X-Request-ID in response headers, sync it with data if missing
    const respRequestId = response.headers['x-request-id']
    if (respRequestId && response.data && typeof response.data === 'object') {
      if (!response.data.request_id) {
        response.data.request_id = respRequestId
      }
    }
    return response
  },
  async (error: AxiosError<{ message?: string; errors?: Record<string, string[]>; error_code?: string; request_id?: string }>) => {
    const originalConfig = error.config as RetryableRequestConfig | undefined
    const status = error.response?.status

    // Automatically refresh CSRF cookie and retry once on 419 (CSRF token mismatch)
    if (
      status === 419 &&
      originalConfig &&
      !originalConfig._retryCsrf &&
      !originalConfig.url?.includes('/auth/csrf')
    ) {
      originalConfig._retryCsrf = true
      try {
        if (!csrfRefreshPromise) {
          csrfRefreshPromise = apiClient.get('/api/v1/auth/csrf').finally(() => {
            csrfRefreshPromise = null
          })
        }
        await csrfRefreshPromise
        if (originalConfig.headers) {
          originalConfig.headers.delete('X-XSRF-TOKEN')
        }
        return apiClient(originalConfig)
      } catch {
        // Fall through to normalized error if CSRF refresh itself fails
      }
    }

    const headerReqId = error.response?.headers?.['x-request-id'] || error.config?.headers?.['X-Request-ID'] || 'unknown_req'

    const normalizedError: ApiError = {
      success: false,
      message: error.response?.data?.message || error.message || 'Terjadi kesalahan pada sistem.',
      error_code: error.response?.data?.error_code || (status ? `HTTP_${status}` : 'NETWORK_ERROR'),
      request_id: error.response?.data?.request_id || (headerReqId as string),
      errors: error.response?.data?.errors,
    }

    // Auto-redirect to login on 401 if not already on login page
    if (status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('bk_token')
      localStorage.removeItem('bk_user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    return Promise.reject(normalizedError)
  }
)

export default apiClient
