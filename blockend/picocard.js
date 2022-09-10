/** This file contains
 * our model 'Picocard' and all
 * of the functions needed to work with it.
 * It was originally called 'Rant',
 * Then it became Postcard
 * And now it's seems that Postcard is dead and Picocard/card
 * is referenced in this file only. kernel uses rant&draft naming.
 */
import { marked } from 'marked'
import Purify from 'dompurify'
import lzutf8 from 'lzutf8'
import lzString from 'lz-string'
import { pack as mpack, unpack as munpack } from 'msgpackr'
import { Feed } from 'picostack'

export const THEMES = [
  'dark',
  'light',
  'decent',
  'morpheus',
  'ghostwriter',
  'disco'
]

// const { encrypt, decrypt } = require('cryptology')
const { compress, decompress } = lzutf8
const { compressToUint8Array, decompressFromUint8Array } = lzString
function encrypt (message, secret) {}
function decrypt (message, secret) {}

// 10kB accurate version: https://github.com/mathiasbynens/emoji-regex/blob/master/index.js
export const EMOJI_REGEXP = /!([FLDd~|/.-]{0,4})([^!\n .}]{1,8})!/

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

// Temporary solution for unpacking static content.
export function unpackFeed (pickle, secret) {
  const f = Feed.from(pickle)
  return unpack(f.first.body, secret)
}

export function extractTitle (md) {
  if (typeof md !== 'string' && !md.length) return
  // Not sure how robust theese regexes are, feel free to improve.
  let title = ''

  let m = md.match(/^\s*(.+)\s*\n==+/m)
  if (!m) m = md.match(/^#+(.+)$/m)
  if (m) {
    title = m[1]
    if (this) this.rawOffset = m.index + m[0].length
  }
  return title.replace(new RegExp(EMOJI_REGEXP, 'g'), '').trim()
}
export function extractIcon (md) {
  if (typeof md !== 'string' && !md.length) return
  const m = md.match(EMOJI_REGEXP)
  if (m) return m[2].trim()
}

export function extractExcerpt (md, len = 40) {
  if (typeof md !== 'string' && !md.length) return
  const bucket = {}
  extractTitle.bind(bucket)(md)
  return md.substr(bucket.rawOffset + 1, Math.min(md.length, len))
    .replace(/[\n#`*_[\]]/g, '') // Strip out md markup
    .trim()
}

// block-quote string template
export function bq (str, ...tokens) {
  str = [...str]
  for (let i = tokens.length; i > 0; i--) str.splice(i, 0, tokens.pop())
  return str.join('').split('\n').map(t => t.trim()).join('\n').trim()
}

export function runMacros (text, card) {
  if (typeof text !== 'string') throw new Error(`Expected text to be a string, got: ${typeof text}`)

  // Make big emojis
  const MODIFIERS = {
    '.': '',
    '~': 'wave',
    '-': 'dash',
    '/': 'sway',
    '|': 'bounce',
    L: 'acid',
    F: 'flicker',
    D: 'dance',
    d: 'dig'
  }
  text = text.replace(
    new RegExp(EMOJI_REGEXP, 'g'),
    sub => {
      const match = sub.match(EMOJI_REGEXP)
      const mod = match[1]
      const moji = match[2]
      // console.log('MOJI match', _, '=> [', mod, ', ', moji, ']', sub, match)
      const classes = mod.split('').map(m => MODIFIERS[m]).join(' ')
      return `<bmoji class="${classes}">${moji}</bmoji>`
    }
  )

  // Macros that use the card
  if (!card) return text
  // Show date-of note
  text = text.replace(/\{\{DATE\}\}/gi, new Date(card.date))

  return text
}

export function processText (text) {
  // TODO: run purify in kernel#validators
  text = text.replace(/\B(#{1,6})= ([^\n]+)/g, '$1 <div class="text-center">$2</div>')
  // Preprocess
  text = Purify.sanitize(
    marked(text)
  )
  // Postprocess
  return runMacros(text)
}
