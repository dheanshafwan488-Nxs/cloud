import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Student, SchoolClass } from '../../types'
import { studentService, CreateStudentPayload } from '../../services/studentService'
import { FormField } from '../../components/forms/FormField'
import { showToast } from '../../hooks/useToast'

interface StudentFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  student?: Student | null
  classes: SchoolClass[]
}

export function StudentFormModal({
  isOpen,
  onClose,
  onSuccess,
  student,
  classes,
}: StudentFormModalProps) {
  const isEdit = !!student

  const [nis, setNis] = useState('')
  const [nisn, setNisn] = useState('')
  const [name, setName] = useState('')
  const [gender, setGender] = useState<'L' | 'P'>('L')
  const [birthDate, setBirthDate] = useState('')
  const [classId, setClassId] = useState<number | ''>('')
  const [enrollmentStatus, setEnrollmentStatus] = useState<'aktif' | 'lulus' | 'pindah' | 'nonaktif'>('aktif')
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  useEffect(() => {
    if (student) {
      setNis(student.nis || '')
      setNisn(student.nisn || '')
      setName(student.name || '')
      setGender(student.gender || 'L')
      setBirthDate(student.birth_date || '')
      setClassId(student.class_id || '')
      setEnrollmentStatus(student.enrollment_status || 'aktif')
    } else {
      setNis('')
      setNisn('')
      setName('')
      setGender('L')
      setBirthDate('')
      setClassId(classes[0]?.id || '')
      setEnrollmentStatus('aktif')
    }
    setErrors({})
  }, [student, classes, isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    if (!classId) {
      setErrors({ class_id: ['Pilih kelas terlebih dahulu.'] })
      return
    }

    const payload: CreateStudentPayload = {
      nis,
      nisn: nisn || undefined,
      name,
      gender,
      birth_date: birthDate || undefined,
      class_id: Number(classId),
      enrollment_status: enrollmentStatus,
    }

    setIsLoading(true)
    try {
      if (isEdit && student) {
        await studentService.updateStudent(student.id, payload)
        showToast('Data siswa berhasil diperbarui.', 'success')
      } else {
        await studentService.createStudent(payload)
        showToast('Siswa baru berhasil ditambahkan.', 'success')
      }
      onSuccess()
      onClose()
    } catch (err: any) {
      if (err.errors) {
        setErrors(err.errors)
      }
      showToast(err.message || 'Gagal menyimpan data siswa.', 'error', err.request_id)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <h2 className="text-lg font-bold text-slate-900">
            {isEdit ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="NIS" required error={errors.nis?.[0]}>
              <input
                type="text"
                required
                value={nis}
                onChange={(e) => setNis(e.target.value)}
                placeholder="20240101"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-600 focus:outline-none"
              />
            </FormField>

            <FormField label="NISN (Opsional)" error={errors.nisn?.[0]}>
              <input
                type="text"
                value={nisn}
                onChange={(e) => setNisn(e.target.value)}
                placeholder="0012345678"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-600 focus:outline-none"
              />
            </FormField>
          </div>

          <FormField label="Nama Lengkap" required error={errors.name?.[0]}>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ahmad Fauzi"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-600 focus:outline-none"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Jenis Kelamin" required error={errors.gender?.[0]}>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as 'L' | 'P')}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-600 focus:outline-none"
              >
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </FormField>

            <FormField label="Tanggal Lahir" error={errors.birth_date?.[0]}>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-600 focus:outline-none"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Kelas" required error={errors.class_id?.[0]}>
              <select
                value={classId}
                onChange={(e) => setClassId(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-600 focus:outline-none"
              >
                <option value="">Pilih Kelas</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.grade_level})
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Status Siswa" required error={errors.enrollment_status?.[0]}>
              <select
                value={enrollmentStatus}
                onChange={(e) => setEnrollmentStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-navy-600 focus:outline-none"
              >
                <option value="aktif">Aktif</option>
                <option value="lulus">Lulus</option>
                <option value="pindah">Pindah</option>
                <option value="nonaktif">Nonaktif</option>
              </select>
            </FormField>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-navy-800 hover:bg-navy-900 rounded-lg disabled:opacity-50"
            >
              {isLoading ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Siswa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
