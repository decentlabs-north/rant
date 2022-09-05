import test from 'tape'
import { MemoryLevel } from 'memory-level'
import Kernel from './blockend/k.js'
import { pack, unpack, extractTitle, extractExcerpt } from './blockend/picocard.js'
import { next, get } from 'piconuro'

test('Describe flow', async t => {
  const k = new Kernel(makeDB())
  await k.boot()

  t.notOk(get(k.$rant())) // current -> undefined
  // Create new Rant
  await k.checkout(null) // makes new.
  let rant = get(k.$rant())
  t.equal(rant.state, 'draft')
  t.notOk(rant.pickle)
  await k.setText('# Hack\nworld is not hackable')
  await k.setTheme(1)
  await k.setText('# Hack\nworld is not hackable\nit is soft')
  rant = get(k.$rant())
  t.equal(rant.text, '# Hack\nworld is not hackable\nit is soft')
  t.equal(rant.theme, 1)
  const id = await k.commit()
  rant = get(k.$rant())
  t.equal(rant.state, 'signed')
  t.equal(get(k.$rants()).length, 1)
  const url = await next(k.$url(), 0)
  t.ok(url)

  const k2 = new Kernel(makeDB())
  await k2.boot()
  // When loading from hash
  const impId = await k2.import(`https://xor.cry/${url}`) // dispatch(Feed.from(hash))
  t.ok(id.equals(impId))
  rant = get(k2.$rant()) // imported
  t.equal(rant.title, 'Hack')
  t.ok(rant.decrypted, 'Not encrypted')
  t.equal(rant.state, 'signed')
  // Enjoy rant.text
})

test('serialization', async t => {
  const text = '# Hello World'
  const buffer = pack({ text, theme: 1, page: 4 })
  t.ok(Buffer.isBuffer(buffer))
  const r = unpack(buffer)
  t.ok(r.date)
  t.equal(r.theme, 1)
  t.equal(r.text, text)
  t.equal(r.page, 4)
})

test('title extraction', async t => {
  const ex1 = `
title
=====
some text
# 3nd title
`
  const ex2 = '\n\n# Text \n more stuff \n## more title'
  const ex3 = '# Hack\nworld is not hackable\nit is soft'
  t.equal(extractTitle(ex1), 'title')
  t.equal(extractTitle(ex2), 'Text')
  t.equal(extractTitle(ex3), 'Hack')

  // Filter out bigmoji
  const ex4 = '# !🥚! Hen &amp Egg'
  t.equal(extractTitle(ex4), 'Hen &amp Egg')
  const ex5 = '!🥚!\n# Hen &amp Egg'
  t.equal(extractTitle(ex5), 'Hen &amp Egg')
})

test('Excerpt extraction', async t => {
  const ex1 = '!🥚!\n# Hen &amp; Egg\nIs a well known problem'
  t.equal(extractExcerpt(ex1), 'Is a well known problem')
  const ex2 = '# The Idea\nIt came to me when the time was right but the apple fell from the tree'
  t.equal(extractExcerpt(ex2), 'It came to me when the time was right b')
})

test.skip('secret box encryption', t => {
  const { sk } = Postcard.signPair()
  const p = new Postcard()
  const text = 'Bob is a bastard'
  const secret = randomBytes(32)
  p.update({ text, secret }, sk) // preliminary api.
  const r = Postcard.from(p.pickle())
  t.equal(r.decrypt(secret), text)
  t.end()
})

test('Drafts are saved', async t => {
  const k = new Kernel(makeDB())
  await k.boot()

  await k.checkout(null)
  let rant = get(k.$rant())
  t.equal(rant.state, 'draft')
  await k.setText('Peer Up!')
  await k.setTheme(1)
  // back out
  const draft1 = await k.checkout(null)
  // use a simple local counter for unpublished notes.
  t.ok(Number.isFinite(draft1), 'checkout() returns previous id')
  rant = get(k.$rant())
  t.equal(rant.text, '')
  await k.setText('All is not lost')
  const draft2 = await k.checkout(draft1)
  t.equal(draft2, draft1 + 1)
  rant = get(k.$rant())
  t.equal(rant.state, 'draft')
  t.equal(rant.text, 'Peer Up!')
})

function makeDB () {
  return new MemoryLevel('rant.lvl', { keyEncoding: 'buffer', valueEncoding: 'buffer' })
}
