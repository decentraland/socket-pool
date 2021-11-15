import future from 'fp-future'

import { pickElement, sleep } from './utils'
import {
  DesiredAmountParameter,
  ISocketPoolComponent,
  IComponents,
  ISocketResult,
  MetricMapping
} from './types'

export * from './types'
export { poolHandler } from './http-handler'

/**
 * Creates a socket pool runner. Receives the same arguments as Lifecycle.run
 * @public
 */

export function createSocketPoolComponent<Socket>(
  components: Pick<IComponents<Socket>, 'logs' | 'metrics' | 'socketCreator'>,
  metricMapping: MetricMapping
): ISocketPoolComponent {
  const logger = components.logs.getLogger('socket-pool')
  const sockets = new Set<ISocketResult>()
  const connectedSockets = new Set<ISocketResult>()
  let loopRunning = true

  const desiredParameters: DesiredAmountParameter = {
    burst: 0,
    peers: 0,
    timeout: 0,
    wait: 0
  }

  let testTimeout = 0

  function refreshMetrics() {
    components.metrics.observe(
      metricMapping.desired,
      {},
      desiredParameters.peers
    )
    if (desiredParameters.peers) {
      logger.debug(
        'connected_peers ' +
          connectedSockets.size +
          '/' +
          sockets.size +
          ' desired_amount=' +
          desiredParameters.peers
      )
    }
  }

  async function mainLoop() {
    while (loopRunning) {
      // remove extra
      while (sockets.size > desiredParameters.peers) {
        pickElement(sockets)?.stop()
      }

      const createdMutexes: Promise<void>[] = []
      // create missing
      while (sockets.size < desiredParameters.peers) {
        const sock = components.socketCreator.createSocket()
        sockets.add(sock)

        const mutex = future<void>()
        createdMutexes.push(mutex)

        sock.on('connected', () => {
          connectedSockets.add(sock)
          components.metrics.increment(metricMapping.connected, {})
          refreshMetrics()
          mutex.resolve()
        })

        sock.on('disconnected', () => {
          console.log('disconnected')
          sockets.delete(sock)
          if (connectedSockets.delete(sock)) {
            components.metrics.decrement(metricMapping.connected, {})
          }
          refreshMetrics()
          mutex.resolve()
        })

        if (
          desiredParameters.burst &&
          desiredParameters.burst < createdMutexes.length
        ) {
          logger.debug(
            '---------------------- Burst of ' +
              desiredParameters.burst +
              ' connections finished ----------------------'
          )
          await Promise.all(createdMutexes)
          createdMutexes.length = 0
          await sleep(desiredParameters.wait)
          continue
        }
      }

      if (createdMutexes.length) {
        await Promise.all(createdMutexes)
      }

      // change desired number to 0 if timeout
      if (Date.now() > testTimeout) {
        desiredParameters.peers = 0
        refreshMetrics()
      }

      // async wait to prevent infinite loops
      await sleep(100)
    }

    for (const socket of connectedSockets) {
      socket.stop()
    }
  }

  return {
    async start() {
      mainLoop().catch((err) => {
        logger.error(err)
        process.exit(1)
      })
    },
    setDesiredAmount(params) {
      desiredParameters.peers = params.peers
      desiredParameters.burst = params.burst
      desiredParameters.wait = params.wait
      testTimeout = Date.now() + params.timeout
      refreshMetrics()
    },
    async stop() {
      loopRunning = false
    },
    getSockets() {
      return new Set(sockets)
    },
    getConnectedSockets() {
      return new Set(connectedSockets)
    }
  }
}
