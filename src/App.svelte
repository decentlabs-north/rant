<script>
// imports
import { derived, writable } from 'svelte/store'
import marked from 'marked'
import Purify from 'dompurify'
import IdentityPane from './IdentityPane.svelte'

// props
export let uid
export let rant
export let theme
export let stats

// code
const pickle = derived(stats, s => s.pickle || '')
const mdHtml = derived(rant, md => marked(Purify.sanitize(md)))
const themes = [
  'cyborg',
  'love-letter',
  'happy-birthday',
  'invitation',
  'roundrobin',
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
    <div><!-- left -->
      <!-- Todo: uid component -->
      <IdentityPane identity={uid}/>
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
        <!-- capacity and indicator -->
        <div class="flex column xcenter">
          <samp>{$stats.size} / 1024</samp>
          <div id="capacity">
            <span style={`width: ${$stats.size / 10.24}%;`}></span>
          </div>
        </div>
        <code>[🗜️{Math.round($stats.ratio * 100)}%]</code>

        <!-- Theme choose -->
        <select style="display: none" bind:value={$theme}>
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
