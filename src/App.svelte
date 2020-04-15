<script>
// imports
import { derived, writable } from 'svelte/store'
import marked from 'marked'
import Purify from 'dompurify'
import IdentityPane from './IdentityPane.svelte'

// props
export let card
export let uid
export let rant
export let theme

// code
const pickle = derived(card, s => s.pickle || '')
const mdHtml = derived([rant, card], ([$md, $card]) => marked(Purify.sanitize($md))
  .replace(/\{\{DATE\}\}/gi, new Date($card.date))
  .replace(/\{\{KEY\}\}/gi, $card.key.toString('hex'))
)

const themes = [
  'cyborg',
  'love-letter',
  'happy-birthday',
  'invitation',
  'robin',
  'blackmail'
].map((name, id) => ({ name, id}))


/* The main state of the view.. */
const state = writable(0)

const toggleState = state.update.bind(state, s => s ? 0 : 1)
const mainClass = derived([theme, state], ([t, s]) => `${themes[t].name} ${s ? 'edit' : 'show'}`)
</script>

<main class={$mainClass}>
  <!-- controls -->
  <nav>
    <div class="flex row xcenter"><!-- left -->
      {#if $state}
        <!-- capacity and indicator -->
        <div class="flex column xcenter">
          <samp>{$card.size} / 1024</samp>
          <div id="capacity">
            <span style={`width: ${$card.size / 10.24}%;`}></span>
          </div>
        </div>
        <code>[🗜️{Math.round($card.ratio * 100)}%]</code>
      {:else}
        <IdentityPane identity={uid}/>
      {/if}
    </div>

    <div><!-- middle -->
      <button on:click={toggleState}
              class="uline"
              class:purp={$state}
              class:moss={!$state}>{$state ? 'Preview' : 'Editor'}</button>
      {#if $state}
        <button class="uline red emo">🌼</button>
      {/if}
    </div>

    <div class="flex row xcenter"><!-- right -->
      {#if $state}
        <!-- Theme choose -->
        <select class="uline moss" bind:value={$theme}>
          {#each themes as t}
            <option value={t.id}>
            {t.name}
            </option>
          {/each}
        </select>
      {:else}
        <button class="uline purp">Encrypt</button>
        <button class="uline orange">Socmed</button>
        <button class="uline red">Clipboard</button>
      {/if}
    </div>
  </nav>

  <!-- editor -->
  {#if $state}
    <section id="editor">
      <textarea bind:value={$rant}></textarea>
    </section>
  {/if}

  <!-- content -->
  <section id="render">
    {@html $mdHtml}
  </section>



  <footer><a href="https://decentlabs.se">1k.Rant copyright © Tony Ivanov 2020 - License GNU AGPLv3</a></footer>
</main>

<style>
  /*
	main {
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}*/
</style>
