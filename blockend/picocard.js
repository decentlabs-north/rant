import lzutf8 from 'lzutf8'
import lzString from 'lz-string'
import { pack as mpack, unpack as munpack } from 'msgpackr'
// const { encrypt, decrypt } = require('cryptology')
const { compress, decompress } = lzutf8
const { compressToUint8Array, decompressFromUint8Array } = lzString
function encrypt (message, secret) {}
function decrypt (message, secret) {}

export function pack (props, secret) {
  if (!props) throw new Error('Expeceted Props')
  const { date, page, theme, type } = props
  if (typeof props.text !== 'string' || !props.text.length) throw new Error('Expected text')

  const text = props.text // Prepack transforms
    .replace(/\r/, '') // Unecessary CRLF
  // .replace(/ {4}/, '\t') // most likely annoy more people than it saves space.

  // pick the algo that offers the best space efficiency
  const candidates = [
    Buffer.from(text, 'utf8'),
    compress(Buffer.from(text, 'utf8')),
    compressToUint8Array(text)
  ]
  const winrar = [...candidates].sort((a, b) => a.length > b.length)[0]
  // leave a note of what type of compression was used.
  const z = candidates.indexOf(winrar)
  let t = Buffer.from(winrar)
  let x = 0
  if (secret) {
    x = 1
    t = encrypt(t, secret)
  }

  const card = {
    b: type || 0,
    t,
    z, // compression
    x, // encryption
    l: theme || 0,
    d: date || Date.now(),
    s: page || 0
  }
  return mpack(card)
}

export function unpack (buffer, secret) {
  const card = munpack(buffer)
  const decompressors = [
    i => i.toString('utf8'),
    decompress,
    decompressFromUint8Array
  ]
  let text
  switch (card.x) {
    case 0:
      text = card.t
      break // plain yay!
    case 1: // secret_box encryption
      if (!secret) throw new Error('ContentEncrypted')
      text = decrypt(card.t, secret)
      break
    default:
      throw new Error('UnknownEncryption')
  }
  text = decompressors[card.z](text)
  return {
    type: card.b,
    text,
    date: card.d,
    compression: card.z,
    encryption: card.x,
    theme: card.l,
    page: card.s
  }
}

export function extractTitle (md) {
  if (!md && !md.length) return
  // Not sure how robust theese regexes are, feel free to improve.
  const m1 = md.match(/^\s*(.+)\s*\n==+/m)
  if (m1) return m1[1].trim()
  const m2 = md.match(/^#+(.+)$/m)
  if (m2) return m2[1].trim()
}
