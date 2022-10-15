import CryptoJS from 'crypto-js'

/**
 * Used to encrypt rant text.
 * Can be decrypted using this {@link decrypt|decrypt function}.
 * @param {*} message String to encrypt.
 * @param {*} secret Secret to encrypt with.
 * @returns Encrypted message.
 */
export async function encrypt (message, secret) {
  const key = await crypt(secret)
  const ciphertext = CryptoJS.AES.encrypt(message, key).toString()
  return ciphertext
}

/**
 * BUG: Sometimes throws 'Malformed UTF-8 data' when decrypting
 * this seems to only happen when entering an incorrect secret
 * see 'test/encryption.js'
 *
 * TODO: deepdive in the CryptoJS ".stringify()" method and find out what might be causing the error
 * OR: just replace CryptoJS with something else ;)
 */

/**
 * Used to decrypt rant text that has been encrypted with this {@link encrypt|encrypt function}.
 * @param {*} encrypted Encrypted string to decrypt.
 * @param {*} secret The secret that was used during encryption.
 * @returns decrypted string
 */
export async function decrypt (encrypted, secret) {
  const key = await crypt(secret)
  const originalText = CryptoJS.AES.decrypt(encrypted, key).toString(CryptoJS.enc.Utf8)
  return originalText
}

/**
 * Encode input to base64
 * @returns base64 string
 */
async function crypt (input) {
  return Buffer.from(input).toString('base64')
}
