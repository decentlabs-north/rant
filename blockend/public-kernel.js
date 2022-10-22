import { SimpleKernel } from 'picostack'
import { mute, get } from 'piconuro'
// Import Modules
import ModuleInspect from './mod/inspect.js'
import { mapRant } from './mod/draft.js'
// Slice imports
import { TYPE_RANT, btok } from './util.js'
import { unpack } from './picocard.js'
const { decodeBlock } = SimpleKernel

const TYPE_BUMP = 'shit'

export default class PublicKernel extends SimpleKernel {
  constructor (db, now = Date.now) {
    super(db)
    this.repo.allowDetached = true // enable multiple chains per author

    // Register consensus slices
    this.store.register(TinyBoard(undefined, undefined, now))

    // Register modules
    Object.assign(this, ModuleInspect())
  }

  $rants () {
    const $rs = subscriber => this.store.on('rants', subscriber)
    return mute($rs, state => Object.values(state).map(mapRant))
  }

  // TODO: picostack/SimpleKernel - When detached mode is active this
  // should be default behaviour
  async onquery () {
    const feeds = []
    const res = await this.repo.listFeeds()
    for (const { value: chainId } of res) {
      if (!Buffer.isBuffer(chainId)) {
        console.error('ChainId borked', chainId)
        continue
      }
      const feed = await this.repo.resolveFeed(chainId)
      feeds.push(feed)
    }
    return feeds
  }

  gc (at) {
    return this.store.gc(at)
  }
}

/**
 * First attempt at a moving-window consensus.
 */
const ONE_HOUR = 3600000
function TinyBoard (size = 50, ttl = ONE_HOUR, now = Date.now) {
  return {
    name: 'rants',
    initialValue: {},
    filter ({ block, parentBlock }) {
      const data = decodeBlock(block.body)
      const { type } = data
      switch (type) {
        case TYPE_RANT: {
          const rant = unpack(data)
          if (block.body.length > 1024) return 'RantTooBig'
          if (rant.encryption !== 0) return 'RantEncrypted'
          if (rant.public !== true) return 'RantNotPublic'
          const expiresAt = rant.date + ttl // - maxStunLock
          if (expiresAt < now()) return 'RantExpired'
        } break

        case TYPE_BUMP:
          // TODO: model stun-lock with diminishing returns
          break
        default: return 'UnknownBlock'
      }
      return false
    },

    reducer ({ state, block, parentBlock, CHAIN, mark }) {
      const data = decodeBlock(block.body)
      const { type } = data
      switch (type) {
        case TYPE_RANT: {
          const rant = unpack(data)
          state[btok(CHAIN)] = {
            ...rant,
            id: CHAIN,
            author: block.key,
            rev: block.sig,
            size: block.body.length,
            expiresAt: rant.date + ttl, // - current stunLock
            overflowAt: 0
          }
          mark(btok(CHAIN), state[btok(CHAIN)].expiresAt)

          // If board-capacity reached.
          // Mark lowest scored rant for deletion
          const rants = Object.values(state)
            .filter(r => !r.overflowAt)
          if (rants.length > size) {
            const last = sortByWeight(rants)[rants.length - 1]
            last.overflowAt = now()
            mark(btok(last.id)) // mark for gc
          }
        }
      }
      return { ...state }
    },

    sweep ({ state, CHAIN, mark, drop, payload }) {
      const rant = state[btok(CHAIN)]
      if (!rant) {
        console.warning('RantAlreadyGone')
        return state
      }
      // console.log('Sweeping expiresAt:', new Date(rant.expiresAt), ' now:', new Date(now()))
      if (!rant.overflowAt && rant.expiresAt > now()) { // Not dead
        // Create a new gc-mark with fresh expiry date
        mark(payload, rant.expiresAt)
      } else { // Dead
        drop() // cleanup block-repo
        delete state[btok(CHAIN)] // cleanup-state
      }

      return state
    }
  }
}

export function sortByWeight (rants) {
  // I supposed we'd want to put some real
  // weight-calculation here
  return rants.sort((a, b) => b.expiresAt > a.expiresAt)
}
