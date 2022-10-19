import crypto from 'crypto'

export function encrypt (text, password) {
  const key = password.repeat(32).substr(0, 32)
  const iv = password.repeat(16).substr(0, 16)
  const cipher = crypto.createCipheriv('aes-256-ctr', key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return encrypted
}

export function decrypt (text, password) {
  const key = password.repeat(32).substr(0, 32)
  const iv = password.repeat(16).substr(0, 16)
  const decipher = crypto.createDecipheriv('aes-256-ctr', key, iv)
  let decrypted = decipher.update(text, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  /**
   * super hack, will work untill someone posts a rant with a � inside.
   * So either replace � with ' ' in pack or find another way to do "password check"
   */
  if (decrypted.includes('�')) {
    console.log('��we g�t some wi�rd chars man��')
    return false
  }
  return decrypted
}

/**
 * https://gist.github.com/mul14/3844155bde62ba8dfd1294e7f7a43fed#file-encrypto-js <-- finaly found some info on how this module works. Documentation is real bad...
 *
 * Good thing is that this encryption method is free from dependencies :D
 */
