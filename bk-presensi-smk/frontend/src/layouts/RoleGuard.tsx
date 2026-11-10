import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface RoleGuardProps {
  roles: string[]
  children: React.ReactNode
}

export function RoleGuard({ roles, children }: RoleGuardProps) {
  const { hasRole, isLoading } = useAuth()

  if (isLoading) return null

  if (!hasRole(roles)) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
