import api from './api'
import type { ProfileResponse } from '../types'

export const profileService = {
  async getProfile(): Promise<ProfileResponse> {
    const { data } = await api.get<ProfileResponse>('/profile')
    return data
  },

  async updateProfile(payload: {
    username?: string
    current_password?: string
    new_password?: string
  }): Promise<ProfileResponse> {
    const { data } = await api.put<ProfileResponse>('/profile', payload)
    return data
  },

  async uploadPhoto(file: File): Promise<ProfileResponse> {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await api.post<ProfileResponse>('/profile/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  getPhotoUrl(): string {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'
    return `${base}/profile/photo`
  },

  async deletePhoto(): Promise<ProfileResponse> {
    const { data } = await api.delete<ProfileResponse>('/profile/photo')
    return data
  },
}
