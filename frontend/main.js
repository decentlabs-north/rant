import Tonic from '@socketsupply/tonic/index.esm.js'
import { write, gate, nfo, mute, get, combine, init, memo } from 'piconuro'
import Kernel, { isDraftID } from '../blockend/k.js'
import { BrowserLevel } from 'browser-level'
import '@picocss/pico'
import { unpackFeed, processText, THEMES } from '../blockend/picocard.js'

// TODO: https://github.com/aMarCruz/rollup-plugin-jscc
/* #if _MERMAID */
import mermaid from 'mermaid'
mermaid.initialize({ startOnLoad: false })
window.mermaid = mermaid
/* #endif */

const [_mode, setMode] = write(false) // true: Show editor
const [$route, _setRoute] = write()
const RT = {
  p: 'pitch',
  r: 'show',
  e: 'edit',
  d: 'home', // drafts
  l: 'saved',
  n: 'discover',
  s: 'settings'
}
const $view = mute($route, r => RT[r?.path] || 'pitch')
const $mode = mute(combine(_mode, $view), ([m, v]) => {
  // console.log('M', m, r) // TODO: rethink this logic, probably depend on k.$current()
  // Force west/editor area to be shown when in app sub-views.
  if (!~['pitch', 'show', 'edit'].indexOf(v)) return true
  if (v === 'pitch') return false // Force presentation mode.
  return m // fallback on user-controlled state
})
const CHEATSHEET = unpackFeed('PIC0.K0.GFZu8O6IJ1_4DVdAZHQr32fJx8afn6MUbyyXz987iLAB0.3Dq-Z9Oa8L6SiTU6LWCssrPRyPN_RPXC40XzrwQf2dHdWTWGyUpwzvFoMYzZ3_DTtXlvgl1EI+1Z+pGPCJcFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAOw3gAHoWIAoXTFA44jIENoZWF0U2hlZXQKCiMjIE1hY3JvcwoKfCBleHByZXNzaW9uIHwgbmFtZXwgc3RhdHVzfAp8LcQBxgbIBy0tOnwKfGAh8J+TtyAhYHwgQmlnIEVtb2ppIFBpY3R1cmVzfCBkb25lxCZ7a2V5fWB8IEF1dGhvciBQdWJsaWMta2V5fCB0b2RvxSN0OmVwb2NoXHxmb3JtYXTEL0NvdW50ZG93bssnZzp1NjIycmQ4bXdwfWAgfCBFbWJlZCBHZW9oYXNofCBwbGFubmVkIMQtfn54b3I6cHdcfHJlZGFjdGVkfn7EM0lucGxhY2UgZW5jcnlwdOYA88s65AEZQmFzaWNzCiMjIyBUeXBvZ3JhcGh5CnzqASZ8cmVzdWx05gEexQQKfGAqKmJvbGQqKsRmICAgyA_EG19pdGFsaWNzX2B8IMkMxBl+flN0cmlrZSBUaHJvdWdo5gCk0hZ8CnwgQmFja3RpY2tzLcViYGNvZGVg5gCyIyBIZWFkaW5ncwpgYGBtYXJr5AE6CskXIDHkANfIDTLMMiAzxA7KDzTFD8oQNcYQyhE2xGPGdUxpc3TlAScjIyBVbm9yZGVyZWTtAIItIHN3aW1txDh3ZWFyCi0gcGFzc3BvcnTEG3VuZ2xhc3Nl5QC2xVMjIyBP00cxLiBNb25rZXkKMskKMy4gQmFuYW5hxT3EOlRhYmxlcwrNOnwgYWxpZ24gcmlnaHQgyA5sZWbKDWNlbnRlcuQCNegC3sQBOnw6yw7NDeUC_uQB4yAgyVjFUsYBxRttaWRkbGXFD8ksxAEwIHwgQ2HIK8YsygHNLEFCIHwgQUxQSEEgQkVUQcgseMks6AD4TGlua3MgJmFtcDsgSW1hZ_ABBFvEISB0ZXh0XShodHRwczovL2hvc3QudGxkKQohW2FsdCBpxDjXJC_FHS5wbmcpxXRfVE9ETzogYmxvY2sgcmVtb3RlxkBzIGZyb20gdW50cnVzdGVkIGHlA_RzLl_mAjBCxDJxdW90Ze0AoD4gVGhlIHRyZWUgd2FzIHRhbGxlciB0aGFuIGFueXRo5AI+c2hlCj4gaGFkIGV2ZXIgc2VlbiBiZWZvcmUuCj4KPiAtVGhleSBzYWlkIGl0xShixCN0aGVyZSBhIHdoaWxlLuoCukNvZGXmAI9zCuQBTcQZxAggIGNvbnN0IHggPSA0MssTb2xlLmxvZyh4KcgwoXoBoXgAoWwAoWTLQngxnEIYkAChcwo')
const PITCH = unpackFeed('PIC0.K0.xQLjkWClGDyYFYam0PBJa1I0UFpKa7AhS_TNdBO0wWMB0.MGnJgexXLCNKXt-r3TddbRsP6Vvy6LdeGcF8SK_f1ou7N2_fGnEEwjrdZLQ4TiG4smbEV7CS4m6DTlBkTJk0CQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEu3gAHoWIAoXTFAQwxACCECMDWYFCwFQBYEsDOJ0gIYgC4oB2AniAGYCuANlaQPoDCVA9hQCZkBOApt3SADlmebgAdsbAHSwAknhAB3ZpygYAxswC2oqtxG0QzMmSpFuAGhyE2ilDRBok2HiELDuGAG4pcARQBKGmwWIACq_gAyVjaivJwAtABM8bHcnA4KzprSsMCgESiaKHiwIAB8IADyhNwgANJ2zCAAQsQi8MjYeADkGAB+iQAMg4rKbBh4TUjcVKIgxKzkzGoUGMyEik7yWIWiynjYhHg5ADy4SDxkALwARMDcAPQ1CjcgnMy6twBGFHiThK81FRsGg0N8WGooDcyghOKRiicHtgyvAwIAeDcAwvtwIAAoXoCoXgAoWwAoWTLQngx2M+2QAChcwI')

const DB = new BrowserLevel('rant.lvl', {
  valueEncoding: 'buffer',
  keyEncoding: 'buffer'
})
const kernel = new Kernel(DB)
window.k = kernel // sanity checking

async function main () {
  await kernel.boot()
    .then(console.info('Kernel booted'))
  // await kernel.store.reload()
  nAttr('main', 'view', $view)
  nClass('main', 'mode-edit', $mode)
  nClass('main', 'mode-show', mute($mode, m => !m))

  /* Renderer */
  stitch(kernel.$rant(), 'markdown-render')
  const $state = memo(gate(mute(kernel.$rant(), r => r.state)))
  const $theme = memo(mute(kernel.$rant(), r => r.theme))
  // nfo($state, 'outside')(s => console.error('DraftState: ' + s.toUpperCase()))
  nAttr('view-render', 'state', $state)
  nAttr('view-render', 'theme', mute($theme, t => THEMES[t]))
  nClick('r-btn-resume', () => setMode(true))

  /* Edit-view controls */
  nAttr('view-editor', 'state', $state)
  nValue('markdown-area', mute(kernel.$rant(), r => r?.text), v => kernel.setText(v))
  nDisabled('markdown-area', mute($state, s => s !== 'draft'))
  const $size = memo(gate(mute(kernel.$rant(), r => r.size)))

  nValue('edit-capacity-meter', mute($size, s => Math.ceil((s / 1024) * 100)))
  nText('edit-capacity-bytes', mute($size, s => `${s}`.padStart(4, '0')))
  nClick('edit-back', () => {
    navigate(get($state) === 'draft' ? 'd' : 'l')
  })
  nClick('edit-preview', () => setMode(!get($mode)))
  nClick('edit-publish', async () => {
    const id = await kernel.commit()
    const pickle = await kernel.pickle(id)
    navigate(`r/${pickle}`)
    setMode(false)
    console.log('Comitted', id.toString('hex'), get(kernel.$rant()))
  })
  nClick('edit-fork', async () => {
    const id = get(kernel.$current)
    const [draft, parent] = await kernel.checkout(id, true)
    console.log('Forked into', draft, parent)
    navigate(`e/${draft}`)
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
    el.href = `#e/${id}`
  })
  nHide('btn-resume-draft',
    mute(kernel.$current, id => !isDraftID(id))
  )

  /* saved-view controls */
  stitch(kernel.$rants(), 'saved-rants')

  /* On Route change */
  mute(gate($route), async ({ path, id, q }) => {
    // console.info('Route Change', path, id, q)
    switch (RT[path]) {
      case 'show': {
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
      case 'edit':
        if (id === 'new') {
          const [id] = await kernel.checkout(null)
          setMode(true)
          navigate(`e/${id}`)
          return 'onroute created new'
        }
        try {
          await kernel.checkout(id)
        } catch (err) {
          console.error('404?', id, err)
          navigate('/')
        }
        return `onroute checkout(${id})`
      default:
        return `onroute noop(${RT[path]}, ${(id || '').substr(0, 24)})`
    }
  })(console.info)

  /* Clear pending draft save on leave */
  window.addEventListener('beforeunload', async () => {
    console.info('Saving Draft beforeunload')
    await kernel.saveDraft()
    console.info('Draft Saved!')
  })
}

async function createNew () {
  await kernel.checkout(null)
  const r = get(kernel.$rant())
  navigate(`e/${r.id}`)
  setMode(true)
}

async function shareDefault () {
  await navigatorShare()
    .catch(err => {
      console.warn('navigator.share() failed, trying clipboard', err)
      return currentToClipboard()
        .then(() => window.alert('Copied URL to clipboard'))
    })
}
async function currentPickle () {
  const current = get(kernel.$current)
  if (isDraftID(current)) return false
  const p = await kernel.pickle(current)
  const url = new URL(window.location)
  url.hash = 'r/' + p
  return url.toString()
}
async function currentToClipboard () {
  const url = await currentPickle()
  if (url) await navigator.clipboard.writeText(url)
}
async function navigatorShare () {
  const url = await currentPickle()
  if (!url) return
  const { title, excerpt } = get(kernel.$rant())
  const shareData = {
    title: `1k | ${title || 'Note'}`,
    text: excerpt,
    url
  }
  return await navigator.share(shareData)
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
// TODO: convert to vanilla html / will be less code and
// easier to read with CSS.
Tonic.add(class RenderCtrls extends Tonic {
  async click (ev) {
    if (Tonic.match(ev.target, '#btn-toggle')) {
      if (this.props.state === 'pitch') navigate('d')
      setMode(!get($mode))
    }
    if (Tonic.match(ev.target, '.btn-export')) {
      shareDefault()
    }
  }

  render () {
    const { state, rant } = this.props
    if (!state) return
    // console.log(this.props)
    if (state === 'pitch') {
      return this.html`
        <ctrls class="row space-between xcenter">
          <button id="btn-toggle" class="btn-round">1k</button>
        </ctrls>
      `
    }
    const dateStr = new Date(rant.date).toLocaleString()
    const status = state === 'draft'
      ? this.html`
        <sup><code>DRAFT</code></sup>
        <small>saved: ${dateStr}</small>
      `
      : this.html`
        <small>Author: ${rant.author.slice(0, 4).toString('hex')}</small>
        <small>Date: <span id="author-id">${dateStr}</span></small>
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
            <!-- <b role="button">Publish</b> -->
          `
          : this.html`
          <!--<button class="btn-round"><ico>📤</ico></button>-->
          <b role="button" class="outline secondary btn-export">share</b>
          `
        }
      </ctrls>
    `
  }
})

Tonic.add(class MessagePreview extends Tonic {
  async click (e) {
    if (!e.target.matches('button.create')) return
    console.log('Button clicked')
    const [id] = await kernel.checkout(null)
    setMode(true)
    navigate(`e/${id}`)
  }

  preprocess (text = '') {
    const rant = this.props
    // rant provided for macros such as Date&Key
    return processText(text, rant)
  }

  render () {
    // console.log('MP', this.props)
    const { text, state } = this.props?.n || {}
    if (text === '' && state !== 'draft') {
      return this.html`<code>Empty Casette</code>`
    }

    if (this.props.id === 'pitch-render') {
      nEl('render-ctrls').reRender({ state: 'pitch' })
      // TODO: fix SEO for pitch.
      return this.html`
        ${this.html([this.preprocess(PITCH.text)])}
      `
    }

    nEl('render-ctrls').reRender({ state, rant: this.props.n })
    const md = this.preprocess(text || CHEATSHEET.text)
    return this.html([md])
  }
})

Tonic.add(class RantList extends Tonic {
  async click (ev) {
    const el = Tonic.match(ev.target, 'rant')
    if (!el) return

    let id
    // Handle create
    if (el.dataset.id === 'new') return createNew()
    else {
      id = isDraftID(el.dataset.id)
        ? el.dataset.id
        : Buffer.from(el.dataset.id, 'base64')
    }

    // Handle delete
    if (Tonic.match(ev.target, '.trash')) {
      console.info('deleteRant', id)
      await kernel.deleteRant(id)
      // TODO: refresh view?
      return
    }

    // Handle show
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
          <h4>New Note</h4>
        </rant>
      `
    }
    if (!Array.isArray(rants) && !allowNew) {
      return this.html`<p class="text-center"><code>No rants</code></p>`
    }
    return this.html`
      ${newRant}
      ${(rants || []).map(rant => {
        let id = rant.id
        if (!isDraftID(rant.id)) id = id.toString('base64')
        return this.html`
          <rant class="row xcenter space-between"
            data-id="${id}"
            data-state="${rant.state}">
            <div class="row xcenter">
              <icon>${rant.icon}</icon>
              <div class="col xstart">
                <h6>${rant.title}</h6>
                <small>${new Date(rant.date).toLocaleString()}</small>
                <div class="sampl">${rant.excerpt}...</div>
              </div>
            </div>
            <b role="button" class="btn-round trash"></b>
          </rant>
        `
      })}
    `
  }
})

/* #if _MERMAID */
Tonic.add(async function MermaidGraph () {
  try {
    const svg = await new Promise(resolve => {
      mermaid.render('aGraph', this.innerText, resolve)
    })
    return this.html([svg])
  } catch (err) {
    return this.html`MERMAID SYNTAX ERROR: <pre><code>${err.message}</code></pre>`
  }
})
/* #endif */

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

export function nDisabled (el, $n) {
  el = nEl(el)
  return $n(c => { el.disabled = !!c })
}
export function nHide (el, n) {
  el = nEl(el)
  return n(v => { el.style.display = v ? 'none' : null })
}
export function nShow (el, n) {
  return nHide(el, mute(n, n => !n))
}

// router.js
// #p/ => Pitch
// #r/PICKLE => disptach + show rant
// #e/DRAFT_ID => edit draft
// #d/ => list drafts
// #l/ => list collection
// #n/ => explore/swarm
// #s/ => settings
function apply () { // parses location -> neurons.
  const hash = window.location.hash
  // console.log('hash', hash)
  if (hash === '') return _setRoute({ path: 'p', id: null, q: new URLSearchParams() })
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
  window.history.pushState(null, null, `#${path}`.replace(/^#\/+/, '#/'))
  apply()
}
window.addEventListener('popstate', apply)
apply()
await main()

window.dump = () => kernel.inspect()
  .catch(console.error.bind(null, 'kernel.inspect() error:'))
