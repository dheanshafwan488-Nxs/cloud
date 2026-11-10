import { useState, useEffect, useCallback, createContext, useContext, ReactNode, createElement } from 'react'
import { SchoolSettings } from '../types'
import { settingService } from '../services/settingService'
import { showToast } from './useToast'

interface SchoolContextType {
  settings: SchoolSettings
  isLoading: boolean
  updateSchoolSettings: (payload: SchoolSettings) => Promise<boolean>
  refreshSettings: () => Promise<void>
}

const defaultSettings: SchoolSettings = {
  school_name: 'SMK IPTEK SANGGABUANA',
  school_address: 'Jl. Terusan Pangrango No. 45, Karawang, Jawa Barat',
  school_phone: '0812-3456-7890',
  school_email: 'bk@smkiptek.sch.id',
  cutoff_time: '08:00',
  active_academic_year: '2026/2027',
}

const SchoolContext = createContext<SchoolContextType | null>(null)

export function SchoolSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SchoolSettings>(() => settingService.getCachedSettings())
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const refreshSettings = useCallback(async () => {
    try {
      const resp = await settingService.getSettings()
      if (resp.success && resp.data) {
        setSettings(resp.data)
      }
    } catch {
      // fallback to cached
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshSettings()
  }, [refreshSettings])

  useEffect(() => {
    if (settings.school_name) {
      document.title = `BK & Presensi – ${settings.school_name}`
    }
  }, [settings.school_name])

  const updateSchoolSettings = async (payload: SchoolSettings): Promise<boolean> => {
    try {
      setIsLoading(true)
      const resp = await settingService.updateSettings(payload)
      if (resp.success && resp.data) {
        setSettings(resp.data)
        showToast('Pengaturan nama sekolah & sistem berhasil diperbarui!', 'success')
        return true
      }
      return false
    } catch (err: unknown) {
      const errorObj = err as { message?: string; request_id?: string }
      showToast(
        errorObj.message || 'Gagal menyimpan pengaturan sekolah.',
        'error',
        errorObj.request_id
      )
      return false
    } finally {
      setIsLoading(false)
    }
  }

  return createElement(
    SchoolContext.Provider,
    {
      value: {
        settings: settings || defaultSettings,
        isLoading,
        updateSchoolSettings,
        refreshSettings,
      },
    },
    children
  )
}

export function useSchoolSettings() {
  const context = useContext(SchoolContext)
  if (!context) {
    throw new Error('useSchoolSettings must be used within a SchoolSettingsProvider')
  }
  return context
}
