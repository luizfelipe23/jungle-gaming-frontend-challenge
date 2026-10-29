import { setupWorker } from 'msw/browser'

import { handlers } from './handlers'

export const worker = setupWorker(...handlers)

export const enableMocking = async () => {
  const mocksEnabled = import.meta.env.VITE_ENABLE_MOCKS === 'true'
    || (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MOCKS !== 'false')
  const diagnosticsEnabled = import.meta.env.DEV || import.meta.env.VITE_DIAGNOSTICS === 'true'

  if (mocksEnabled) {
    if (diagnosticsEnabled) console.info('[diagnostic] MSW habilitado; registrando o Service Worker.')
    await worker.start({
      onUnhandledRequest: import.meta.env.DEV ? 'warn' : 'bypass',
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
    })

    const registration = await navigator.serviceWorker.getRegistration()
    const activeState = registration?.active?.state ?? 'not registered'
    if (diagnosticsEnabled) {
      console.info(`[diagnostic] Service Worker registrado=${Boolean(registration)}, estado=${activeState}.`)
    }
    if (!registration?.active || activeState !== 'activated') {
      throw new Error(`MSW foi habilitado, mas o Service Worker não está ativo (estado: ${activeState}).`)
    }
  } else if (diagnosticsEnabled) {
    console.info('[diagnostic] MSW desabilitado pela configuração.')
  }
}
