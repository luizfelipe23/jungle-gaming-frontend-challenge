import { nftHandlers } from './nftHandlers'
import { authHandlers } from './authHandlers'
import { cartHandlers } from './cartHandlers'
import { realtimeHandlers } from './realtimeHandlers'
import { orderHandlers } from './orderHandlers'

export const handlers = [...nftHandlers, ...authHandlers, ...cartHandlers, ...orderHandlers, ...realtimeHandlers]
