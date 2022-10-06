/*
 * Helpers and utility functions for Kernels & Slices
 */
import Feed from 'picofeed'

export const TYPE_RANT = 0
export const TYPE_TOMB = 1

// Buffer to Key(string)
export function btok (b, length = -1) {
  if (Buffer.isBuffer(b) && length > 0) b = b.slice(0, Math.min(length, b.length))
  return b.toString('hex')
}

// String-key to Buffer (expects unsliced buffers)
export function ktob (s) {
  if (typeof s !== 'string') throw new Error('Expected string')
  if (s.length !== Feed.SIGNATURE_SIZE) throw new Error('Expected a 64Bytes signature')
  return Buffer.from(s, 'hex')
}

// Don't ask, i seem to like footguns.
export function isDraftID (id) {
  return typeof id === 'string' && id.startsWith('draft:')
}

export function isRantID (id) {
  return Buffer.isBuffer(id) && id.length === Feed.SIGNATURE_SIZE
}

export function isEqualID (a, b) {
  return (isDraftID(a) && a === b) || // Compare strings
    ( // Compare buffers
      isRantID(a) &&
      isRantID(b) &&
      a.equals(b)
    )
}
