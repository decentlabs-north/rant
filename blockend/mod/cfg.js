/**
 * mod/cfg.js
 *
 * Creates writable neurons that are kept synced and persisted.
 * Used to store arbitrary user-settings.
 *
 * usage:
 * const [x, setX] = k.config('x', 'defaultValue')
 */

import { write } from 'piconuro'

export default function ConfigModule () {
  const cache = {}

  return {
    config (key, defaultValue) {
      if (typeof key !== 'string') throw new Error('Expected key to be string')
      if (!cache[key]) {
        const [output, input] = write(defaultValue)
        const setter = async v => {
          input(v)
          await this.repo.writeReg(`cnf|${key}`, JSON.stringify(v))
        }
        this.repo.readReg(`cnf|${key}`).then(v => {
          if (typeof v === 'undefined' && typeof defaultValue !== 'undefined') {
            input(defaultValue)
            return setter(defaultValue)
          } else {
            input(JSON.parse(v))
          }
        })
        cache[key] = [output, setter]
      }
      return cache[key]
    }
  }
}
