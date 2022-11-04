import '@picocss/pico'
import { gate, nfo, mute, get, init, memo, write } from 'piconuro'
import { isDraftID } from '../blockend/kernel.js'
import { THEMES } from '../blockend/picocard.js'
import { promptPIN } from '../frontend/components/keypad-dialog.js'
import {
  nAttr,
  nClass,
  nValue,
  nClick,
  nDisabled,
  nText,
  nHide,
  nEl
} from './surgeon.js'
import {
  kernel,
  publicKernel,
  $mode,
  setMode,
  shareDefault
} from './api.js'

import {
  navigate,
  $route
} from './router.js'
// import './components/router-view.js' // WIP;
import './components/frontpage-feed.js'
import './components/install-button.js'
import './components/main-menu.js'
import './components/render-ctrls.js'
import './components/rant-list.js'
import './components/message-preview.js'
import './components/qr-code.js'
/* #if _MERMAID */ // TODO: https://github.com/aMarCruz/rollup-plugin-jscc
import './components/mermaid-graph.js'
import { Feed } from 'picostack'
/* #endif */

async function main () {
  await kernel.boot()
    .then(console.info('Kernel booted'))
  // await kernel.store.reload()

  await publicKernel.boot()
    .then(console.info('Kernel booted'))
    .then(() => {
      nEl('frontpage-feed').reRender() // <-- Re render the frontpage once the kernel has booted
    })

  // nAttr('frontpage-feed', 'ready', mute($mode, m => !m)) // <-- im not sure if $mode is the right prop here

  nAttr('main', 'view', mute($route, r => r?.path))
  nClass('main', 'mode-edit', $mode)
  nClass('main', 'mode-show', mute($mode, m => !m))

  /* Renderer */
  const $rant = kernel.$rant()

  stitch($rant, 'markdown-render')
  const $state = memo(gate(mute($rant, r => r.state)))
  const $theme = memo(mute($rant, r => r.theme))
  const $encryption = memo(mute($rant, r => r.encryption))
  // const $encrypted = memo(mute($rant, r => r.encrypted))

  // nfo($state, 'outside')(s => console.error('DraftState: ' + s.toUpperCase()))
  nAttr('view-render', 'state', $state)
  nAttr('view-render', 'theme', mute($theme, t => THEMES[t]))
  nClick('r-btn-resume', () => setMode(true))

  /* Share Rant via QRCode */
  /* TODO: Placement / UX
  const $qrCode = mute(
    gate(mute(kernel.$rant(), r => r.id)),
    async id => {
      // Drafts can't be shared
      if (!id || isDraftID(id)) return ''

      const url = new URL(window.location)
      if (true) {
        const p = await kernel.pickle(id)
        url.hash = '#r/' + p
      } else {
        // TODO: when swarm is active/ app is online
        // we can show smaller QR-codes to transfer data peer-to-peer.
        // TODO: research if we can add some additional info to speed
        // up discovery. (list of current known peers)
        url.hash = `#f/topic/${id.toString('hex')}`
        console.log(url.toString())
      }
      return url.toString()
    }
  )
  stitch($qrCode, 'qr-pickle')
  */

  /* Edit-view controls */
  nAttr('view-editor', 'state', $state)
  nValue('markdown-area', mute(kernel.$rant(), r => r?.text), v => kernel.setText(v))
  nDisabled('markdown-area', mute($state, s => s !== 'draft'))
  const $size = memo(gate(mute(kernel.$rant(), r => r.size)))

  nValue('edit-capacity-meter', mute($size, s => Math.ceil((s / 1024) * 100)))
  nText('edit-capacity-bytes', mute($size, s => `${s}`.padStart(4, '0')))
  nClick('edit-back', () => {
    navigate(get($state) === 'draft' ? 'home' : 'saved')
  })
  nClick('edit-preview', () => setMode(!get($mode)))

  // isPublic sets the public state of rant
  const [isPublic, setIsPublic] = write(false)

  nValue('opt-is-public', isPublic, setIsPublic)

  nClick('edit-publish', async () => {
    const encryptionLevel = get($encryption)
    if (encryptionLevel === 1) {
      const secret = await promptPIN(false)
      if (!secret) {
        return
      }
      await kernel.setSecret(secret)
    }
    const id = await kernel.commit(get(isPublic))
    const pickle = await kernel.pickle(id)
    navigate(`show/${pickle}`)
    setMode(false)
    console.log('Comitted', id.toString('hex')) // , get(kernel.$rant()))

    if (get(isPublic)) {
      const rant = Feed.from(pickle)
      await publicKernel.dispatch(rant, true)
    }
  })

  nValue('edit-opt-encryption',
    $encryption,
    async v => kernel.setEncryption(parseInt(v))
  )

  nClick('edit-fork', async () => {
    const id = get(kernel.$current)
    const [draft, parent] = await kernel.checkout(id, true)
    console.log('Forked into', draft, parent)
    navigate(`edit/${draft}`)
  })
  nClick('edit-share', shareDefault)
  nClick('edit-options', () => { nEl('edit-opts-dlg').open = true })
  nClick('edit-opts-ok', () => { nEl('edit-opts-dlg').open = false })
  nValue('edit-opt-theme',
    $theme,
    async v => kernel.setTheme(parseInt(v))
  )

  /* Settings-view */
  const darkMode = kernel.config('dark-mode', true)
  nValue('opt-dark-mode', ...darkMode)
  nAttr(document.body, 'theme', mute(darkMode[0], m => m ? 'dark' : 'light'))
  const mirror = kernel.config('mirror', false)
  nValue('opt-mirror', ...mirror)
  nAttr('main', 'mirror', mirror[0])
  nText('nfo-build', init(`__ENV__-__VERSION__-${'__COMMIT__'.substr(0, 8)}`))
  nText('nfo-version', init('__VERSION__'.replace(/^(\d+).+/, '$1')))
  nText('opt-pk', init(kernel.pk.toString('base64')))
  nClick('opt-btn-reload', async () => {
    await kernel.store.reload()
    window.location.reload()
  })

  nClick('opt-btn-purge', async function purge () {
    const msg = 'You are about to burn your passport and everything with it...\nyou sure about this?'
    if (!window.confirm(msg)) return
    await kernel.db.clear()
    window.location.reload()
  })

  /* Home-view controls */
  stitch(kernel.$drafts(), 'saved-drafts')
  kernel.$current(id => {
    if (!isDraftID(id)) return
    const el = nEl('btn-resume-draft')
    el.href = `#edit/${id}`
  })
  nHide('btn-resume-draft',
    mute(kernel.$current, id => !isDraftID(id))
  )

  /* saved-view controls */
  stitch(kernel.$rants(), 'saved-rants')

  /* On Route change  TODO: move to component */
  mute(gate($route), async ({ path, id, q }) => {
    // console.info('Route Change', path, id, q)
    switch (path) {
      case 'r':
      case 'show': {
        nEl('markdown-render')?.reRender()
        try {
          await kernel.import(id)
          const { title, excerpt } = get(kernel.$rant())

          document.head.querySelector('title').text = title
          document.head.querySelector('meta[name="description"]').content = excerpt
        } catch (err) {
          console.error('500', err)
          window.alert(err)
          navigate('/')
        }
        return 'onroute imported() // => true|false TODO'
      }

      case 'e':
      case 'edit':
        if (id === 'new') {
          const [id] = await kernel.checkout(null)
          setMode(true)
          navigate(`edit/${id}`)
          return 'onroute created new'
        }
        try {
          await kernel.checkout(id)
        } catch (err) {
          console.error('404?', id, err)
          navigate('/')
        }
        return `onroute checkout(${id})`

      case 'pitch':
      case 'home':
      case '':
        // no on-route logic - silent reroute
        nEl('frontpage-feed').reRender()
        return 'frontpage'
        // break

      case 'saved':
        await kernel.checkout(null) // checkout null so we dont show encrypted information when browsing saved rants
        return 'onroute saved checking out(null)'

      default:
        return `onroute 404 - route not found (${path}, ${(id || '').substr(0, 24)})`
    }
  })(console.info)

  /* Clear pending draft save on leave */
  window.addEventListener('beforeunload', async () => {
    if (kernel.isEditing()) {
      console.info('Saving Draft beforeunload')
      await kernel.saveDraft()
      console.info('Draft Saved!')
    }
  })

  // TODO: forgot to expose store._gc.start(interval) / store._.stop() in prev release
  setInterval(async () => {
    try {
      const evicted = await publicKernel.store.gc()
      if (evicted.length) console.log('GC Expunged', evicted)
    } catch (err) { console.error('GC Failed:', err) }
  }, 3000)
}
await main()

// Stitch neuron to Tonic component
export function stitch (n, el, dbg) {
  if (typeof el === 'string') el = nEl(el)
  if (!el.isTonicComponent) throw new Error('Expected Tonic Component')
  n = gate(n)
  if (dbg) n = nfo(n, dbg)
  const unsub = n(value => {
    el.reRender(prev => ({ ...prev, n: value }))
  })
  el.disconnected = () => unsub() // TODO: don't overwrite
}

window.dump = () => kernel.inspect()
  .catch(console.error.bind(null, 'kernel.inspect() error:'))
