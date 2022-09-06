import { marked } from 'marked'
import Purify from 'dompurify'
import Tonic from '@socketsupply/tonic/index.esm.js'
import { write, gate, nfo, mute, get, settle, combine, init, memo } from 'piconuro'
import Kernel, { isDraftID } from './blockend/k.js'
import { BrowserLevel } from 'browser-level'
import '@picocss/pico'
import { EMOJI_REGEXP } from './blockend/picocard.js'
// const [$view, setView] = write('edit')
const [_mode, setMode] = write(false) // true: Show editor
const [$route, _setRoute] = write()
const $view = mute($route, r => {
  const t = {
    p: 'pitch',
    r: 'show',
    e: 'edit',
    d: 'home', // drafts
    l: 'saved',
    n: 'discover',
    s: 'settings'
  }
  return t[r.path] || 'pitch'
})
const $mode = mute(combine(_mode, $route), ([m, r]) => {
  // console.log('M', m, r) // TODO: rethink this logic, probably depend on k.$current()
  if (!~['p', 'r', 'e'].indexOf(r.path)) return true
  return m
})
const PITCH = `
## !☠️!  Unstoppable Information

This app produces something like digital grafitti.
The likelyhood of your words getting stuck
on the internet **forever** are high.

#### Resistent against takedowns
> Every time the message is shared it is replicated in it's full form.

### limitation: \`1 Kilo Byte\`

It's about 1000 characters, but don't worry it's enough to vent some frustration.
We provide compression and macros to generate maximum amount of entertainment.

Bonus, wanna be cryptic? Got ya covered!

> Select some words and long-tap/right-click
> to **redact** them using inline encryption.

Want to say something with a flair?
Check out the **themes**.

Happy Ranting! =)
`.trim()

export const kernel = new Kernel(new BrowserLevel('rant.lvl', {
  valueEncoding: 'buffer',
  keyEncoding: 'buffer'
}))
// window.k = kernel
async function main () {
  await kernel.boot()
    .then(console.info('Kernel booted'))

  nAttr('main', 'view', $view)
  nClass('main', 'mode-edit', $mode)
  nClass('main', 'mode-show', mute($mode, m => !m))

  /* Renderer */
  stitch(kernel.$rant(), 'markdown-render')

  /* Edit-view controls */
  nValue('markdown-area', mute(kernel.$rant(), r => r?.text), v => kernel.setText(v))
  const $size = memo(gate(mute(kernel.$rant(), r => r.size)))

  nValue('edit-capacity-meter', mute($size, s => Math.ceil((s / 1024) * 100)))
  nText('edit-capacity-bytes', mute($size, s => `${s}`.padStart(4, '0')))
  nClick('edit-back', () => navigate('d'))
  nClick('edit-preview', () => setMode(!get($mode)))
  nClick('edit-btn-publish', async () => {
    const id = await kernel.commit()
    console.log('Comitted', id.toString('hex'), get(kernel.$rant()))
    setMode(false)
  })

  /* Settings-view */
  const darkMode = kernel.config('dark-mode', false)
  nValue('opt-dark-mode', ...darkMode)
  nAttr(document.body, 'theme', mute(darkMode[0], m => m ? 'dark' : 'light'))
  const mirror = kernel.config('mirror', false)
  nValue('opt-mirror', ...mirror)
  nAttr('main', 'mirror', mirror[0])
  nText('nfo-build', init(`__ENV__-__VERSION__-${'__COMMIT__'.substr(0, 8)}`))
  nText('nfo-version', init('__VERSION__'.replace(/^(\d+).+/, '$1')))
  nText('opt-pk', init(kernel.pk.toString('base64')))

  /* Home-view controls */
  const $drafts = mute(gate($view), async v => {
    if (v !== 'home') return []
    return await kernel.drafts()
  })
  stitch($drafts, 'saved-drafts')
  /* saved-view controls */
  stitch(kernel.$rants(), 'saved-rants')
  // await createNew()
}

async function createNew () {
  await kernel.checkout(null)
  const r = get(kernel.$rant())
  navigate(`e/${r.id}`)
  setMode(true)
}

Tonic.add(class MainMenu extends Tonic {
  click (ev) {
    const el = Tonic.match(ev.target, 'button[data-route]')
    if (!el) return
    const path = el.dataset.route
    if (get($route).path !== path) navigate(path)
  }

  render () {
    return this.html`
      <nav class="row">
        <button data-route="d" data-toltip="Drafts"><ico>📝</ico></button>
        <button data-route="l" data-toltip="Saved"><ico>📑</ico></button>
        <button data-route="n" data-toltip="Discover"><ico>🧭</ico></button>
        <button data-route="s" data-toltip="Settings"><ico>⚙️</ico></button>
      </nav>
    `
  }
})

Tonic.add(class RenderCtrls extends Tonic {
  async click (ev) {
    if (Tonic.match(ev.target, '#btn-toggle')) {
      setMode(!get($mode))
    }
  }

  render () {
    const { state } = this.props
    // console.log(this.props)
    if (state === 'pitch') {
      return this.html`
        <ctrls class="row space-between xcenter">
          <button id="btn-toggle" class="btn-round">1k</button>
        </ctrls>
      `
    }

    const status = state === 'draft'
      ? this.html`
        <small><code>DRAFT</code></small>
        <small>Date: <span id="author-id">Monday</span></small>
      `
      : this.html`
        <small>Author: <span id="author-id">034V03</span></small>
        <small>Date: <span id="author-id">Monday</span></small>
      `
    return this.html`
      <ctrls class="row space-between xcenter">
        <!-- left -->
        <div class="row xcenter">
          <button id="btn-toggle" class="btn-round">1k</button>
          <div class="col">${status}</div>
        </div>
        <!-- right -->
        ${state === 'draft'
          ? this.html`
            <b role="button">Publish</b>
          `
          : this.html`
          <button class="btn-round"><ico>✉️</ico></button>
          `
        }
      </ctrls>
    `
    // 📤
  }
})

Tonic.add(class MessagePreview extends Tonic {
  async click (e) {
    if (!e.target.matches('button.create')) return
    console.log('Button clicked')
    await kernel.checkout(null)
    setMode(true)
  }

  preprocess (text = '') {
    // Make big emojis
    text = text.replace(new RegExp(EMOJI_REGEXP, 'g'), '<span class="imgmoji">$1</span>')
    // Show date-of note
    text = text.replace(/\{\{DATE\}\}/gi, new Date(this.props.date))
    // TODO: run purify in kernel
    return Purify.sanitize(marked(text))
  }

  render () {
    // console.log('MP', this.props)
    const { text, state } = this.props?.n || {}
    if (text === '' && state !== 'draft') {
      return this.html`<code>Empty Casette</code>`
    }
    if (text === '' && state === 'draft') {
      nEl('render-ctrls').reRender({ state: 'pitch' })
      return this.html`
        ${this.html([this.preprocess(PITCH)])}
        <button class="create">Create new rant</button>
      `
    }
    nEl('render-ctrls').reRender({ state })
    const md = this.html([this.preprocess(text)])
    return md
  }
})

Tonic.add(class RantList extends Tonic {
  async click (ev) {
    const el = Tonic.match(ev.target, 'rant')
    if (!el) return

    let id
    if (el.dataset.id === 'new') return createNew()
    else {
      id = isDraftID(el.dataset.id)
        ? el.dataset.id
        : Buffer.from(el.dataset.id, 'base64')
    }

    await kernel.checkout(id)
    const r = get(kernel.$rant())
    if (r.state === 'draft') { // continue editing
      navigate(`e/${r.id}`)
      setMode(true)
    } else if (r.state === 'signed') {
      const pickle = await kernel.pickle(id)
      navigate(`r/${pickle}`)
    }
  }

  render () {
    // console.log('Rants list:', this.props)
    const { n: rants } = this.props
    const allowNew = this.dataset.create === 'true'
    let newRant = ''
    if (allowNew) {
      newRant = this.html`
        <rant data-id="new" class="row xcenter">
          <icon>🥚</icon>
          <h4>New Rant</h4>
        </rant>
      `
    }
    if (!Array.isArray(rants) && !allowNew) {
      return this.html`<p class="text-center"><code>No rants</code></p>`
    }
    return this.html`
      ${newRant}
      ${(rants || []).map(rant => {
        return this.html`
          <rant class="row xcenter"
            data-id="${rant.id.toString('base64')}"
            data-state="${rant.state}">
            <icon>${rant.icon}</icon>
            <div class="col xstart">
              <h6>${rant.title}</h6>
              <small>${new Date(rant.date).toLocaleString()}</small>
              <div class="sampl">${rant.excerpt}...</div>
            </div>
          </rant>
        `
      })}
    `
  }
})

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

/* ------------ NuroSurgeon ------------ */
/* Minimal functions to stitch neurons to DOM */
export function nEl (el) {
  const o = el
  if (typeof el === 'string') el = document.getElementById(el)
  // TODO && el is HTMLElement
  if (!el) throw new Error('ElementNotFound:' + o)
  return el
}

export function nValue (id, output, input) {
  const el = nEl(id)
  const unsub = output(v => {
    if (el.type === 'checkbox') el.checked = v
    else el.value = v
  })
  const handler = () => {
    if (typeof input !== 'function') return
    if (el.type === 'checkbox') input(el.checked)
    else input(el.value)
  }
  if (typeof input === 'function') {
    el.addEventListener('keyup', handler)
    el.addEventListener('change', handler)
  }
  return () => {
    unsub()
    if (typeof input === 'function') {
      el.removeEventListener('keyup', handler)
      el.removeEventListener('change', handler)
    }
  }
}

export function nClass (id, cls, output) {
  const el = nEl(id)
  return output(v => el.classList.toggle(cls, v))
}

export function nClick (el, handler) {
  el = nEl(el)
  el.addEventListener('click', handler)
  return () => el.removeEventListener('click', handler)
}

export function nText (el, output) {
  el = nEl(el)
  return output(v => { el.innerText = v })
}

export function nAttr (el, attr, output) {
  el = nEl(el)
  return output(v => { el.dataset[attr] = v })
}

// router.js
// #p/ => Pitch/Presentation
// #r/PICKLE => disptach + show rant
// #e/DRAFT_ID => edit draft
// #d/ => list drafts
// #l/ => list collection
// #n/ => explore/swarm
// #s/ => settings
function apply () { // parses location -> neurons.
  const hash = window.location.hash
  // console.log('hash', hash)
  if (hash === '') return _setRoute({ path: 'e', id: null, q: new URLSearchParams() })
  const virt = new URL(hash.replace(/^#\/?/, 'x:'))
  const [path, id] = virt.pathname.split('/')
  const search = new URLSearchParams(virt.search)
  const q = {}
  let searchEmpty = true
  for (const [k, v] of search.entries()) {
    q[k] = v
    searchEmpty = undefined
  }
  // console.log('Route:', path.toLowerCase(), 'id:', id, 'query:', searchEmpty && q)
  _setRoute({
    path: path.toLowerCase(),
    id,
    q: searchEmpty && q
  })
}
export function navigate (path) {
  window.history.pushState(null, null, `/#${path}`.replace(/^#\/+/, '#/'))
  apply()
}
window.addEventListener('popstate', apply)
apply()
await main()
