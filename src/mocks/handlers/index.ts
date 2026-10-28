import { nftHandlers } from './nftHandlers'
import { authHandlers } from './authHandlers'
import { cartHandlers } from './cartHandlers'
import { realtimeHandlers } from './realtimeHandlers'
import { orderHandlers } from './orderHandlers'
import { profileHandlers } from './profileHandlers'
import { walletHandlers } from './walletHandlers'
import { favoriteHandlers } from './favoriteHandlers'

export const handlers = [...nftHandlers, ...authHandlers, ...profileHandlers, ...walletHandlers, ...favoriteHandlers, ...cartHandlers, ...orderHandlers, ...realtimeHandlers]
