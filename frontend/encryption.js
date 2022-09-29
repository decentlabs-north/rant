import CryptoJS from 'crypto-js'

export async function encrypt (message, secret) {
  const key = await crypt(secret)
  const ciphertext = CryptoJS.AES.encrypt(message, key).toString()
  return ciphertext
}

export async function decrypt (encoded, secret) {
  const key = await crypt(secret)
  const originalText = CryptoJS.AES.decrypt(encoded, key).toString(CryptoJS.enc.Utf8)
  return originalText
}
/* non async versions */
export function _encrypt (message, secret) {
  const key = _crypt(secret)
  const ciphertext = CryptoJS.AES.encrypt(message, key).toString()
  return ciphertext
}

export function _decrypt (encoded, secret) {
  const key = _crypt(secret)
  const originalText = CryptoJS.AES.decrypt(encoded, key).toString(CryptoJS.enc.Utf8)
  return originalText
}

async function crypt (input) {
  return window.btoa((encodeURIComponent(input)))
}
function _crypt (input) {
  return window.btoa((encodeURIComponent(input)))
}
