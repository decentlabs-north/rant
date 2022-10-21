import Feed from 'picofeed'
import PrivateKernel from '../blockend/kernel.js'
import PublicKernel from '../blockend/public-kernel.js'
import { MemoryLevel } from 'memory-level'

export function makeDB () {
  return new MemoryLevel('rant.lvl', { keyEncoding: 'buffer', valueEncoding: 'buffer' })
}

export async function spawnSwarm (...peers) {
  const kernels = []
  let prev = null
  for (const p of peers) {
    const k = await spawnPeer(p)
    // connect all peers in series
    if (prev) prev.spawnWire({ client: true }).open(k.spawnWire())
    prev = k
    kernels.push(k)
  }
  return kernels
}

export async function spawnPeer (name) {
  const db = makeDB()
  const pubDB = db.sublevel('pub', { keyEncoding: 'buffer', valueEncoding: 'buffer' })
  const clock = new TestClock()
  const prv = new PrivateKernel(db)
  const pub = new PublicKernel(pubDB, clock.now.bind(clock))
  await prv.boot()
  await pub.boot()
  return {
    prv,
    pub,
    clock,
    spawnWire () {
      return pub.spawnWire()
    },
    async post (text) {
      await prv.checkout(null)
      await prv.setText(text || `${name}: Hello`)
      const id = await prv.commit(1)
      const rant = Feed.from(await prv.pickle(id))
      await pub.dispatch(rant, true)
    }
  }
}

/**
 * A time travelling device
 */
export class TestClock {
  offset = 0
  now () { return Date.now() + this.offset }
  fwd (minutes) { this.offset += minutes * 60000 }
  bwd (minutes) { this.offset -= minutes * 60000 }
}

/**
 * Tests that all nodejs async callbacks have finished
 * and all sockets are closed.
 */
export function noPending (t) {
  const reqs = process._getActiveRequests()
  const handles = process._getActiveHandles()
  if (reqs.length) t.notOk(reqs, 'Pending Requests')
  else if (handles.length) t.notOk(handles, 'Pending Handles')
  else t.pass('Node:event-loop is not blocked')
}
