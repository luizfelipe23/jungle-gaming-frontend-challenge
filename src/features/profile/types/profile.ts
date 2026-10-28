export interface CollectorProfile {
  id: string
  displayName: string
  username: string
  email: string
  ensName: string
  walletNickname: string
  avatarUrl: string | null
}

export interface UpdateProfileInput {
  displayName: string
  username: string
  email: string
  ensName: string
  walletNickname: string
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

export interface ProfileApiError {
  code: string
  message: string
  fieldErrors?: Partial<Record<keyof UpdateProfileInput | 'currentPassword' | 'newPassword' | 'confirmPassword', string>>
}
