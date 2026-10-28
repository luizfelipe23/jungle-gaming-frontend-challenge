import { useState } from 'react'
import { isAxiosError } from 'axios'
import { Heart } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useSession } from '../../auth/hooks/useSession'
import { useFavorites, useToggleFavorite } from '../hooks/useFavorites'

export function FavoriteButton({ nftId, nftName = nftId, className = '', compact = false }: { nftId: string; nftName?: string; className?: string; compact?: boolean }) {
  const { user } = useSession()
  const navigate = useNavigate()
  const favorites = useFavorites()
  const toggle = useToggleFavorite()
  const [error, setError] = useState('')
  const isFavorite = Boolean(user && favorites.data?.includes(nftId))

  function handleClick() {
    if (!user) {
      void navigate({ to: '/login', search: { returnTo: `/nft/${nftId}` } })
      return
    }
    setError('')
    toggle.mutate({ nftId, favorite: !isFavorite }, { onError: (reason) => setError(isAxiosError<{ message?: string }>(reason) ? reason.response?.data.message ?? 'Não foi possível atualizar os favoritos.' : 'Não foi possível atualizar os favoritos.') })
  }

  return <span className="inline-flex flex-col items-end gap-1">
    <button type="button" aria-label={isFavorite ? `Remover ${nftName} dos favoritos` : `Adicionar ${nftName} aos favoritos`} aria-pressed={isFavorite} disabled={toggle.isPending || (Boolean(user) && (favorites.isLoading || favorites.isError))} onClick={handleClick} className={`inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#D28A4C]/70 px-3 text-xs font-semibold text-[#E89B55] transition hover:bg-[#D28A4C] hover:text-[#140D0A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F1EB] disabled:opacity-60 ${className}`}>
      <Heart aria-hidden="true" className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />{!compact && (isFavorite ? 'Favoritado' : 'Favoritar')}
    </button>
    {user && favorites.isError && <span role="alert" className="max-w-40 text-right text-[10px] text-red-200">NÃ£o foi possÃ­vel carregar os favoritos. <button type="button" onClick={() => void favorites.refetch()} className="underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#E89B55]">Tentar novamente</button></span>}
    {error && <span role="alert" className="max-w-40 text-right text-[10px] text-red-200">{error}</span>}
  </span>
}
