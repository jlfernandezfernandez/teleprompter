<script lang="ts">
  import { onMount } from 'svelte';
  import { DEMO_SCRIPTS } from './lib/defaultScript';

  const randomScript = () => DEMO_SCRIPTS[Math.floor(Math.random() * DEMO_SCRIPTS.length)];

  const KEYS = {
    text: 'teleprompter-text',
    speed: 'teleprompter-speed',
    font: 'teleprompter-font',
    width: 'teleprompter-width',
    lineHeight: 'teleprompter-line-height',
    theme: 'teleprompter-theme'
  };
  type Theme = 'system' | 'light' | 'dark';
  let reader: HTMLDivElement;
  let defaultScript = randomScript();
  let text = defaultScript;
  let draft = defaultScript;
  let speed = 1;
  let fontSize = 46;
  let readerWidth = 980;
  let lineHeight = 1.5;
  let playing = false;
  let controlsHidden = false;
  let settingsOpen = false;
  let moreOpen = false;
  let theme: Theme = 'system';
  let editing = false;

  const paragraphs = () => text.split(/\n\s*\n/).filter(Boolean);
  const isCue = (value: string) => /^\[.*\]$/.test(value.trim());
  const formatParts = (value: string) => value.split(/(\*\*.*?\*\*)/g).filter(Boolean);
  const isStrong = (value: string) => value.startsWith('**') && value.endsWith('**');

  onMount(() => {
    const savedText = localStorage.getItem(KEYS.text);
    text = savedText ?? defaultScript;
    draft = text;
    speed = Number(localStorage.getItem(KEYS.speed)) || 1;
    fontSize = Number(localStorage.getItem(KEYS.font)) || 46;
    readerWidth = Number(localStorage.getItem(KEYS.width)) || 980;
    lineHeight = Number(localStorage.getItem(KEYS.lineHeight)) || 1.5;
    theme = (localStorage.getItem(KEYS.theme) as Theme | null) || 'system';
    document.documentElement.dataset.theme = theme;

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
      if (event.key === 'Escape') { editing = false; closePopovers(); return; }
      if (editing) return;
      if (event.code === 'Space') { event.preventDefault(); playing = !playing; closePopovers(); }
      else if (event.key.toLowerCase() === 'h') controlsHidden = !controlsHidden;
      else if (event.key.toLowerCase() === 'f') toggleFullscreen();
      else if (event.key === 'Home') { event.preventDefault(); reset(); }
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
  function changeReaderWidth(value: number) {
    readerWidth = value;
    localStorage.setItem(KEYS.width, String(value));
  }
  function changeLineHeight(value: number) {
    lineHeight = value;
    localStorage.setItem(KEYS.lineHeight, String(value));
  }
  function resetReadingSettings() {
    fontSize = 46;
    localStorage.setItem(KEYS.font, String(fontSize));
    changeReaderWidth(980);
    changeLineHeight(1.5);
  }
  function changeTheme(value: Theme) {
    theme = value;
    document.documentElement.dataset.theme = value;
    localStorage.setItem(KEYS.theme, value);
  }
  function closePopovers() {
    settingsOpen = false;
    moreOpen = false;
  }
  function toggleSettings() {
    settingsOpen = !settingsOpen;
    moreOpen = false;
  }
  function toggleMore() {
    moreOpen = !moreOpen;
    settingsOpen = false;
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
    closePopovers();
    draft = text;
    editing = true;
  }
  function updateDraft(value: string) {
    draft = value;
    text = value;
    localStorage.setItem(KEYS.text, value);
  }
  function toggleFullscreen() {
    document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  }
</script>

<svelte:head><title>Teleprompter de presentación</title></svelte:head>

<main class:controls-hidden={controlsHidden}>
  <div class="reader" bind:this={reader} role="region" aria-label="Texto del teleprompter" onwheel={() => playing = false} ontouchstart={() => playing = false}>
    <article class="script" style:font-size={`${fontSize}px`} style:max-width={`${readerWidth}px`} style:line-height={lineHeight}>
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

  {#if settingsOpen || moreOpen}
    <button class="popover-dismiss" aria-label="Cerrar menú" onclick={closePopovers}></button>
  {/if}

  {#if settingsOpen}
    <section id="reading-settings" class="popover settings" aria-label="Ajustes de lectura">
      <header><strong>Ajustes de lectura</strong><button class="popover-close" aria-label="Cerrar ajustes" onclick={closePopovers}>✕</button></header>
      <label>
        <span><span>Tamaño del texto</span><output>{fontSize} px</output></span>
        <input type="range" min="28" max="76" step="2" value={fontSize} oninput={(event) => { fontSize = Number(event.currentTarget.value); localStorage.setItem(KEYS.font, String(fontSize)); }} />
      </label>
      <label>
        <span><span>Ancho del texto</span><output>{readerWidth} px</output></span>
        <input type="range" min="480" max="1280" step="20" value={readerWidth} oninput={(event) => changeReaderWidth(Number(event.currentTarget.value))} />
      </label>
      <label>
        <span><span>Espaciado de líneas</span><output>{lineHeight.toFixed(2)}×</output></span>
        <input type="range" min="1.25" max="1.9" step="0.05" value={lineHeight} oninput={(event) => changeLineHeight(Number(event.currentTarget.value))} />
      </label>
      <fieldset>
        <legend>Tema</legend>
        <div class="segmented">
          {#each [['system', 'Sistema'], ['light', 'Claro'], ['dark', 'Oscuro']] as option}
            <button class:active={theme === option[0]} aria-pressed={theme === option[0]} onclick={() => changeTheme(option[0] as Theme)}>{option[1]}</button>
          {/each}
        </div>
      </fieldset>
      <button class="reset-settings" onclick={resetReadingSettings}>Restablecer</button>
    </section>
  {/if}

  {#if moreOpen}
    <section id="more-options" class="popover more-options" aria-label="Más opciones">
      <button onclick={openEditor}><span aria-hidden="true">✎</span><span>Editar texto</span></button>
      <button onclick={() => { reset(); closePopovers(); }}><span aria-hidden="true">↶</span><span>Volver al inicio</span></button>
      <button onclick={() => { controlsHidden = true; closePopovers(); }}><span aria-hidden="true">◉̸</span><span>Ocultar controles</span></button>
    </section>
  {/if}

  <nav class="toolbar" aria-label="Controles del teleprompter">
    <div class="group play-group"><button class="btn primary" class:active={playing} aria-pressed={playing} onclick={() => playing = !playing}><span aria-hidden="true">{playing ? 'Ⅱ' : '▶'}</span><span class="play-label">{playing ? 'Pausa' : 'Iniciar'}</span></button></div>
    <div class="group"><button class="btn" aria-label="Más lento" onclick={() => changeSpeed(-.25)}>−</button><span class="value">{speed}×</span><button class="btn" aria-label="Más rápido" onclick={() => changeSpeed(.25)}>+</button></div>
    <div class="group font-controls"><button class="btn text-size" aria-label="Reducir tamaño del texto" onclick={() => changeFont(-2)}>A−</button><span class="value font-value">{fontSize}</span><button class="btn text-size" aria-label="Aumentar tamaño del texto" onclick={() => changeFont(2)}>A+</button></div>
    <div class="group actions"><button class="btn icon-action sliders" class:active={settingsOpen} aria-label="Ajustes de lectura" title="Ajustes de lectura" aria-expanded={settingsOpen} aria-controls="reading-settings" onclick={toggleSettings}>☷</button><button class="btn icon-action fullscreen-action" aria-label="Pantalla completa" title="Pantalla completa (F)" onclick={toggleFullscreen}>⛶</button><button class="btn icon-action more-action" class:active={moreOpen} aria-label="Más opciones" title="Más opciones" aria-expanded={moreOpen} aria-controls="more-options" onclick={toggleMore}>•••</button></div>
  </nav>
  <button class="show-controls" aria-label="Mostrar controles" onclick={() => controlsHidden = false}>⌃</button>

  {#if editing}
    <div class="modal" role="dialog" aria-modal="true" aria-label="Editar discurso">
      <section class="editor">
        <header><h2>Editar discurso</h2><button class="btn" aria-label="Cerrar" onclick={() => editing = false}>✕</button></header>
        <textarea value={draft} oninput={(event) => updateDraft(event.currentTarget.value)} spellcheck="true" aria-label="Texto del discurso"></textarea>
        <footer><span class="autosave">Guardado automáticamente en este navegador</span><button class="btn save" onclick={() => editing = false}>Listo</button></footer>
      </section>
    </div>
  {/if}
</main>
