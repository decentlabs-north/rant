import { marked } from 'marked'
import Purify from 'dompurify'
import Tonic from '@socketsupply/tonic/index.esm.js'
import { write, gate, nfo, mute, get, settle } from 'piconuro'
import Kernel from './blockend/k.js'
import { BrowserLevel } from 'browser-level'
import '@picocss/pico'
// 10kB accurate version: https://github.com/mathiasbynens/emoji-regex/blob/master/index.js
const EMOJI_REGEXP = /!([^!\n ]{1,8})!/

const [$view, setView] = write('edit')
const [$mode, setMode] = write(false) // true: Show editor
const [$route, _setRoute] = write()
const PITCH = `
!☠️!
##  Unstoppable Information

This app produces something like digital grafitti.
The likelyhood of your words getting stuck
on the internet forever are high.

Resistent against takedowns.
Every time the message is shared it is replicated in it's full form.

### limitation: \`1 Kilo Byte\`

It's about 1000 characters, but don't worry, we provide compression
and encryption to generate maximum amount of entertainment.

Bonus, wanna be stealthy? D/W we got ya covered,
select some words and long-tap to encrypt them.
`.trim()

export const kernel = new Kernel(new BrowserLevel('rant.lvl', {
  valueEncoding: 'buffer',
  keyEncoding: 'buffer'
}))

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
  nValue('edit-capacity-meter', mute(kernel.$rant(), r => Math.ceil((r.size / 1024) * 100)))
  nText('edit-capacity-bytes', mute(kernel.$rant(), r => `${r.size}`.padStart(4, '0')))
  nClick('edit-back', () => setView('home'))
  nClick('edit-preview', () => setMode(!get($mode)))
  nClick('edit-btn-publish', async () => {
    const id = await kernel.commit()
    console.log('Comitted', id.toString('hex'), get(kernel.$rant()))
    setMode(false)
  })

  /* Home-view controls */
  stitch(kernel.$rants(), 'home-rants')
  await kernel.checkout(null)
}

class RenderCtrls extends Tonic {
  async click (ev) {
    if (Tonic.match(ev.target, '#btn-toggle')) {
      setMode(!get($mode))
    }
  }

  render () {
    const { state } = this.props
    console.log(this.props)
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
}; Tonic.add(RenderCtrls)

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
    return marked(Purify.sanitize(text))
  }

  render () {
    // console.log('MP', this.props)
    const { text, state } = this.props
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
    if (el.dataset.id === 'new') id = null
    else id = Buffer.from(el.dataset.id, 'base64')

    await kernel.checkout(id)
    setView('edit')
    setMode(el.dataset.id === 'new')
  }

  render () {
    console.log('RantList', this.props)
    if (!Array.isArray(this.props)) {
      return this.html`<p class="text-center"><code>No rants</code></p>`
    }

    return this.html`
      <rant data-id="new" class="row xcenter">
        <icon>🥚</icon>
        <h4>New Rant</h4>
      </rant>
      ${this.props.map(rant => {
        const m = rant.text.match(EMOJI_REGEXP)
        const icon = m ? m[1] : ' '
        return this.html`
          <rant data-id="${rant.id.toString('base64')}" class="row xcenter">
            <icon>${icon}</icon>
            <div class="col xstart">
              <h6>${rant.title}</h6>
              <small>${new Date(rant.date).toLocaleString()}</small>
              <div class="sampl">${(rant.text || 'empty').substr(0, 40)}...</div>
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
    el.reRender(value)
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
  const unsub = output(v => { el.value = v })
  const handler = () => {
    if (typeof input === 'function') input(el.value)
  }
  el.addEventListener('keyup', handler)
  return () => {
    unsub()
    el.removeEventListener('keyup', handler)
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
function apply () {
  const hash = window.location.hash
  if (hash === '') return _setRoute('p', null, new URLSearchParams())
  const virt = new URL(hash.replace(/^#\/?/, 'x:'))
  const [path, id] = virt.pathname.split('/')
  const search = new URLSearchParams(virt.search)
  const q = {}
  let searchEmpty = true
  for (const [k, v] of search.entries()) {
    q[k] = v
    searchEmpty = undefined
  }
  console.log('Route:', path.toLowerCase(), id, searchEmpty && q)
  _setRoute(path.toLowerCase(), id, searchEmpty && q)
}
export function navigate (path) {
  window.history.pushState(null, null, `/#${path}`.replace(/^#\/+/, '#/'))
  apply()
}
window.addEventListener('popstate', apply)
apply()
await main()
