import { nftHandlers } from './nftHandlers'
import { authHandlers } from './authHandlers'

export const handlers = [...nftHandlers, ...authHandlers]
