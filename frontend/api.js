import { BrowserLevel } from 'browser-level'
import { write, mute, get, combine } from 'piconuro'
import Kernel, { isDraftID } from '../blockend/kernel.js'

const DB = new BrowserLevel('rant.lvl', {
  valueEncoding: 'buffer',
  keyEncoding: 'buffer'
})
export const kernel = new Kernel(DB)

export const [_mode, setMode] = write(false) // true: Show editor
export const [$route, _setRoute] = write()
export const RoutingTable = {
  p: 'pitch',
  r: 'show',
  e: 'edit',
  d: 'home', // drafts
  l: 'saved',
  n: 'discover',
  s: 'settings'
}

export const $view = mute($route, r => RoutingTable[r?.path] || 'pitch')
export const $mode = mute(combine(_mode, $view), ([m, v]) => {
  // console.log('M', m, r) // TODO: rethink this logic, probably depend on k.$current()
  // Force west/editor area to be shown when in app sub-views.
  if (!~['pitch', 'show', 'edit'].indexOf(v)) return true
  if (v === 'pitch') return false // Force presentation mode.
  console.log('$mode(m, v)')
  return m // fallback on user-controlled state
})

// window.k = kernel // sanity checking

export async function createNew () {
  await kernel.checkout(null)
  const r = get(kernel.$rant())
  navigate(`e/${r.id}`)
  setMode(true)
}

export async function shareDefault () {
  await navigatorShare()
    .catch(err => {
      console.warn('navigator.share() failed, trying clipboard', err)
      return currentToClipboard()
        .then(() => window.alert('Copied URL to clipboard'))
    })
}
export async function currentPickle () {
  const current = get(kernel.$current)
  if (isDraftID(current)) return false
  const p = await kernel.pickle(current)
  const url = new URL(window.location)
  url.hash = 'r/' + p
  return url.toString()
}
export async function currentToClipboard () {
  const url = await currentPickle()
  if (url) await navigator.clipboard.writeText(url)
}
export async function navigatorShare () {
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

// router.js
export function apply () { // parses location -> neurons.
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
