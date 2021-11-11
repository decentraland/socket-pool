import mitt from 'mitt'
import sinon from 'sinon'

import { createSocketPoolComponent } from '../src'
import { sleep } from '../src/utils'
import { SocketEvents, IComponents } from '../src/types'

type Stub<T extends keyof IComponents> = sinon.SinonStubbedInstance<
  IComponents[T]
>

let logs: Stub<'logs'>
let metrics: Stub<'metrics'>
let socketCreator: Stub<'socketCreator'>
let pool: ReturnType<typeof createSocketPoolComponent>
let stopCount = 0
let sandbox: sinon.SinonSandbox

beforeAll(() => {
  sandbox = sinon.createSandbox()
  logs = {
    getLogger: sandbox.stub().callsFake(() => ({
      debug: sandbox.stub(),
      error: sandbox.stub()
    })) as any
  }
  metrics = {
    decrement: sandbox.stub(),
    increment: sandbox.stub(),
    observe: sandbox.stub()
  } as typeof metrics
  socketCreator = {
    createSocket: sandbox.stub().callsFake(() => {
      const events = mitt<SocketEvents>()

      setTimeout(() => events.emit('connected'), 0)

      return {
        stop() {
          stopCount++
          events.emit('disconnected')
        },
        ...events
      }
    }) as any
  }
  pool = createSocketPoolComponent({ logs, socketCreator, metrics }, mapping)
  void pool.start({} as any)
})

beforeEach(async () => {
  pool.restart()
  stopCount = 0
})

afterEach(async () => {
  pool.setDesiredAmount({ peers: 0, timeout: 30000, burst: 0, wait: 0 })
  await sleep(250)
  void pool.stop()
  stopCount = 0
  sandbox.resetHistory()
})

const mapping = { desired: 'desire', connected: 'connected' } as const

describe('socket pool sanity flow', () => {
  it('should start and run without creating sockets', async () => {
    pool.setDesiredAmount({ peers: 0, timeout: 3000, burst: 0, wait: 0 })

    expect(pool.getSockets().size).toEqual(0)
    await sleep(100)
    await sleep(100)
    await sleep(100)
    expect(pool.getSockets().size).toEqual(0)
    expect(socketCreator.createSocket.callCount).toEqual(0)
  })

  it('should create ONE socket, and then destroy it', async () => {
    expect({
      stopCount,
      total: pool.getSockets().size,
      connected: pool.getConnectedSockets().size
    }).toEqual({
      stopCount: 0,
      total: 0,
      connected: 0
    })

    await sleep(100)
    pool.setDesiredAmount({ peers: 1, timeout: 3000, burst: 0, wait: 0 })

    await sleep(150)
    expect(socketCreator.createSocket.callCount).toEqual(1)
    expect({
      stopCount,
      total: pool.getSockets().size,
      connected: pool.getConnectedSockets().size
    }).toEqual({
      stopCount: 0,
      total: 1,
      connected: 1
    })

    await sleep(100)
    pool.setDesiredAmount({ peers: 0, timeout: 30000, burst: 0, wait: 0 })

    await sleep(250)
    expect({
      stopCount,
      total: pool.getSockets().size,
      connected: pool.getConnectedSockets().size
    }).toEqual({
      stopCount: 1,
      total: 0,
      connected: 0
    })
  })

  it('should create ONE socket, and then destroy it', async () => {
    expect(pool.getSockets().size).toEqual(0)
    await sleep(100)
    pool.setDesiredAmount({ peers: 1, timeout: 3000, burst: 0, wait: 0 })
    await sleep(150)
    expect(pool.getSockets().size).toEqual(1)
    expect(socketCreator.createSocket.callCount).toEqual(1)
    await sleep(100)
    pool.setDesiredAmount({ peers: 0, timeout: 30000, burst: 0, wait: 0 })
    await sleep(150)
    expect(pool.getSockets().size).toEqual(0)
    expect(socketCreator.createSocket.callCount).toEqual(1)
    expect({ stopCount }).toEqual({ stopCount: 1 })
  })

  it('should create 100 sockets, and then destroy 50', async () => {
    expect(pool.getSockets().size).toEqual(0)
    await sleep(100)
    pool.setDesiredAmount({ peers: 100, timeout: 3000, burst: 0, wait: 0 })

    await sleep(1000)
    expect(pool.getSockets().size).toEqual(100)
    expect(socketCreator.createSocket.callCount).toEqual(100)

    pool.setDesiredAmount({ peers: 50, timeout: 30000, burst: 0, wait: 0 })
    await sleep(150)
    expect(pool.getSockets().size).toEqual(50)
    expect({ stopCount }).toEqual({ stopCount: 50 })
    await sleep(1000)
  })

  it('should create 10 sockets, timeout and destroy them', async () => {
    expect(pool.getSockets().size).toEqual(0)
    pool.setDesiredAmount({ peers: 10, timeout: 1000, burst: 0, wait: 0 })
    await sleep(250)
    expect(pool.getSockets().size).toEqual(10)
    expect(socketCreator.createSocket.callCount).toEqual(10)

    // wait for timeout
    await sleep(2000)
    expect(pool.getSockets().size).toEqual(0)
    expect({ stopCount }).toEqual({ stopCount: 10 })
  })
})
