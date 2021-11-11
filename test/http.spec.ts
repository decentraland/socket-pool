import { sleep } from '../src/utils'
import { test } from './components'

test('http socket pool flow', ({ components }) => {
  it('should create ONE socket, and then destroy it', async () => {
    const { pool, fetch } = components

    expect(pool.getSockets().size).toEqual(0)
    const body = { peers: 1, timeout: 3000, burst: 0, wait: 0 }
    await fetch.fetch('/pool-route', {
      method: 'POST',
      body: JSON.stringify(body)
    })
    await sleep(150)
    expect(pool.getSockets().size).toEqual(1)
    await fetch.fetch('/pool-route', {
      method: 'POST',
      body: JSON.stringify({ ...body, peers: 0 })
    })
    await sleep(1500)
    expect(pool.getSockets().size).toEqual(0)
  })
})
