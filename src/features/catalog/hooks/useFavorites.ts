import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSession } from '../../auth/hooks/useSession'
import { addFavorite, getFavoriteNftIds, removeFavorite } from '../api/favoritesApi'

export function favoritesQueryKey(userId: string) { return ['private', userId, 'favorites'] as const }

export function useFavorites() {
  const { user } = useSession()
  return useQuery({ queryKey: favoritesQueryKey(user?.id ?? 'guest'), queryFn: getFavoriteNftIds, enabled: Boolean(user) })
}

export function useToggleFavorite() {
  const { user } = useSession()
  const queryClient = useQueryClient()
  const queryKey = favoritesQueryKey(user?.id ?? 'guest')
  return useMutation({
    mutationFn: ({ nftId, favorite }: { nftId: string; favorite: boolean }) => favorite ? addFavorite(nftId) : removeFavorite(nftId),
    onMutate: async ({ nftId, favorite }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<string[]>(queryKey) ?? []
      queryClient.setQueryData<string[]>(queryKey, favorite ? [...new Set([...previous, nftId])] : previous.filter((id) => id !== nftId))
      return { previous }
    },
    onError: (_error, _variables, context) => {
      if (context) queryClient.setQueryData(queryKey, context.previous)
    },
    onSuccess: (ids) => queryClient.setQueryData(queryKey, ids),
    onSettled: () => { if (user) void queryClient.invalidateQueries({ queryKey }) },
  })
}
