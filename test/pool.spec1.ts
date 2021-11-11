import mitt from 'mitt'
import { SocketEvents } from '../src/types'
import { sleep } from '../src/utils'
import { test } from './components'

let stopCount = 0

test('socket pool sanity flow', ({ components, stubComponents }) => {
  beforeEach(() => {
    stopCount = 0
    stubComponents.socketCreator.createSocket.callsFake(() => {
      const events = mitt<SocketEvents>()

      setTimeout(() => events.emit('connected'), 0)

      return {
        stop() {
          stopCount++
          events.emit('disconnected')
        },
        ...events
      }
    })
  })

  it('should start and run without creating sockets', async () => {
    const { pool } = components
    const { socketCreator } = stubComponents

    pool.setDesiredAmount({ peers: 0, timeout: 3000, burst: 0, wait: 0 })

    expect(pool.getSockets().size).toEqual(0)
    await sleep(100)
    await sleep(100)
    await sleep(100)
    expect(pool.getSockets().size).toEqual(0)
    expect(socketCreator.createSocket.callCount).toEqual(0)
  })

  it('should create ONE socket, and then destroy it', async () => {
    const { pool } = components
    const { socketCreator } = stubComponents

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
    expect({ stopCount }).toEqual({ stopCount: 1 })
  })

  it('should create 100 sockets, and then destroy 50', async () => {
    const { pool } = components
    const { socketCreator } = stubComponents

    expect(pool.getSockets().size).toEqual(0)
    await sleep(100)
    pool.setDesiredAmount({ peers: 100, timeout: 3000, burst: 0, wait: 0 })

    await sleep(1000)
    expect(pool.getSockets().size).toEqual(100)
    expect(socketCreator.createSocket.callCount).toEqual(100)

    pool.setDesiredAmount({ peers: 50, timeout: 1000, burst: 0, wait: 0 })
    await sleep(150)
    expect(pool.getSockets().size).toEqual(50)
    expect({ stopCount }).toEqual({ stopCount: 50 })
    pool.setDesiredAmount({ peers: 0, timeout: 1000, burst: 0, wait: 0 })
    await sleep(1000)
  })

  it('should create 10 sockets, and then timeout and destroy them', async () => {
    const { pool } = components
    console.log(pool.getSockets().size)
    const { socketCreator } = stubComponents

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
