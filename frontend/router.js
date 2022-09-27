import { write, mute } from 'piconuro'
export const [$route, _setRoute] = write({})

// TODO: Removing routing table, footgun, just hard to read.
/*
export const RoutingTable = {
  p: 'pitch',
  r: 'show',
  e: 'edit',
  d: 'home', // drafts
  l: 'saved',
  n: 'discover',
  s: 'settings'
} */

export const $page = mute($route, r => r?.path || 'pitch')

/**
 * Parses location.hash for path, id, query and updates $route
 */
export function apply () {
  const hash = window.location.hash
  if (hash === '') {
    // Empty hash, empty redirect to first page
    return _setRoute({ path: 'pitch', id: undefined, q: new URLSearchParams() })
  }

  // TODO: breaks on chrome/win.
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
