import Simulator from 'hyper-simulator'
import { HappyPeer } from './bot.js'
const names = ['Alice', 'Bob', 'Greg', 'Daphne', 'Ophelia']
async function main () {
  const sim = new Simulator()
  await sim.ready()
  // Spawn good peers.
  for (let i = 0; i < 8; i++) {
    const name = pick(names) || `fBot${i}`
    sim.launch(name, { linkRate: 56 << 10 }, async (ctx, done) => {
      const peer = new HappyPeer(ctx, done)
      peer.boot(ctx, () => console.log('Done'), 'picochat-testnet')
        .catch(err => {
          ctx.signal('BootFailure')
          console.error('spawnAlice() failed:', err)
          process.exit(-1)
        })
    })
  }
  // Spawn spammers/ EvilPeer
  return sim.run(1, 500)
}

main()
  .then(() => {
    console.log('Simulation complete')
    process.exit(0)
  })
  .catch(err => {
    console.error('Simulation failed:', err)
    process.exit(1)
  })

function pick (arr) {
  const i = Math.floor((Math.random() * (arr.length - 1)))
  return arr.splice(i, 1)[0]
}
