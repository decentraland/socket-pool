import {
  ILoggerComponent,
  IMetricsComponent
} from '@well-known-components/interfaces'
import { Emitter } from 'mitt'

export type ISocketCreatorComponent<T> = {
  createSocket(): ISocketResult<T>
}

export type SocketEvents<T = unknown> = {
  connected: unknown
  disconnected: unknown
  error: { error: unknown }
} & T

export type ISocketResult<T = unknown> = T & {
  stop(): void
} & Emitter<SocketEvents>

export type IComponents<Socket = unknown> = {
  logs: ILoggerComponent
  metrics: IMetricsComponent<string>
  socketCreator: ISocketCreatorComponent<Socket>
}

export type DesiredAmountParameter = {
  peers: number
  timeout: number
  burst: number
  wait: number
}

export type ISocketPoolComponent = {
  setDesiredAmount(param: DesiredAmountParameter): void
  getSockets(): Set<ISocketResult>
  getConnectedSockets(): Set<ISocketResult>
  restart(): void
}
