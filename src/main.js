import { writable } from 'svelte/store'
import { Identity } from 'cryptology'
import Feed from 'picofeed'
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
const starterSample = `
# 💌 1kilo.rant

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

## Let's demo some markup:
**Bold** _italics_ [links]()
![images](https://mytrackerbadge)

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
Well that's about it. about 10minutes read tops! 🍑
`
const rant = writable(starterSample)

const app = new App({
	target: document.body,
	props: {
		uid,
    rant,
    theme,
    state
	}
})

export default app
