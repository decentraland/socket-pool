import {
  IBaseComponent,
  ILoggerComponent,
  IMetricsComponent
} from '@well-known-components/interfaces'
import { Emitter } from 'mitt'

/**
 * @internal
 */
type MetricKeys = 'desired' | 'connected'

/**
 * @public
 */
export type MetricMapping = Record<MetricKeys, string>

/**
 * @public
 */
export type SocketEvents<E = unknown> = {
  connected: unknown
  disconnected: unknown
  error: { error: unknown }
} & E

/**
 * @public
 */
export type ISocketResult<S = unknown> = S & {
  stop(): void
} & Emitter<SocketEvents>

/**
 * @public
 */
export type ISocketCreatorComponent<S = unknown> = {
  createSocket(): ISocketResult<S>
}

/**
 * @internal
 */
export type IComponents<S = unknown> = {
  logs: ILoggerComponent
  metrics: IMetricsComponent<string>
  socketCreator: ISocketCreatorComponent<S>
  pool: ISocketPoolComponent<S>
}

/**
 * @internal
 */
export type GlobalContext<S = unknown> = {
  components: IComponents<S>
}

/**
 * @public
 */
export type DesiredAmountParameter = {
  peers: number
  timeout: number
  burst: number
  wait: number
}

/**
 * @public
 */
export type ISocketPoolComponent<S = unknown> = IBaseComponent & {
  setDesiredAmount(param: DesiredAmountParameter): void
  getSockets(): Set<ISocketResult<S>>
  getConnectedSockets(): Set<ISocketResult<S>>
}
