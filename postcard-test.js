const test = require('tape')
const Postcard = require('./src/postcard')

test('serlization', t => {
  const { pk, sk } = Postcard.signPair()
  const p = new Postcard()
  // p.date is p.version
  const text = '# Hello World'
  const packedSize = p.update({text , theme: 1 }, sk)
  t.ok(p.key.equals(pk))
  t.ok(p.date)
  const r = Postcard.from(p.pickle())
  t.ok(r.key.equals(p.key))
  t.equal(r.theme, 1)
  t.ok(r.date)
  t.equal(r.text, text)
  t.end()
})

test('title extraction', t => {
  const { sk } = Postcard.signPair()
  const p = new Postcard()
  const ex1 = `
title
=====
some text
`
  const ex2 = `\n\n# Text \n more stuff`

  p.update({text: ex1}, sk)
  t.equal(p.title, 'title')
  p.update({text: ex2}, sk)
  t.equal(p.title, 'Text')
  t.end()
})

