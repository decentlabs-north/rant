import test from 'tape'
import { MemoryLevel } from 'memory-level'
import Kernel from '../blockend/kernel.js'
import {
  encode,
  decode,
  extractTitle,
  extractExcerpt,
  extractIcon
} from '../blockend/picocard.js'
import { randomBytes } from 'node:crypto'
import { get, until } from 'piconuro'

test('Describe flow', async t => {
  const k = new Kernel(makeDB())
  await k.boot()
  t.notOk(get(k.$rant()).id) // current -> undefined
  // Create new Rant
  await k.checkout(null) // makes new.
  let rant = get(k.$rant())
  t.equal(rant.id, 'draft:0', 'generates draft id')
  t.equal(rant.state, 'draft', 'rant is in state "draft"')

  await k.setText('# Hack\nworld is not hackable')
  await k.setTheme(1)
  await k.setText('# Hack\nworld is not hackable\nit is soft')

  rant = get(k.$rant())
  t.equal(rant.text, '# Hack\nworld is not hackable\nit is soft', 'update text works')
  t.equal(rant.theme, 1, 'setting theme works')
  const id = await k.commit()
  rant = get(k.$rant())
  t.equal(rant.state, 'signed', 'rant state changed to signed')
  t.ok(rant.author, 'has author pk')
  t.equal(get(k.$rants()).length, 1, '1 rant in the list')
  const url = await k.pickle()
  t.ok(url)

  const k2 = new Kernel(makeDB())
  await k2.boot()
  // When loading from hash
  const impId = await k2.import(`https://xor.cry/${url}`) // dispatch(Feed.from(hash))
  t.ok(id.equals(impId), 'id is same')
  rant = get(k2.$rant()) // imported
  t.equal(rant.title, 'Hack', 'title Imported')
  t.ok(rant.decrypted, 'Not encrypted')
  t.equal(rant.state, 'signed', 'state is "signed"')
  // Enjoy rant.text
})

test('serialization', async t => {
  const text = '# Hello World'
  const buffer = encode({ text, theme: 1, page: 4 })
  t.ok(Buffer.isBuffer(buffer))
  const r = decode(buffer)
  t.ok(r.date)
  t.equal(r.theme, 1)
  t.equal(r.text, text)
  t.equal(r.page, 4)
})

test.skip('secret box encryption', async t => {
  const text = 'Bob is a bastard'
  const secret = randomBytes(32)
  const b = await encode({ text, encryption: 1 }, secret)
  t.ok(Buffer.isBuffer(b))
  let card
  try {
    card = await decode(b)
  } catch (err) {
    t.fail(err)
  }
  card = await decode(b, secret)
  t.equal(card.text, text)
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
  const ex3 = '# !🥚! The Idea\nIt came to me when the time was right but the apple fell from the tree'
  t.equal(extractExcerpt(ex2), 'It came to me when the time was right bu')
  t.equal(extractExcerpt(ex3), extractExcerpt(ex2))
})

test('Icon extraction', async t => {
  const ex1 = '!🥚!\n# Hen &amp; Egg\nIs a well known problem'
  t.equal(extractIcon(ex1), '🥚')
  const ex2 = '# The Idea\nIt came to me when the time was right but the apple fell from the tree'
  t.notOk(extractIcon(ex2))
  const ex3 = '# !🥚! The Idea\nIt came to me when the time was right but the apple fell from the tree'
  t.equal(extractIcon(ex3), '🥚')
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
  t.equal(draft1[1], 'draft:0', 'checkout() returns previous id')
  const drafts = await k.drafts()
  t.equal(drafts.length, 1, 'Drafts length 1')
  rant = get(k.$rant())
  t.equal(rant.text, '', 'Blank rant')
  await k.setText('All is not lost')
  const draft2 = await k.checkout(draft1[1])
  t.equal(draft2[1], 'draft:1')
  rant = get(k.$rant())
  t.equal(rant.state, 'draft')
  t.equal(rant.text, 'Peer Up!')
})

test('Persistent Config', async t => {
  const k = new Kernel(makeDB())
  await k.boot()
  const [$v, setV] = k.config('theme', true)
  t.equal(get($v), true)
  setV(false)
  t.equal(get($v), false)
})

test('Delete Rants', async t => {
  const k = new Kernel(makeDB())
  await k.boot()
  await k.checkout(null)
  await k.setText('# Signed Rant')
  const rid = await k.commit()
  await k.checkout(null)
  await k.setText('# Draft Rant')
  await k.saveDraft()

  const did = get(k.$current)
  let drafts = await k.drafts()
  t.equal(drafts.length, 1)
  let rants = get(k.$rants())
  t.equal(rants.length, 1)

  await k.deleteRant(did)
  drafts = await k.drafts()
  t.equal(drafts.length, 0)

  await k.deleteRant(rid)
  rants = get(k.$rants())
  t.equal(rants.length, 0)
})

test('Delete others rants', async t => {
  const a = new Kernel(makeDB())
  await a.boot()
  await a.checkout(null)
  await a.setText('# Haha, you U cant delete me')
  await a.commit()

  const b = new Kernel(makeDB())
  await b.boot()
  const id = await b.import(await a.pickle())

  let rants = get(b.$rants())
  t.equal(rants.length, 1, 'Rant imported')

  await b.deleteRant(id)
  rants = get(b.$rants())
  t.equal(rants.length, 0, 'Imported rant Deleted')
})

test('... modem time', async t => {
  const a = new Kernel(makeDB())
  await a.boot()
  const b = new Kernel(makeDB())
  await b.boot()
  // Shit
  a.spawnWire().open(b.spawnWire())
  const text = 'This message was brought to you through the ether'
  await a.checkout(null)
  await a.setText(text)
  await a.commit()

  const rants = await until(b.$rants(), r => r.length)
  t.equal(rants.length, 1, 'Rant imported')
  t.equal(rants[0].text, text, 'Message transferred')
})

/**
 * Todo: move secondary kernel code from frontend to
  */
test('glue', async t => {
  const a = new Kernel(makeDB())
  await a.boot()
  const b = new Kernel(makeDB())
  await b.boot()
  // Shit
  const text = 'This message was brought to you through the ether'
  for (let i = 0; i < 10; i++) {
    await a.checkout(null)
    await a.setText(text)
    await a.commit()
  }

  a.spawnWire().open(b.spawnWire())
  const rants = await until(b.$rants(), r => r.length > 9)
  t.equal(rants.length, 10, 'Rant imported')
})

function makeDB () {
  return new MemoryLevel('rant.lvl', { keyEncoding: 'buffer', valueEncoding: 'buffer' })
}
