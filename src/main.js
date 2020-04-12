import { writable, derived, readable } from 'svelte/store'
import { Identity } from 'cryptology'
import Feed from 'picofeed'
import { RantMessage } from './messages'
import { compress } from 'lzutf8'
import { compressToUint8Array } from 'lz-string'
import dbnc from 'debounce'

import App from './App.svelte'
// Todo: turn this into standalone-module
const initIdentity = () => {
  const stored = localStorage.getItem('identity')
  if (!stored) {
    const id = new Identity()
    window.localStorage.setItem('identity', Identity.encode(id))
    console.info('new identity generated')
    return id
  } else {
    console.info('loading existing identity')
    return Identity.decode(stored)
  }
}
const uid = initIdentity()
// --- end of uid

const state = writable(0)
const theme = writable(0)
const rant = writable(SampleMessage())
const feed = new Feed(null, { secretKey: uid.sig.sec, contentEncoding: RantMessage })

const stats = readable({}, set => {
  const pack = dbnc(([$rant, $theme]) => {
    if (!$rant.length) return
    // Let's waste some memory and cpu
    // and pick the algo that offers the best space efficiency
    const candidates = [
      Buffer.from($rant, 'utf8'),
      compress(Buffer.from($rant, 'utf8')),
      compressToUint8Array($rant)
    ]
    const winrar = [ ...candidates ].sort((a, b) => a.length > b.length)[0]
    const compression = candidates.indexOf(winrar)
    feed.truncate(0) // empty the bottle
    feed.append({
      card: {
        theme: $theme,
        date: new Date().getTime(),
        text: Buffer.from(winrar),
        compression
      }
    })
    const pickle = feed.pickle()
    window.location.hash = pickle
    set({
      pickle,
      compression,
      compressionRatio: winrar.length / candidates[0].length,
      size: winrar.length
    })
  }, 1000)
  return derived([rant, theme], v => v)
    .subscribe(v => pack(v))
})

const app = new App({
	target: document.body,
	props: {
		uid,
    rant,
    theme,
    state,
    stats
	}
})

export default app


function SampleMessage () {
  return `# 💌 1kilo.rant

## 🎉 Welcome!
This App is the equivalent of a digital Postcard.

## 💾 1 Kilo Byte
Just like a real postcard, there's a limit to how much information it can fit.
This postcard is limited to \`1 kilo byte\` of text, how much is that?

You see, this message lives entierly inside the URL - no database needed!

If we further imbue this card with the magical powers of Cryptography.
Then we get a tool that can be used for:

- It can fit a secret love letter.
- You can flip someone off.
- Start a revolution.
- Decide where to eat next.

## Plain text
Just because we're writing in plain text mean that it has to look boring!
We have full markdown support.
Using the theme-selector above you can choose the color of your postcard.

Ok we have about 300 bytes remaining.

## Demo

**Bold** _italics_ [links]()
![images](https://mytrackerbadge)

# h1
## h2
### h3
#### h4
##### h5

| name | type | age |
|-|-|-|
|tables|are|cool|
|right?|kek|42|
|ben|kek|doh|

- [ ] CSS markdown
- [ ] Theme selector
- [ ] Signatures
- [ ] Verification
- [ ] Pico-merge
- [ ] Collab Patch

\`\`\`bash
// codeblocks
$ sudo rm -rf /
\`\`\`

## Final bytes
Well that's about it. about 10minutes read tops! 🍑
`

}
