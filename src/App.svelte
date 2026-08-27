<script lang="ts">
  import { onMount } from 'svelte';
  import { DEFAULT_SCRIPT } from './lib/defaultScript';

  const KEYS = { text: 'teleprompter-text', speed: 'teleprompter-speed', font: 'teleprompter-font' };
  let reader: HTMLDivElement;
  let text = DEFAULT_SCRIPT;
  let draft = DEFAULT_SCRIPT;
  let speed = 1;
  let fontSize = 46;
  let playing = false;
  let controlsHidden = false;
  let editing = false;

  const paragraphs = () => text.split(/\n\s*\n/).filter(Boolean);
  const isCue = (value: string) => /^\[.*\]$/.test(value.trim());
  const formatParts = (value: string) => value.split(/(\*\*.*?\*\*)/g).filter(Boolean);
  const isStrong = (value: string) => value.startsWith('**') && value.endsWith('**');

  onMount(() => {
    text = localStorage.getItem(KEYS.text) || DEFAULT_SCRIPT;
    draft = text;
    speed = Number(localStorage.getItem(KEYS.speed)) || 1;
    fontSize = Number(localStorage.getItem(KEYS.font)) || 46;

    let frame = 0;
    let previous = 0;
    let carry = 0;
    const tick = (now: number) => {
      if (playing && reader) {
        if (previous) {
          carry += ((now - previous) / 1000) * (10 + speed * 14);
          const pixels = Math.floor(carry);
          if (pixels) { reader.scrollTop += pixels; carry -= pixels; }
          if (reader.scrollTop + reader.clientHeight >= reader.scrollHeight - 2) playing = false;
        }
        previous = now;
      } else { previous = 0; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    const onKey = (event: KeyboardEvent) => {
      if (editing) return;
      if (event.code === 'Space') { event.preventDefault(); playing = !playing; }
      else if (event.key.toLowerCase() === 'h') controlsHidden = !controlsHidden;
      else if (event.key.toLowerCase() === 'f') toggleFullscreen();
      else if (event.key === 'ArrowDown') { event.preventDefault(); move(innerHeight * .18); }
      else if (event.key === 'ArrowUp') { event.preventDefault(); move(-innerHeight * .18); }
    };
    document.addEventListener('keydown', onKey);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('keydown', onKey); };
  });

  function changeSpeed(delta: number) {
    speed = Math.min(3, Math.max(.25, Math.round((speed + delta) * 4) / 4));
    localStorage.setItem(KEYS.speed, String(speed));
  }
  function changeFont(delta: number) {
    fontSize = Math.min(76, Math.max(28, fontSize + delta));
    localStorage.setItem(KEYS.font, String(fontSize));
  }
  function move(amount: number) {
    playing = false;
    reader.scrollBy({ top: amount, behavior: 'smooth' });
  }
  function reset() {
    playing = false;
    reader.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function openEditor() {
    playing = false;
    draft = text;
    editing = true;
  }
  function save() {
    text = draft.trim() || DEFAULT_SCRIPT;
    localStorage.setItem(KEYS.text, text);
    editing = false;
  }
  function toggleFullscreen() {
    document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  }
</script>

<svelte:head><title>Teleprompter de presentación</title></svelte:head>

<main class:controls-hidden={controlsHidden}>
  <div class="reader" bind:this={reader} role="region" aria-label="Texto del teleprompter" onwheel={() => playing = false} ontouchstart={() => playing = false}>
    <article class="script" style:font-size={`${fontSize}px`}>
      {#each paragraphs() as paragraph}
        <p class:cue={isCue(paragraph)}>
          {#each formatParts(paragraph) as part}
            {#if isStrong(part)}<strong>{part.slice(2, -2)}</strong>{:else}{part}{/if}
          {/each}
        </p>
      {/each}
    </article>
  </div>
  <div class="shade top" aria-hidden="true"></div>
  <div class="shade bottom" aria-hidden="true"></div>
  <div class="hint">Espacio: reproducir/pausar · ↑↓: navegar · H: ocultar · F: pantalla completa</div>

  <nav class="toolbar" aria-label="Controles del teleprompter">
    <div class="group"><button class="btn primary" class:active={playing} onclick={() => playing = !playing}>{playing ? 'Ⅱ  Pausa' : '▶  Iniciar'}</button></div>
    <div class="group"><button class="btn" aria-label="Más lento" onclick={() => changeSpeed(-.25)}>−</button><span class="value">{speed}×</span><button class="btn" aria-label="Más rápido" onclick={() => changeSpeed(.25)}>+</button></div>
    <div class="group"><button class="btn" aria-label="Texto más pequeño" onclick={() => changeFont(-2)}>A−</button><span class="value">{fontSize} px</span><button class="btn" aria-label="Texto más grande" onclick={() => changeFont(2)}>A+</button></div>
    <div class="group"><button class="btn" onclick={openEditor}>Editar</button><button class="btn" aria-label="Volver al inicio" onclick={reset}>↥</button><button class="btn" aria-label="Pantalla completa" onclick={toggleFullscreen}>⛶</button><button class="btn" onclick={() => controlsHidden = true}>Ocultar</button></div>
  </nav>
  <button class="show-controls" aria-label="Mostrar controles" onclick={() => controlsHidden = false}>•••</button>

  {#if editing}
    <div class="modal" role="dialog" aria-modal="true" aria-label="Editar discurso">
      <section class="editor">
        <header><h2>Editar discurso</h2><button class="btn" aria-label="Cerrar" onclick={() => editing = false}>✕</button></header>
        <textarea bind:value={draft} spellcheck="true" aria-label="Texto del discurso"></textarea>
        <footer><button class="btn" onclick={() => editing = false}>Cancelar</button><button class="btn save" onclick={save}>Guardar cambios</button></footer>
      </section>
    </div>
  {/if}
</main>
