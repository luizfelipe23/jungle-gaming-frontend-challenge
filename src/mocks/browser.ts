import { setupWorker } from 'msw/browser'

import { handlers } from './handlers'

export const worker = setupWorker(...handlers)

export const enableMocking = async () => {
  if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCKS !== 'false') {
    await worker.start({
      onUnhandledRequest: 'warn',
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
    })
  }
}
