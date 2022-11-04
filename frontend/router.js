import { write, mute } from 'piconuro'
import { nEl } from './surgeon.js'
export const [$route, _setRoute] = write({})

// TODO: Removing routing table, footgun, just hard to read.
/*
export const RoutingTable = {
  p: 'pitch',
  r: 'show', Actually Import-via-URL; Keep for legacy
  e: 'edit',
  d: 'home', // drafts
  l: 'saved',
  n: 'discover',
  s: 'settings'
} */

export const $page = mute($route, r => r?.path || 'pitch')

/**
 * Native parses location.hash for path, id, query and updates $route.
 * Hash-based routing picked for privacy, cause the hash component,
 * is never sent by browser to the static server the app is hosted on.
 * Good: anonymize analytics, Bad: No way to SSR/SEO :'(
 */
export function apply () {
  const { origin, hash } = window.location

  /**
   * CSS based routing :D
   * this justs hides the frontpage when client is not on frontpage
   */
  if (hash !== '#/' && hash !== '') {
    nEl('frontPage').style.display = 'none'
  } else {
    nEl('frontPage').style.display = ''
  }

  // if not editing public option is hidden
  if (hash.split('/')[0] !== '#edit') {
    nEl('edit-pub-toggle').style.display = 'none'
  } else {
    nEl('edit-pub-toggle').style.display = ''
  }

  // Replace window.pathname with window.hash
  const virt = new URL(origin + '/' + hash.replace(/^#\/?/, ''))
  // console.log('VirtualURL', virt)

  // Naive approach "/path/:id", "/nested/deep/paths/:id" not supported
  let path = 'pitch'
  let id
  const match = virt.pathname.match(/^\/([^/]+)(?:\/(.+))?/)
  if (match) {
    path = match[1]
    id = match[2]
  }
  path = path.toLowerCase() // Make paths case-insensitive

  const q = {}
  let searchEmpty = true
  // Parse search-params unless we have a binary rant in the url
  // TODO: reverse-footgun. why parse them at all?
  if (path !== 'r') {
    const search = new URLSearchParams(virt.search)
    for (const [k, v] of search.entries()) {
      q[k] = v
      searchEmpty = undefined
    }
  }
  // console.log('_setRoute():', path.toLowerCase(), 'id:', id, 'query:', searchEmpty && q)
  _setRoute({
    path,
    id,
    q: searchEmpty && q
  })
}

/**
 * Change route and trigger update.
 * @param path {string} ex: 'edit/draft:1' or '/settings'
 */
export function navigate (path) {
  // Prepend # if missing.
  if (!path.startsWith('#')) path = '#' + path
  // Strip multiple forward-slashes
  path = path.replace(/^#\/+/, '#/')

  window.history.pushState(null, null, path)
  apply()
}
window.addEventListener('popstate', apply)
apply()
