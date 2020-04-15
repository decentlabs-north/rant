<script>
export let secret
export let visible
import Modal from './Modal.svelte'
import { scrypt, randomBytes } from 'cryptology'
// import { writable } from 'svelte/store'
let passphrase
let type = 0
let computing = false // writable(false)
const applyFn = () => {
  switch (type) {
    case 1:
      console.time('scrypt')
      computing = true
      const salt = randomBytes(6)
      scrypt(passphrase, salt)
        .then(buffer => {
          console.timeEnd('scrypt')
          secret.set({ salt, key: buffer, type })
          passphrase = ''
          computing = false
          visible.set(false)
        })
      break
    case 0:
    default:
      secret.set({ type: 0 })
      visible.set(false)
  }
}
</script>
<section>
  {#if $visible}
    <Modal on:close="{() => $visible = false}">
      <h2 slot="header" style="text-align: center">
        Choose encryption type
      </h2>
      <div>
        <label for="plain"><input id="plain" type="radio" bind:group={type} value={0}> No encryption </label>
        <label for="pw"><input id="pw" type="radio" bind:group={type} value={1}> Passphrase</label>
        <label for="box"><input id="box" type="radio" bind:group={type} value={2}/> Personal</label>
        <label for="pz"><input id="pz" type="radio" bind:group={type} value={3}/> Puzzlebox</label>
        <div style="text-align: center">
          {#if type == 1 }
            <p>Encrypt with a passphrase</p>
            <input id="pw"
                   type="text"
                   disabled={computing}
                   on:keydown={e => e.key === 'Enter' && applyFn()}
                   bind:value={passphrase} />
            <br/>
            <small>This is the only time you will see the password</small>
            {#if computing}<h3>Deriving key...</h3>{/if}
          {:else if type === 2}
            <p>Only the receiver will be able to read the message</p>
            <textarea disabled="true" placeholder="Receivers public box key"></textarea>
            <br/><a href="https://github.com/telamon/rant/issues">Not impl yet.</a>
          {:else if type === 3}
            <p>A simple lock that can be cracked open with time</p>
            <br/><a href="https://github.com/telamon/rant/issues">Not impl yet.</a>
          {:else}
            <p>Anybody with the link can read the message</p>
          {/if}
        </div>
      </div>
      <span slot="ctrls">
        <button on:click={applyFn}>apply</button>
      </span>
    </Modal>
  {/if}
</section>
<style>
  #pw { font-size: large; padding: 0.5em; }
</style>
