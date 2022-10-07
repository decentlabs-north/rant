import CryptoJS from 'crypto-js'

export async function encrypt (message, secret) {
  const key = await crypt(secret)
  const ciphertext = CryptoJS.AES.encrypt(message, key).toString()
  return ciphertext
}

/**
 * BUG: Sometimes throws 'Malformed UTF-8 data' when decrypting
 * this seems to only happen when entering an incorrect secret
 * the bug can be replicated by entering a PIN containing many of the same number e.g. "66666"
 *
 * TODO: deepdive in the CryptoJS ".stringify()" method and find out what might be causing the error
 */
export async function decrypt (encoded, secret) {
  const key = await crypt(secret)
  const originalText = CryptoJS.AES.decrypt(encoded, key).toString(CryptoJS.enc.Utf8)
  return originalText
}

async function crypt (input) {
  return Buffer.from(input).toString('base64')
}
