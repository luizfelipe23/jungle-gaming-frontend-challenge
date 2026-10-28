import { nftHandlers } from './nftHandlers'
import { authHandlers } from './authHandlers'
import { cartHandlers } from './cartHandlers'
import { realtimeHandlers } from './realtimeHandlers'

export const handlers = [...nftHandlers, ...authHandlers, ...cartHandlers, ...realtimeHandlers]
