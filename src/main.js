import { writable, derived, readable } from 'svelte/store'
import { Identity } from 'cryptology'
import dbnc from 'debounce'
import Postcard from './postcard'
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
const card = new Postcard()
try {
  const url = new URL(window.location)
  card.merge(url.hash.length ? url : sample())
} catch (err) {
  console.warn('Failed to load URL', err)
  console.info('Loading default sample')
  card.merge(sample())
}

const theme = writable(0)
const rant = writable('')

if (card.length) {
  theme.set(card.theme)
  rant.set(card.text)
}

/* this is actually the state of the model */
const cardStore = readable({size: 0, key: ''}, set => {
  const clear = () => {
    card.truncate(0)
    rant.set('')
  }

  const pack = dbnc(([$text, $theme]) => {
    if (!$text.length) return
    const size = card.update({ text: $text, theme: $theme }, uid.sig.sec)
    const pickle = card.pickle()
    const title = card.title
    const fancyPickle = !title ? pickle
      : `${encodeURIComponent(title.replace(/ +/g, '_'))}-${pickle}`
    window.location.hash = fancyPickle // Does this leak our rant to gogoolôgug?
    set({
      id: card.id,
      date: card.date,
      key: card.key,
      pickle,
      ratio: $text.length / size,
      size,
      clear
    })
  }, 500)

  return derived([rant, theme], v => v)
    .subscribe(v => pack(v))
})

const app = new App({
	target: document.body,
	props: {
		uid,
    rant,
    theme,
    card: cardStore
	}
})

export default app

function sample () {
  // Var tests
  return '#PIC0.K0.7zymSDZ4Zlvrsr4aQ6GXj_g2QpIK6HGflAT3DDkxrZUB0.6MV_amWKyS9NCtotVTZfV14B5Yu2ydwAQAkMqfO_X8uUcLfHGa-z5RgMKmLsBN9IF61sDXooRTWAzBgJKI1zAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADECsEBCKj7ntGXLhAAGq4BVGl0bGUKPcQBCgojIFRvcGljCgpgV3JpdHRlbiB7e0RBVEV9fWAKClRoaXMgdGV4dCBpcyBzdG9yZWQgaW4gYSBwaWNrbGUgZmXEESBtZWFuIFtQaWNvxBFdKGh0dHBzOi8vZ2l0aHViLmNvbS90ZWxhbW9uL3DHJSkuCgoKe3tDQVBBQ0lUWX19CgpTaWduZWTEFk5BTUXEEnt7UEt9fSB7e0dMWVBISUNPTn19IAEoADDRLQ'
  // The welcome letter
  // return '#PIC0.K0.7zymSDZ4Zlvrsr4aQ6GXj_g2QpIK6HGflAT3DDkxrZUB0.w_-hP8wwfMF98OqISwpIeKfpbUnb2S3onht5Lwbwb5IKT1i7l_JUr1mcdHiLeWniT8bQ5xkyNFzL1yRWJwBSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAORCo4HCIeIiL+XLhAAGoAHMQAkvBuDE7IIwNYJYBsD2A6ATgQwHYBcBQ+wogPBuCR+yAOoCmiAxsgLbUCE+AKgBbwDOIAggAdBIXiFydqIagEcArvABumRNTwhkAMxCYQAE3gBzeLhUgACsh646mdHtSFi4QH07MEAGkkyEACEAnrjU+ABSctYgiPCwUrro1GaCVjZ2egA04pLxAOR8ulGMJuI+nMgA7iCMcnScotiayOiMmLjwyNiiuCC2HZomjlxiSda29qJ8BSbUesUgAAbQIAgoIABGgdRzGtpBAB64GaUVVTXjmS0A_IQAmshyIDzU1BkSYsw8PJiGUlGK1HxqVrUdCIfx1HjwPRSCRSACqACUADIgAC0IGwPj0LUwq0wj3RTyhejY+AAktoylJNHJ0DD0KJGKs5NDuHxRjMyiZajDKl94LZECAkpT0HwtCAAMLofyCXDIQxYQScfwDSQdSkgb5dXRy5CCiQtbo4NZScLTEANdAALkIaNJXR6FqKukedHiXRQf0i1FwQXQjjRt3ujs0UREPCY1HaUi0mgDIAAyqZaToQPFFHq5K12vGACLUOiQqRlLLQnwJLrYaj7RxEUDmRCYeAdPYEMIRVYFzBmkCU7LxXvoEzNwx1IWN5viatdZjGg1dIqcPGzFDIWBrRojtg0EBLr3UxCC5roWB6codHhyYSNXCOWEQ7Cjnkw5gox6qOhy+k45Be_x3I0OhqZArBZKQGBQelxX_GkhWSdlawAeXXDU91iVY7i6ABmAAGHC1g2Ph4maZsR1rZx80YZBCAAKho3w9T0OiQAAfRMFR+R4FiQAAbSibBYB4ABdAAKABKfAWB4+Bmm+YSRM4X1BB4K0AHpVMYQIsDoGJ0FxPRvgkohd2gOtdwAJjrUBOCwqzrIAFjs6yAFZCAAH3RTBmBADzcBlKQPK+AL8DclFQvCkLTFWVQeDcuxqDchg9TckKh0MRSLjcmJYDc+zzJStzO2wLLqBys9OBS_A0R4kAhMlBME15E8zzKbAqt42qQC4ahvPfAsv3amq6oTIxsBaGl_kGzqADVgXgPpbGzNrqs68x+WQFFmHQb4prqiU9UbVYLBaGpCDmc7cR4Th8HU7pkChaLkB0nh8AAEgeOQzzTRhUXQbRVPwc65icUAADFmzMdYghemhD3OXBch0DCs06VAkcwmAcMKbAs3+NMEhmOVlJYEASEARX38CAAgAg'
}

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
// My first kilo.rant yeah!
//
const tmp = `
<3 1kilo.rant <3

I don't know why or if you like it, but if you do, then
I am glad!

I can tell you why I feel happy when I use picorant.

It's all because of the comfty zen:

All lines of code written in publicly verifiable and assertable GNU AGPL,
and not a single network connection, no analytics, no ads,
no notifications - just a momentary silence on the screen.

It's so beautifully calm,
that I dare to momentarily write my thoughts here,
just to look at them for a moment and reflect
upon their meaning before I proceed to publish or erase.

The application has been scraped bare of any annoyances,
staying below 256kb in application size - A similar
limitation to summarizing your day on 1kb.

Like recording your state on a post card
during a journey.

_You have to make choices_, often healthy and curious choices.

Preferrably choose that which is most important to us,
or has potential to be in our future.

Polished simplicity shines the brightest.
`
}
