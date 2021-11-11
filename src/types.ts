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
export type SocketEvents<T = unknown> = {
  connected: unknown
  disconnected: unknown
  error: { error: unknown }
} & T

/**
 * @public
 */
export type ISocketResult<T = unknown> = T & {
  stop(): void
} & Emitter<SocketEvents>

/**
 * @public
 */
export type ISocketCreatorComponent<T = unknown> = {
  createSocket(): ISocketResult<T>
}

/**
 * @internal
 */
export type IComponents<Socket = unknown> = {
  logs: ILoggerComponent
  metrics: IMetricsComponent<string>
  socketCreator: ISocketCreatorComponent<Socket>
  pool: ISocketPoolComponent
}

/**
 * @internal
 */
export type GlobalContext = {
  components: IComponents
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
export type ISocketPoolComponent = IBaseComponent & {
  setDesiredAmount(param: DesiredAmountParameter): void
  getSockets(): Set<ISocketResult>
  getConnectedSockets(): Set<ISocketResult>
}
