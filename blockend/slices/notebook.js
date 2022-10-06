import { btok, TYPE_RANT, TYPE_TOMB } from '../util.js'
import { unpack } from '../picocard.js'
import { SimpleKernel } from 'picostack'
const { decodeBlock } = SimpleKernel

export default function Notebook (name = 'rants', resolveLocalKey) {
  // There's no clean solution in pico for injecting local identity ATM.
  let _key = null
  const localKey = () => {
    if (_key) return _key
    if (typeof resolveLocalKey === 'function') {
      _key = resolveLocalKey()
      if (!_key) throw new Error('RacingCondition? falsy localKey')
      return _key
    } else throw new Error('resolveLocalKey expected to be function')
  }
  return {
    name,
    initialValue: {},
    filter ({ block, parentBlock }) {
      const data = decodeBlock(block.body)
      const { type } = data
      switch (type) {
        case TYPE_RANT:
          if (block.body.length > 1024) return 'RantTooBig'
          break

        case TYPE_TOMB: {
          // Tombstones can only be placed by author.
          if (!(
            block.key.equals(parentBlock.key) ||
            localKey()?.equals(block.key) // accept own
          )) return 'NotYourRant'

          const pData = decodeBlock(parentBlock.body)
          // Tombstone can only be appended to rants (once).
          if (pData.type !== TYPE_RANT) return 'ExpectedParentToBeRant'
        } break
        default: return 'UnknownBlock'
      }
      return false
    },

    reducer ({ state, block, parentBlock, CHAIN, mark }) {
      const data = decodeBlock(block.body)
      const { type } = data
      if (type === TYPE_TOMB) {
        state[btok(CHAIN)].entombed = true // soft delete
        const propagateOwn = block.key.equals(parentBlock.key) &&
          localKey()?.equals(block.key)
        mark(CHAIN, propagateOwn ? Date.now() + 60 * 60000 : Date.now())
        return state
      }

      const rant = unpack(data)
      state[btok(CHAIN)] = {
        ...rant,
        id: CHAIN,
        author: block.key,
        rev: block.sig,
        size: block.body.length,
        entombed: false,
        encryption: rant.encryption
      }
      return { ...state }
    },

    sweep ({ state, CHAIN, mark, drop }) {
      // TODO: not implemented
      if (!state[btok(CHAIN)].entombed) throw new Error('MentalError: BuriedAlive')
      drop()
      delete state[btok(CHAIN)]
      return state
    }
  }
}
