/**
 * A simple alert component that creates an alert and then dismisses it after 2s
 * @param {Element} parent
 * @param {string} type
 * @param {string} message
 * @param {boolean} autohide - NYI
 * @returns
 */
export function createAlert (parent, type, message, autohide) {
  if (document.getElementById(`${parent.id}:alert-${message}`)) return

  const alertBox = document.createElement('div')
  alertBox.classList.add('alert-collapse')

  const alert = document.createElement('div')
  alert.classList.add(`alert-${type}`)
  alert.id = `${parent.id}:alert-${message}`

  const alertMsg = document.createElement('p')
  alertMsg.innerText = message
  alert.appendChild(alertMsg)

  alertBox.appendChild(alert)

  parent.appendChild(alertBox)
  clearAlert(alertBox)
}

function clearAlert (el) {
  collapseAlert(el)
  setTimeout(() => collapseAlert(el), 2000)
  setTimeout(() => el.remove(), 2200)
}

function collapseAlert (el) {
  if (el.style.maxHeight) {
    el.style.maxHeight = null
  } else {
    el.style.maxHeight = el.scrollHeight + 'px'
  }
}
