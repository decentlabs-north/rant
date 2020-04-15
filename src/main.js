import { writable, derived, readable } from 'svelte/store'
import { Identity } from 'cryptology'
import dbnc from 'debounce'
import Postcard from './postcard'
import App from './App.svelte'
import { scrypt } from 'cryptology'
const NOCRYPT = 0
const PWCRYPT = 1
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
const editMode = writable(false)
const theme = writable(0)
const rant = writable('')
const secret = writable({ type: 0 })

const clear = () => {
  card.truncate(0)
  card.merge(sample())
  secret.set({ type: 0 })
  rant.set(card.text)
  editMode.set(false)
}


// --- end of uid
const card = new Postcard()
try {
  const url = new URL(window.location)
  if (url.hash.length) card.merge(url)
  else clear()
} catch (err) {
  console.warn('Failed to load URL', err)
  console.info('Loading default sample')
  clear()
}

// Hydrate application from card if not empty.
if (card.length) {
  theme.set(card.theme)
  const { encryption, nonce } = card._card

  const attemptPWDecrypt = (msg = 'Input password') => {
    const passphrase = prompt(msg)
    if (!passphrase) return clear()
    console.log(nonce)
    scrypt(passphrase, nonce)
      .then(key => {
        try {
          secret.set({ key, nonce: nonce, type: PWCRYPT})
          rant.set(card.decrypt(key))
        } catch (err) {
          if (err.type === 'DecryptionFailedError') attemptPWDecrypt('Wrong password, try again')
          else {
            console.error(err)
            clear()
          }
        }
      })
  }

  switch (encryption) {
    case NOCRYPT:
      rant.set(card.text)
      break
    case PWCRYPT:
      attemptPWDecrypt()
      break
    default:
      alert('Corrupted or unknown encryption\npostcard unreadable code:' + card.encryption)
      clear()
      break
  }
}

/* this is actually the state of the model */
const cardStore = readable({size: 0, key: ''}, set => {

  const pack = dbnc(([$text, $theme, $secret, $editMode]) => {
    if (!$text.length) return
    const nonce = $secret.salt || card._card.nonce

    let size = card._card.text.length
    if ($editMode) {
      size = card.update({
        text: $text,
        theme: $theme,
        encryption: $secret.type,
        secret: $secret.key,
        nonce: nonce
      }, uid.sig.sec)
    }

    const pickle = card.pickle()
    const title = card.title // TODO don't show title for encrypted content...
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

  return derived([rant, theme, secret, editMode], v => v)
    .subscribe(v => pack(v))
})

const app = new App({
	target: document.body,
	props: {
		uid,
    rant,
    theme,
    secret,
    card: cardStore,
    editMode
	}
})

export default app

function sample () {
  // Var tests
  // return '#PIC0.K0.7zymSDZ4Zlvrsr4aQ6GXj_g2QpIK6HGflAT3DDkxrZUB0.6MV_amWKyS9NCtotVTZfV14B5Yu2ydwAQAkMqfO_X8uUcLfHGa-z5RgMKmLsBN9IF61sDXooRTWAzBgJKI1zAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADECsEBCKj7ntGXLhAAGq4BVGl0bGUKPcQBCgojIFRvcGljCgpgV3JpdHRlbiB7e0RBVEV9fWAKClRoaXMgdGV4dCBpcyBzdG9yZWQgaW4gYSBwaWNrbGUgZmXEESBtZWFuIFtQaWNvxBFdKGh0dHBzOi8vZ2l0aHViLmNvbS90ZWxhbW9uL3DHJSkuCgoKe3tDQVBBQ0lUWX19CgpTaWduZWTEFk5BTUXEEnt7UEt9fSB7e0dMWVBISUNPTn19IAEoADDRLQ'

  // The welcome letter
  return '#%F0%9F%92%8C_1kilo.rant-PIC0.K0.7zymSDZ4Zlvrsr4aQ6GXj_g2QpIK6HGflAT3DDkxrZUB0._Rkb1yDJsTV2ZmIdGhWcgnSyf6lkokoijklvnjvrLkQlQUqWdFLMhLaboOZFsoQgrGvrkrXhQqVTcZ3aZqEwBgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQFCoIICMDxtfuXLhAAGuoHMQAkvBuDE7IIwNYJYBsD2A6ATgQwHYBcBQ-wogPBuCR+yAOoCmiAxsgLbUCE+AKgBbwDOIAggAdBIXiFydqIagEcArvABumRNTwhkAMxCYQAE3gBzeLhUgACsh646mdHtSFi4QH07MEAGkkyEACEAnrjU+ABSctYgiPCwUrro1GaCVjZ2egA04pLxAOR8ulGMJuI+nMgA7iCMcnScotiayOiMmLjwyNiiuCC2HZomjlxiSda29qJ8BSbUesUgAAbQIAgoIABGgdRzGtpBAB64GaUVVTXjmS0A_IQAmshyIDzU1BkSYsw8PJiGUlGK1HxqVrxRD+Oo8eB6KQSKQAVQASgAZEAAWhA2B8ehamFWmEeaKekL0bHwAEltGUpJo5OhoehRIxVnIodw+KMZmUTLVoZUvvBbIgQEkKeg+FoQABhdD+QS4ZCGLCCTj+AaSDoUkDfLq6WXIAUSFrdHBrKThaYgBroABchFRJK6PXNRV0jzo8S6KD+kWouCC6EcqNu9wdmiiIh4TGo7SkWk0_pAAGVTDSdCB4opdXJWu04wARah0CFSMpZKE+BJdbDUfaOIigMCAXZ2LIhMPAOgBZOywPTlbChcJdVb5zCmkAU7LxUfoEytwx1QXN1viKtdZhG_VdIqcXGzFDIWBrRoztg0EBbz1UxAC5roLs9h5yYSNXCOGHg7Cz7nQ5jIx6qOiyulsWQT1_DuQ0OhqZArGZKQGBQOkxVA6lBWSNkawAeX3dUz1iVY7i6ABmAAGIi1g2Ph4maVsZxrZwwEAL12QDzRhkEIAAqNjfF1PQOJAAB9EwVD5Hg+JAABtKJsFgHgAF0AAoAEp8BYMT4Gab5ZLkzgfUEHhLQAen0xhAiwOgYnQHE9G+JTlLE_hjWHVoL3vbAp0eeTqBYy0SEAEH2bNAThoFrU8ACZawCgjwoCgAWKKAoAVkISgpx9NQdFwS0QAAbyyzEggAX3ywgAB80UwZgQFK3BpSkUqvlq_BiuRJqWsa0xVlUHhirsahioYXVisaqdDG0i5ipiWBiuikLBuKwdsHG6hJu7ThBvwVExN2GSJXjeMeRvbsyl7DatsFXEeEVLA8TUV1pSzY7xJAbauE8qRf3zAD1se7bxSggVW1wdArC+sSnoTIxsBaal_hB06ADVqCnPpbHu2HtvMPlkGRZh0G+EGwd+y9sQsFoakIOYKZxHhOHwQzumQSEOuQMyeHwAASe9ux0GUNW9SooPwCm5icOtAGkdkAADFWzMdYglZkkNSUE1BBeEtcgeVpLx0PDMxAEKQq9TRnxAeLCmwTN_lTBIZllXSWBAEhAEV9wgco8ABRa5CvwIAAAIAIoADIGYb7UxoU2'
}

