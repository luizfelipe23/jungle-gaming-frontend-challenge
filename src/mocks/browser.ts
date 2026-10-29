import { setupWorker } from 'msw/browser'

import { handlers } from './handlers'

export const worker = setupWorker(...handlers)

export const enableMocking = async () => {
  const mocksEnabled = import.meta.env.VITE_ENABLE_MOCKS === 'true'
    || (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCKS !== 'false')

  if (mocksEnabled) {
    await worker.start({
      onUnhandledRequest: 'warn',
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
    })
  }
}
