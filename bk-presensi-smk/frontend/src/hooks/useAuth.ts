import { useState, useEffect, useCallback, createContext, useContext, ReactNode, createElement } from 'react'
import { User, UpdateProfilePayload } from '../types'
import { authService, LoginPayload } from '../services/authService'
import { showToast } from './useToast'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (payload: LoginPayload) => Promise<boolean>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  updateProfile: (payload: UpdateProfilePayload) => Promise<boolean>
  hasRole: (roles: string | string[]) => boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => authService.getCurrentUser())
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const refreshUser = useCallback(async () => {
    try {
      const resp = await authService.getMe()
      if (resp.success && resp.data) {
        setUser(resp.data)
      }
    } catch {
      // not authenticated or network issue
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const login = async (payload: LoginPayload): Promise<boolean> => {
    try {
      setIsLoading(true)
      const resp = await authService.login(payload)
      if (resp.success && resp.data?.user) {
        setUser(resp.data.user)
        showToast(`Selamat datang, ${resp.data.user.name}!`, 'success')
        return true
      }
      return false
    } catch (err: unknown) {
      const errorObj = err as { message?: string; request_id?: string }
      showToast(
        errorObj.message || 'Login gagal. Periksa kembali email dan password Anda.',
        'error',
        errorObj.request_id
      )
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await authService.logout()
    } catch {
      // ignore
    } finally {
      setUser(null)
      showToast('Anda telah berhasil keluar.', 'info')
    }
  }

  const updateProfile = async (payload: UpdateProfilePayload): Promise<boolean> => {
    try {
      setIsLoading(true)
      const resp = await authService.updateProfile(payload)
      if (resp.success && resp.data) {
        setUser(resp.data)
        showToast('Profil Anda berhasil diperbarui!', 'success')
        return true
      }
      return false
    } catch (err: unknown) {
      const errorObj = err as { message?: string; request_id?: string; errors?: Record<string, string[]> }
      let msg = errorObj.message || 'Gagal memperbarui profil.'
      if (errorObj.errors) {
        const firstErr = Object.values(errorObj.errors)[0]
        if (firstErr && firstErr.length > 0) {
          msg = firstErr[0]
        }
      }
      showToast(msg, 'error', errorObj.request_id)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const hasRole = (roles: string | string[]): boolean => {
    if (!user) return false
    const allowed = Array.isArray(roles) ? roles : [roles]
    return allowed.includes(user.role)
  }

  return createElement(
    AuthContext.Provider,
    {
      value: {
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
        updateProfile,
        hasRole,
      },
    },
    children
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
