import { IHttpServerComponent } from '@well-known-components/interfaces'
import { IComponents } from './types'

export type HandlerContext = IHttpServerComponent.DefaultContext<{
  components: Pick<IComponents, 'pool' | 'logs'>
}>

/**
 * Http handler for pool params.
 * @public
 */
export async function poolHandler(context: HandlerContext) {
  const { peers, timeout, burst, wait } = await context.request.json()

  if (isNaN(peers) || peers < 0 || (peers | 0) != peers)
    return {
      status: 400,
      body: 'invalid peers'
    }

  if (isNaN(timeout) || timeout < 0 || (timeout | 0) != timeout)
    return {
      status: 400,
      body: 'invalid timeout'
    }

  if (isNaN(burst) || burst < 0 || (burst | 0) != burst)
    return {
      status: 400,
      body: 'invalid burst'
    }

  if (isNaN(wait) || (wait | 0) != wait)
    return {
      status: 400,
      body: 'invalid wait'
    }

  const logger = context.components.logs.getLogger('run-test-handler')

  const options = {
    peers: parseInt(peers),
    timeout: parseInt(timeout),
    burst: parseInt(burst),
    wait: parseInt(wait)
  }
  context.components.pool.setDesiredAmount(options)

  logger.info('running lighthouse test', { peers, timeout })

  return {
    body: {
      peers,
      timeout
    }
  }
}
