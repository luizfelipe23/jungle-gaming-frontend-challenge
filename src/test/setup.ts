import '@testing-library/jest-dom/vitest'
import { beforeAll, afterEach, afterAll } from 'vitest'

import { server } from '../mocks/server'

Object.defineProperty(window, 'scrollTo', { value: () => undefined, writable: true })

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
