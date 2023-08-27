import test from 'tape'
import { until, get } from 'piconuro'
import { spawnSwarm } from './helpers.js'

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

test('Rants have a lifetime of 1hour', async t => {
  const [a, b] = await spawnSwarm('Alice', 'Bob')
  const text = 'I have a guitar'
  await a.post(text)
  let rants = await until(b.pub.$rants(), r => r.length)
  t.equal(rants.length, 1, 'Bob sees the rant')

  // Timetravel 1 hour into future
  b.clock.fwd(60)

  const dropped = await b.pub.gc(b.clock.now())
  t.equal(dropped.length, 1, 'One chain discarded')

  rants = get(b.pub.$rants())
  t.equal(rants.length, 0, 'Rant was garbage collected')
})

test('Board message limit', async t => {
  const peers = await spawnSwarm('Alice', 'Bob', 'Charlie', 'Daphne', 'Gemma')
  // 5 peers * 11msgs = 55 unique, should cause overflow
  for (const peer of peers) {
    for (let i = 0; i < 11; i++) await peer.post()
  }
  let rants = await until(
    peers[0].pub.$rants(),
    rs => rs.length >= 50
  )
  const b = peers[0]
  const dropped = await b.pub.gc(b.clock.now())
  t.ok(dropped.length > 1, `Discarded ${dropped.lenght}`)
  rants = get(b.pub.$rants())
  t.equals(rants.length, 50, 'Alice sees the 50rants and no more')
})

test.only('Kernel resolves bump conflicts', async t => {
  const [a, b, c, d] = await spawnSwarm('Alice', 'Bob', 'Charlie', 'Daphne')
  const id = await a.post('Cats are cool')
  await until(c.pub.$rants(), rs => rs.find(r => r.id.equals(id)))
  await Promise.all([
    b.pub.bump(id),
    c.pub.bump(id),
    d.pub.bump(id)
  ]) // race for conflict. can't do in tests with preconnected peers..
  // TODO: pubkernel.onblocks(feed => {
  //  ¸¸
  // })

  // Now let's pretend there's a bump button calling:
  await a.pub.bump(id) // Appends a bump/poop block
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
