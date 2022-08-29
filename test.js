import test from 'tape'
// const Postcard = require('./src/postcard')
// const { randomBytes } = require('crypto')
import Kernel from './blockend/k.js'
import Postcard from './blockend/picocard.js'
import { MemoryLevel } from 'memory-level'
import { next } from 'piconuro'
import Feed from 'picofeed'
const { signPair } = Feed

test('A decent kernel', async t => {
  // WIP: Define workflow
  const k = new Kernel(makeDB())
  await k.boot()
  // 1. User works with Postcard class while editing.
  // 2. Finishes it by signing it.
  // 2a. Sends a link with with Postcard embedded in URL
  // 2b. Puts it in kernel as a hypermailbox/publish to swarm
  // ... no. 0.x alpha simple url->markdown->url.
  // including picostack here opens up possibility to make
  // a swarm-connected note-book, even comments
  // -- totally blowing the scope.
  const card = {
    text: '# Eff you world',
    theme: 1
  }
  await k.createRant(card)
  const rants = await next(k.$rants())
  t.ok(rants.length)
  t.equal(rants[0].text, card.text)
})

function makeDB () {
  return new MemoryLevel('rant.lvl', { keyEncoding: 'buffer', valueEncoding: 'buffer' })
}

test.only('serialization', t => {
  const { pk, sk } = signPair()
  const p = new Postcard()
  // p.date is p.version
  const text = '# Hello World'
  const packedSize = p.update({ text, theme: 1 }, sk)
  t.ok(p.key.equals(pk))
  t.ok(p.date)
  const r = Postcard.from(p.pickle())
  t.ok(r.key.equals(p.key))
  t.equal(r.theme, 1)
  t.ok(r.date)
  t.equal(r.text, text)
  t.end()
})

test.skip('title extraction', t => {
  const { sk } = signPair()
  const p = new Postcard()
  const ex1 = `
title
=====
some text
# 3nd title
`
  const ex2 = '\n\n# Text \n more stuff \n## more title'

  p.update({ text: ex1 }, sk)
  t.equal(p.title, 'title')
  p.update({ text: ex2 }, sk)
  t.equal(p.title, 'Text')
  t.end()
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
