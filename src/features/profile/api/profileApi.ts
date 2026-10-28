import { http } from '../../../lib/api/http'
import type { ChangePasswordInput, CollectorProfile, UpdateProfileInput } from '../types/profile'

export async function getProfile() {
  return (await http.get<CollectorProfile>('/profile')).data
}

export async function updateProfile(input: UpdateProfileInput) {
  return (await http.patch<CollectorProfile>('/profile', input)).data
}

export async function uploadAvatar(avatarUrl: string) {
  return (await http.post<CollectorProfile>('/profile/avatar', { avatarUrl })).data
}

export async function changePassword(input: ChangePasswordInput & { confirmPassword: string }) {
  return (await http.post<{ message: string }>('/profile/password', input)).data
}
