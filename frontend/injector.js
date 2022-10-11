/**
 * Manipulated during build.
 * @returns JSON object with base64-encoded static file content
 */
const styles = `__SCOPED_CSS__
`

/**
 * ```js
 * name = 'test' // to recive test.css
 * return 'test.css' // content of static file
 * ```
 * @param {string} name ***Filename excluding file extension.***
 * @returns {string} ***Content of `filename.css` as string.***
 */
export function getStyleSheet (name) {
  name = name + '.css'
  const jsonStyles = JSON.parse(styles)
  const decoded = Buffer.from(jsonStyles[name], 'base64').toString()
  console.info(`💉injecting stylesheet "${name}"`)
  return decoded
}
