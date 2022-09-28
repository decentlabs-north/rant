import test from 'tape'
import { MemoryLevel } from 'memory-level'
import Kernel from './blockend/kernel.js'
import { pack, unpack, extractTitle, extractExcerpt, extractIcon } from './blockend/picocard.js'
import { get, until } from 'piconuro'

test('Encrypt Rant', async t => {
  const k = new Kernel(makeDB())
  await k.boot()
  const $secret = '1337'
  k.setSecret($secret)
  t.notOk(get(k.$rant()).id) // current -> undefined
  // Create new Rant
  await k.checkout(null) // makes new.
  let rant = get(k.$rant())
  t.equal(rant.id, 'draft:0')
  t.equal(rant.state, 'draft')
  await k.setText('# Hack\nworld is not hackable')
  await k.setTheme(1)
  await k.setText('# Hack\nworld is not hackable\nit is soft')
  // set encryption level 1 (KeyPad)
  await k.setEncryption(1)
  // set secret
  await k.setSecret($secret)

  rant = get(k.$rant())
  t.equal(rant.text, '# Hack\nworld is not hackable\nit is soft')
  t.equal(rant.theme, 1)
  t.equal(rant.encryption, 1)

  rant = get(k.$rant())
  t.equal(rant.text, '# Hack\nworld is not hackable\nit is soft')
  t.equal(rant.theme, 1)
  const id = await k.commit()
  rant = get(k.$rant())
  t.equal(rant.state, 'signed')
  t.ok(rant.author)
  t.equal(get(k.$rants()).length, 1)
  const url = await k.pickle()
  t.ok(url)

  const k2 = new Kernel(makeDB())
  await k2.boot()
  // When loading from hash
  const impId = await k2.import(`https://xor.cry/${url}`) // dispatch(Feed.from(hash))
  t.ok(id.equals(impId))
  rant = get(k2.$rant()) // imported
  console.log(rant.decrypted)
  t.ok(rant.decrypted, 'Not encrypted')
  t.equal(rant.state, 'signed')
  t.equal(rant.text, '# Hack\nworld is not hackable\nit is soft')
  // Enjoy rant.text
})
function makeDB () {
  return new MemoryLevel('rant.lvl', { keyEncoding: 'buffer', valueEncoding: 'buffer' })
}
