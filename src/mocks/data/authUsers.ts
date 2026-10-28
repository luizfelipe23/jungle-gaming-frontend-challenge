import type { MockUserRecord } from '../../features/auth/types/session'

export const demoAuthUsers: MockUserRecord[] = [
  {
    id: 'user-luna-001',
    name: 'Luna Alves',
    email: 'luna@demo.kurio',
    salt: 'kurio-demo-luna-v1',
    passwordHash: 'c073a040d2bbe77cfe976ecb832af81129ca825d6d2c2fb315cd7f0722e056cc',
  },
  {
    id: 'user-rafael-002',
    name: 'Rafael Costa',
    email: 'rafael@demo.kurio',
    salt: 'kurio-demo-rafael-v1',
    passwordHash: 'c1022071a318176f24baf5c8fac96102372c7c40afd19ca035ddf4cb54cf7828',
  },
]
