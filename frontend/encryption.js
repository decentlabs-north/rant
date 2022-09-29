import CryptoJS from 'crypto-js'

export async function encrypt (message, secret) {
  const ciphertext = CryptoJS.AES.encrypt(message, secret.toString()).toString()
  return ciphertext
}

export async function decrypt (encoded, secret, timeout) {
  /* ugly recursive Try Catch fix for 'Error: Malformed UTF-8 data' */
  if (Date.now() >= timeout) {
    throw new Error('Decryption Timed Out')
  }
  try {
    const originalText = CryptoJS.AES.decrypt(encoded, secret.toString()).toString(CryptoJS.enc.Utf8)
    return originalText
  } catch (err) {
    throw new Error(err.message)
    // console.error('DECRYPT ERROR: ', err)
    // return await decrypt(encoded, secret, timeout)
  }
}
