/* ------------ NuroSurgeon ------------
 *
 * Minimal functions to stitch neurons to DOM
 * It's pretty much jQuery with recursion :shrug:
 *
 * @author Tony Ivanov <tony@decentlabs.se>
 * @license AGPLv3
 */
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
