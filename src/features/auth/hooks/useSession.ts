import { isAxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useCallback } from 'react'

import { getCurrentSession, loginUser, logoutUser } from '../api/authApi'
import { sessionExpiredEvent } from '../session-events'
import { clearSessionToken } from '../session-token'
import type { LoginInput } from '../types/auth'
import { realtimeClient } from '../../../lib/realtime/socket-client'

export const sessionQueryKey = ['auth', 'session'] as const

export function clearPrivateSession(queryClient: ReturnType<typeof useQueryClient>) {
  clearSessionToken()
  queryClient.setQueryData(sessionQueryKey, null)
  void queryClient.cancelQueries({ predicate: (query) => query.queryKey[0] === 'private' })
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] === 'private' })
  realtimeClient.disconnect()
}

export function clearPrivateUserData(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.cancelQueries({ predicate: (query) => query.queryKey[0] === 'private' })
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] === 'private' })
  window.dispatchEvent(new Event(sessionExpiredEvent + ':restored'))
}

export function sessionQueryOptions(queryClient: ReturnType<typeof useQueryClient>) {
  return {
    queryKey: sessionQueryKey,
    queryFn: async () => {
      try {
        return await getCurrentSession()
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 401) {
          clearSessionToken()
          void queryClient.cancelQueries({ predicate: (query) => query.queryKey[0] === 'private' })
          queryClient.removeQueries({ predicate: (query) => query.queryKey[0] === 'private' })
          realtimeClient.disconnect()
          return null
        }
        throw error
      }
    },
    retry: false,
    staleTime: 15_000,
  }
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (credentials: LoginInput) => loginUser(credentials),
    onSuccess: (user) => {
      clearPrivateUserData(queryClient)
      queryClient.setQueryData(sessionQueryKey, user)
    },
  })
}

export function useSession() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const sessionQuery = useQuery(sessionQueryOptions(queryClient))
  const logoutMutation = useMutation({ mutationFn: logoutUser })

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync()
    } catch {
      // End the local session even if the simulated logout endpoint is unavailable.
    } finally {
      clearPrivateSession(queryClient)
      await router.navigate({ to: '/login', replace: true })
    }
  }, [logoutMutation, queryClient, router])

  return {
    user: sessionQuery.data ?? null,
    isLoading: sessionQuery.isPending,
    isError: sessionQuery.isError,
    refetch: sessionQuery.refetch,
    logout,
    isLoggingOut: logoutMutation.isPending,
  }
}
