import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'

import { clearPrivateSession } from '../hooks/useSession'
import { sessionExpiredEvent } from '../session-events'
import { safeReturnTo } from '../validation'

export function SessionExpiryHandler() {
  const queryClient = useQueryClient()
  const router = useRouter()

  useEffect(() => {
    let handling = false
    const reset = () => { handling = false }
    const handleExpiredSession = () => {
      if (handling) return
      handling = true
      const currentLocation = router.state.location.href
      clearPrivateSession(queryClient)
      void router.navigate({ to: '/login', search: { returnTo: safeReturnTo(currentLocation), sessionError: true }, replace: true }).finally(reset)
    }

    window.addEventListener(sessionExpiredEvent, handleExpiredSession)
    window.addEventListener(`${sessionExpiredEvent}:restored`, reset)
    return () => {
      window.removeEventListener(sessionExpiredEvent, handleExpiredSession)
      window.removeEventListener(`${sessionExpiredEvent}:restored`, reset)
    }
  }, [queryClient, router])

  return null
}
