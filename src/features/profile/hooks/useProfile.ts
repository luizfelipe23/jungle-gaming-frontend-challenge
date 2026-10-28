import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { sessionQueryKey } from '../../auth/hooks/useSession'
import { changePassword, getProfile, updateProfile, uploadAvatar } from '../api/profileApi'
import type { CollectorProfile, UpdateProfileInput } from '../types/profile'

export const profileQueryKey = (userId: string) => ['private', userId, 'profile'] as const

export function useProfile(userId: string) {
  return useQuery({ queryKey: profileQueryKey(userId), queryFn: getProfile })
}

export function useUpdateProfile(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateProfileInput) => updateProfile(input),
    onSuccess: (profile) => {
      queryClient.setQueryData<CollectorProfile>(profileQueryKey(userId), profile)
      queryClient.setQueryData(sessionQueryKey, (user: { id: string; name: string; email: string } | undefined) => user?.id === userId ? { ...user, name: profile.displayName, email: profile.email } : user)
    },
  })
}

export function useUploadAvatar(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: uploadAvatar,
    onSuccess: (profile) => queryClient.setQueryData(profileQueryKey(userId), profile),
  })
}

export function useChangePassword() {
  return useMutation({ mutationFn: changePassword })
}
