export type ResourceEventType = 'nft.updated' | 'order.updated'

export interface RealtimeUpdateEvent<TPayload = Record<string, unknown>> {
  type: ResourceEventType
  resourceId: string
  version: number
  updatedAt: string
  payload: TPayload
}
