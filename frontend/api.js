/**
 * Api.js intializes the private kernel,
 * and exports couple of helpers.
 * (Makes frontend feel more like frontend.)
 *
 * TODO: try to move the kernel to background service worker. (epic!)
 */
import { BrowserLevel } from 'browser-level'
import { write, mute, get, combine } from 'piconuro'
import Kernel, { isDraftID } from '../blockend/kernel.js'
import PublicKernel from '../blockend/public-kernel.js'
import { $page, navigate } from './router.js'

const DB = new BrowserLevel('rant.lvl', {
  valueEncoding: 'buffer',
  keyEncoding: 'buffer'
})
export const kernel = new Kernel(DB)

export const publicKernel = new PublicKernel(
  DB.sublevel('PUB', {
    keyEncoding: 'buffer',
    valueEncoding: 'buffer'
  })
)
// Share locally-saved public rants.
publicKernel.externalRants = params => kernel.onquery({
  ...params, // limit, age, etc.
  onlyPublic: true
})

const [_mode, _setMode] = write(false) // true: Show editor
export const setMode = _setMode

/* Force edit-mode off */
export const $mode = mute(combine(_mode, $page), ([m, page]) => {
  // TODO: rethink this logic, probably depend on k.$current()

  // Force west/editor area to be shown when in app sub-views.
  if (!['pitch', 'show', 'edit'].find(p => p === page)) return true
  // Force presentation mode on frontpage.
  if (page === 'pitch') return false
  // Fallback on user-controlled state
  return m
})

export async function createNewDraft () {
  // TODO: null is hacky, refactor to kernel.createDraft()
  await kernel.checkout(null)
  const r = get(kernel.$rant())
  navigate(`edit/${r.id}`)
  setMode(true)
}

/**
 * Attempts to use native share-functionality on mobile
 * fallsback to copy to Clipboard if fail
 *
 * TODO: both approaches seem to fail
 */
export async function shareDefault () {
  await navigatorShare()
    .catch(err => {
      console.warn('navigator.share() failed, trying clipboard', err)
      return currentToClipboard()
        .then(() => window.alert('Copied URL to clipboard'))
    })
}

/**
 * Fetches current rant as base64 encoded block
 * and prepends window.location
 */
export async function currentPickle () {
  const current = get(kernel.$current)
  if (isDraftID(current)) return false
  const p = await kernel.pickle(current)
  const url = new URL(window.location)
  url.hash = 'r/' + p // '/r' path is Import Block
  return url.toString()
}

/**
 * Copy pickled Rant to clipboard (desktop-share)
 *
 * TODO: navigator.clipboard API is a bit new,
 * maybe fallback on oldskool <textarea> -> clipboard way.
 */
export async function currentToClipboard () {
  const url = await currentPickle()
  if (url) await navigator.clipboard.writeText(url)
}

/**
 * Shares active Rant using native sharing dialog (mobile-share).
 *
 * TODO: seems like url gets cut on ff-mobile -> discord.
 */
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
