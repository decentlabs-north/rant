import { spawnPeer } from '../test/helpers.js'
import Modem56 from 'picostack/modem56.js'
import { get } from 'piconuro'
import { writeFileSync } from 'node:fs'

const FAILFAST = !!process.env.FAILFAST

export default class Bot {
  onError (type, err) {
    this.signal(type)
    console.error(this.name, type, err)
    if (FAILFAST) {
      this.dump('error.dot')
        .then(() => this.kernel.feed())
        .then(f => {
          f.inspect()
          process.exit(-1)
        })
    }
  }

  async onRants (rants) {
    console.info('PicoBot#onRant(rants[])', rants.length)
  }

  async post (text) {
    throw new Error('kernel not booted')
  }

  async dump () {
    const dotString = await this.pub.inspect()
    writeFileSync(`${this.name}-repo.dot`, dotString)
  }

  async boot (ctx, done, topic = 'PicoBotnet') {
    if (!done) done = () => console.log(`<${name}> färdig!`)
    // stub signal when bot is used outside of simulator / standalone bot
    if (!ctx.signal) ctx.signal = console.info
    this.ctx = ctx
    const { swarm, signal, name } = ctx // simulator context
    const {
      pub, // public kernel (adventurer backpack)
      prv, // private kernel (notepad)
      // clock, // Virtual clock that supports setting offsets (maybe shouldn't be used?)
      spawnWire,
      post
      // dump
    } = await spawnPeer(name) // Peer spawner
    this.pub = pub
    this.prv = prv

    this.signal = signal
    this.name = name

    ctx.ontick(tick => {
      // pub._collectGarbage(ctx.simulator.time)
      // TODO: use `debugger`j
      // pub.gc(tick or clock.. i don't know)
    })

    const modem = new Modem56(swarm)
    modem.join(topic, spawnWire)
    signal(`${name} joined`)

    const errorHandler = this.onError.bind(this)
    pub.$rants()(rants => {
      // Set ctx.version to display capacity
      ctx.version = rants.length
      this.onRants(rants).catch(errorHandler)
    })

    this.post = post
    if (typeof this.afterBoot === 'function') await this.afterBoot()
  }
}

// Happy peers post an inital rant after boot
// and then 'should' post new rants every once in a while.
export class HappyPeer extends Bot {
  async afterBoot () {
    const contents = [
      `Today i had pancakes. It was good /${this.name}`,
      `${this.name} is the best name ever`,
      `${this.name}: Did you hear about the weather?`,
      `${this.name}: Where are my pants?`,
      `Please add more stuff to say ${this.name}`
    ]
    const i = Math.floor((Math.random() * (contents.length - 1)))
    await this.post(contents[i])
    setInterval(async () => {
      const rants = get(this.pub.$rants())

      for (const rant of rants) {
        try {
          await this.pub.bump(rant.id)
        } catch (err) {
          switch (err.message) {
            case 'InvalidBlock: TooSoonToBump':
            case 'InvalidBlock: AlreadyBumped':
              break
            default:
              console.log(err.message)
          }
        }
      }
      await this.dump()
    }, 1000)
  }

  async onRants (rants) {
    // Bump stuff.
    for (const rant of rants) {
      this.signal('Bump x' + rant.bumpedBy.length)
    }
  }
}
