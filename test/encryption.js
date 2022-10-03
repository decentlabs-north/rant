import test from 'tape'
import { MemoryLevel } from 'memory-level'
import Kernel from '../blockend/kernel.js'
// import { encrypt, decrypt } from '../blockend/picocard.js'
import { get } from 'piconuro'

test('Encrypt Rant', async t => {
  const message = 'sample message'
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
  await k.setText(message)
  await k.setTheme(1)
  // set encryption level 1 (KeyPad)
  await k.setEncryption(1)
  // set secret
  await k.setSecret($secret)

  rant = get(k.$rant())
  t.equal(rant.text, message)
  t.equal(rant.theme, 1)
  t.equal(rant.encryption, 1)
  const id = await k.commit()
  rant = get(k.$rant())
  t.equal(rant.state, 'signed')
  t.ok(rant.author)
  t.equal(get(k.$rants()).length, 1)
  const url = await k.pickle()
  t.ok(url)

  const k2 = new Kernel(makeDB())
  await k2.boot()
  // set secret
  await k2.setSecret($secret)
  // When loading from hash
  const impId = await k2.import(`https://xor.cry/${url}`) // dispatch(Feed.from(hash))
  t.ok(id.equals(impId))
  rant = get(k2.$rant()) // imported
  console.log(rant.decrypted)
  t.ok(rant.decrypted, 'Not encrypted')

  t.equal(rant.secret, '1337')

  t.equal(rant.state, 'signed')
  t.equal(rant.text, message)
  console.log('decryptedMessage: ', rant.text)
  // Enjoy rant.text
})

/**
 * Testing basic Encryption/Decryption
 */

// test('Basic Encrypt/Decrypt', async t => {
//   const message = '# Hack\nworld is not hackable\nit is soft'
//   const secret = '1337'

//   const encrypted = encrypt(message, secret)
//   console.log('Encrypted: ', encrypted)

//   const decryptTimeout = new Date().setSeconds(new Date().getSeconds() + 10)

//   const decrypted = await decrypt(encrypted, secret, decryptTimeout)
//   console.log('Decrypted: ', decrypted)
//   t.equal(decrypted, message)
// })

function makeDB () {
  return new MemoryLevel('rant.lvl', { keyEncoding: 'buffer', valueEncoding: 'buffer' })
}
