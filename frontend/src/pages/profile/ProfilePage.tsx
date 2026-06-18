import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { User, Lock, Camera, Trash2, Save, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { profileService } from '../../services/profileService'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

const profileSchema = z.object({
  username: z.string().min(3, 'At least 3 characters').max(50).regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers and underscores only').optional().or(z.literal('')),
})

const passwordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(6, 'At least 6 characters'),
  confirm_password: z.string().min(1, 'Please confirm your password'),
}).refine(d => d.new_password === d.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
})

type ProfileForm = z.infer<typeof profileSchema>
type PasswordForm = z.infer<typeof passwordSchema>

export default function ProfilePage() {
  const queryClient = useQueryClient()
  const { user, revalidate } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [photoTimestamp, setPhotoTimestamp] = useState(Date.now())

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: profileService.getProfile,
  })

  const {
    register: regProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isDirty: profileDirty },
    reset: resetProfile,
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { username: profile?.username ?? '' },
    values: { username: profile?.username ?? '' },
  })

  const {
    register: regPw,
    handleSubmit: handlePwSubmit,
    formState: { errors: pwErrors },
    reset: resetPw,
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current_password: '', new_password: '', confirm_password: '' },
  })

  const updateProfileMut = useMutation({
    mutationFn: (data: ProfileForm) =>
      profileService.updateProfile({ username: data.username || undefined }),
    onSuccess: () => {
      toast.success('Profile updated successfully')
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      revalidate()
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to update profile'),
  })

  const updatePasswordMut = useMutation({
    mutationFn: (data: PasswordForm) =>
      profileService.updateProfile({
        current_password: data.current_password,
        new_password: data.new_password,
      }),
    onSuccess: () => {
      toast.success('Password changed successfully')
      resetPw()
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to change password'),
  })

  const uploadPhotoMut = useMutation({
    mutationFn: (file: File) => profileService.uploadPhoto(file),
    onSuccess: () => {
      toast.success('Profile photo updated')
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      setPhotoTimestamp(Date.now())
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to upload photo'),
  })

  const deletePhotoMut = useMutation({
    mutationFn: profileService.deletePhoto,
    onSuccess: () => {
      toast.success('Profile photo removed')
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      setPhotoTimestamp(Date.now())
    },
    onError: (err: any) => toast.error(err?.response?.data?.detail || 'Failed to remove photo'),
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPEG, PNG, and WebP images are allowed')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo must be under 5MB')
      return
    }
    uploadPhotoMut.mutate(file)
    e.target.value = ''
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const photoUrl = profile?.has_profile_photo
    ? `${profileService.getPhotoUrl()}?t=${photoTimestamp}`
    : null

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Profile Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your account settings and profile photo</p>
      </div>

      {/* Profile Photo Card */}
      <div className="card">
        <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <Camera size={16} className="text-blue-400" /> Profile Photo
        </h2>
        <div className="flex items-center gap-6">
          <div className="relative flex-shrink-0">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-2 border-slate-700"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-blue-600/20 border-2 border-blue-500/30 flex items-center justify-center">
                <span className="text-blue-400 text-3xl font-bold uppercase">
                  {profile?.username?.[0] ?? user?.username?.[0] ?? 'A'}
                </span>
              </div>
            )}
            {(uploadPhotoMut.isPending) && (
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadPhotoMut.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <Camera size={15} />
              {profile?.has_profile_photo ? 'Change Photo' : 'Upload Photo'}
            </button>
            {profile?.has_profile_photo && (
              <button
                onClick={() => deletePhotoMut.mutate()}
                disabled={deletePhotoMut.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-red-900/40 text-slate-400 hover:text-red-400 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <Trash2 size={15} />
                Remove Photo
              </button>
            )}
            <p className="text-xs text-slate-500">JPEG, PNG, or WebP · Max 5MB</p>
          </div>
        </div>
      </div>

      {/* Update Username Card */}
      <div className="card">
        <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <User size={16} className="text-blue-400" /> Account Information
        </h2>
        <form onSubmit={handleProfileSubmit(d => updateProfileMut.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              type="text"
              value={profile?.email ?? ''}
              disabled
              className="input bg-slate-800/50 text-slate-500 cursor-not-allowed"
            />
            <p className="text-xs text-slate-600 mt-1">Email cannot be changed</p>
          </div>
          <div>
            <label className="label">Username <span className="text-red-400">*</span></label>
            <input
              type="text"
              {...regProfile('username')}
              className="input"
              placeholder="Enter username"
            />
            {profileErrors.username && (
              <p className="text-red-400 text-xs mt-1">{profileErrors.username.message}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={updateProfileMut.isPending || !profileDirty}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {updateProfileMut.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={15} />
            )}
            Save Changes
          </button>
        </form>
      </div>

      {/* Change Password Card */}
      <div className="card">
        <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <Lock size={16} className="text-blue-400" /> Change Password
        </h2>
        <form onSubmit={handlePwSubmit(d => updatePasswordMut.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Current Password <span className="text-red-400">*</span></label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                {...regPw('current_password')}
                className="input pr-10"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {pwErrors.current_password && (
              <p className="text-red-400 text-xs mt-1">{pwErrors.current_password.message}</p>
            )}
          </div>
          <div>
            <label className="label">New Password <span className="text-red-400">*</span></label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                {...regPw('new_password')}
                className="input pr-10"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {pwErrors.new_password && (
              <p className="text-red-400 text-xs mt-1">{pwErrors.new_password.message}</p>
            )}
          </div>
          <div>
            <label className="label">Confirm New Password <span className="text-red-400">*</span></label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                {...regPw('confirm_password')}
                className="input pr-10"
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {pwErrors.confirm_password && (
              <p className="text-red-400 text-xs mt-1">{pwErrors.confirm_password.message}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={updatePasswordMut.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {updatePasswordMut.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCircle2 size={15} />
            )}
            Change Password
          </button>
        </form>
      </div>
    </div>
  )
}
