// This file is the "test-environment" analogous for src/components.ts
// Here we define the test components to be used in the testing environment

import { createLogComponent } from '@well-known-components/logger'
import { createConfigComponent } from '@well-known-components/env-config-provider'
import {
  createRunner,
  createLocalFetchCompoment,
  defaultServerConfig
} from '@well-known-components/test-helpers'
import {
  Router,
  createServerComponent,
  IFetchComponent
} from '@well-known-components/http-server'
import {
  IConfigComponent,
  IHttpServerComponent,
  IMetricsComponent
} from '@well-known-components/interfaces'

import {
  GlobalContext,
  IComponents,
  ISocketCreatorComponent,
  SocketEvents
} from '../src/types'
import { poolHandler } from '../src/http-handler'
import mitt from 'mitt'
import { createSocketPoolComponent } from '../src'

/**
 * Behaves like Jest "describe" function, used to describe a test for a
 * use case, it creates a whole new program and components to run an
 * isolated test.
 *
 * State is persistent within the steps of the test.
 */

const fakeSocketCreator = (): ISocketCreatorComponent => {
  return {
    createSocket: function () {
      const events = mitt<SocketEvents>()
      setTimeout(() => events.emit('connected'))
      return {
        stop() {
          events.emit('disconnected')
        },
        ...events
      }
    }
  }
}

const fakeMetrics = (): IMetricsComponent<string> => {
  return {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    decrement: (..._args: any) => {},
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    increment: (..._args: any) => {},
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    observe: (..._args: any) => {}
  } as IMetricsComponent<string>
}

type TestComponents = IComponents & {
  fetch: IFetchComponent
  server: IHttpServerComponent<GlobalContext>
  config: IConfigComponent
}

export const test = createRunner<TestComponents>({
  main,
  initComponents
})

async function main({ startComponents, components }) {
  const router = new Router<GlobalContext>()

  router.post('/pool-route', poolHandler)

  components.server.use(router.allowedMethods())
  components.server.use(router.middleware())

  components.server.setContext({ components })

  await startComponents()
}

async function initComponents(): Promise<TestComponents> {
  const config = createConfigComponent(process.env, defaultServerConfig())
  const logs = createLogComponent()
  const localFetch = await createLocalFetchCompoment(config)
  const server = await createServerComponent<GlobalContext>(
    { config, logs },
    {}
  )
  const metrics = fakeMetrics()
  const socket = fakeSocketCreator()
  const pool = createSocketPoolComponent(
    { logs, metrics, socketCreator: socket },
    { desired: 'desired', connected: 'connected' }
  )

  return {
    config,
    server,
    fetch: localFetch,
    logs,
    socketCreator: socket,
    pool,
    metrics
  }
}
