import Bot from './bot.js'
import hyperswarmweb from 'hyperswarm-web'
import wrtc from 'wrtc'

const TOPIC = 'GLOBAL_RANT_WARNING'

for (let i = 0; i < 10; i++) {
  const swarm = hyperswarmweb({ simplePeer: { wrtc } })
  const a = new Bot()
  const ctx = {
    name: `Daphne ${i}`,
    swarm,
    signal: console.info.bind(null, 'SIG '),
    ontick: () => {}
  }
  a.boot(ctx, () => console.log('Done'), TOPIC)
    .catch(err => {
      ctx.signal('BootFailure')
      console.error('BootFailure', err)
      process.exit(-1)
    })
    .then(console.log.bind(null, 'booted', i))
}
