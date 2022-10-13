import test from 'tape'
import Feed from 'picofeed'
import PrivateKernel from '../blockend/kernel.js'
import PublicKernel from '../blockend/public-kernel.js'
import { MemoryLevel } from 'memory-level'
import { until, get } from 'piconuro'

test('A public board', async t => {
  const [a, b] = await spawnSwarm('Alice', 'Bob')
  const text = 'I need no money.'
  await a.post(text)
  let rants = get(a.pub.$rants())
  t.equals(rants.length, 1, 'Alice sees the rant')

  rants = await until(b.pub.$rants(), r => r.length)
  t.equal(rants.length, 1, 'Bob sees the rant')
  t.equal(rants[0].text, text, 'Message transferred')
})

test('Board message limit', async t => {
  const peers = await spawnSwarm('Alice', 'Bob', 'Charlie', 'Daphne', 'Gemma')
  // 5 peers * 11msgs, (5 msgs should overflow)
  for (const peer of peers) {
    for (let i = 0; i < 11; i++) await peer.post()
  }
  const rants = await until(
    peers[0].pub.$rants(),
    rs => rs.length >= 50
  )
  t.equals(rants.length, 50, 'Alice sees the 50rants and no more')
})

// Conensus draft. (TYPE_BUMP block)
test.skip('Bumping a post should induce stunlock-mechanics', async t => {
  const [a, b] = await spawnSwarm('Alice', 'Bob')
  const text = 'Halp! There is zombie in my bedroom!'
  const id = await a.post(text)

  // Now let's pretend there's a bump button calling:
  await a.pub.bump(id) // Appends a bump/poop block

  // Bumping constraints:
  // A post can be bumped only 1 once per unique peer.
  // A post can be bumped maximum 10 times.
  // If a bump -- too tired, need a whiteboard.
  // Longest non-settled bump-chain is used (conflict resolution policy)
})

function makeDB () {
  return new MemoryLevel('rant.lvl', { keyEncoding: 'buffer', valueEncoding: 'buffer' })
}

async function spawnSwarm (...peers) {
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

async function spawnPeer (name) {
  const db = makeDB()
  const pubDB = db.sublevel('pub', { keyEncoding: 'buffer', valueEncoding: 'buffer' })
  const prv = new PrivateKernel(db)
  const pub = new PublicKernel(pubDB)
  await prv.boot()
  await pub.boot()
  return {
    prv,
    pub,
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
 * Tests that all async callbacks have finished
 * and all sockets are closed
 */
export function noPending (t) {
  const reqs = process._getActiveRequests()
  const handles = process._getActiveHandles()
  if (reqs.length) t.notOk(reqs, 'Pending Requests')
  else if (handles.length) t.notOk(handles, 'Pending Handles')
  else t.pass('Node:event-loop is not blocked')
}
