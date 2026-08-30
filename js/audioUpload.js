// audioUpload.js — Member 1
const AudioUpload = (function () {

  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('audio-file-input');
  const fileNameEl = document.getElementById('fileName');
  const removeBtn = document.getElementById('removeFileBtn');
  const statusEl = document.getElementById('upload-status');
  const presetBtns = document.querySelectorAll('[data-preset]');

  const PRESETS = {
    'High Traffic Lane': 'assets/audio-samples/high-noise.wav',
    'Moderate Shipping Zone': 'assets/audio-samples/medium-noise.wav',
    'Quiet Sanctuary': 'assets/audio-samples/low-noise.wav'
  };

  let audioContext = null;
  function getCtx() {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    return audioContext;
  }

  function formatBytes(bytes) {
    if (!bytes) return '';
    const kb = bytes / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${Math.round(kb)} KB`;
  }

  function setState(cls, html) {
    statusEl.className = 'upload-state ' + cls;
    statusEl.innerHTML = html;
  }

  function resetFile() {
    fileInput.value = '';
    fileNameEl.textContent = 'Drag & drop audio, or click to browse';
    removeBtn.hidden = true;
    setState('idle', 'No file selected yet.');
  }

  async function decodeAndAnalyze(source, label, isPreset) {
    setState('loading', '<div class="progress-track"><div class="progress-fill" id="pfill"></div></div><span>Decoding…</span>');
    const pfill = document.getElementById('pfill');
    let pct = 15;
    if (pfill) pfill.style.width = pct + '%';

    try {
      const ctx = getCtx();
      let arrayBuffer;
      if (isPreset) {
        const res = await fetch(source);
        if (!res.ok) throw new Error(`Could not load preset file (HTTP ${res.status}). Check assets/audio-samples/.`);
        arrayBuffer = await res.arrayBuffer();
      } else {
        arrayBuffer = await source.arrayBuffer();
      }

      pct = 55;
      if (pfill) pfill.style.width = pct + '%';
      setState('loading', '<div class="progress-track"><div class="progress-fill" id="pfill" style="width:55%;"></div></div><span>Analyzing…</span>');

      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

      if (!window.Classifier || typeof window.Classifier.classify !== 'function') {
        throw new Error('Classifier module not loaded yet — waiting on Member 2.');
      }

      await window.Classifier.classify(audioBuffer, label);
      setState('success', `✓ Analysis complete for "${label}".`);
      Toast.show(`Analysis complete for "${label}".`, 'success');
    } catch (err) {
      console.error(err);
      setState('error', `✕ ${err.message || 'Failed to analyze audio. Please try a different file.'}`);
      Toast.show(err.message || 'Failed to analyze audio.', 'error');
    }
  }

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('keypress', (e) => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    fileNameEl.textContent = `${file.name} (${formatBytes(file.size)})`;
    removeBtn.hidden = false;
    decodeAndAnalyze(file, file.name, false);
  });

  ['dragenter', 'dragover'].forEach((evt) => {
    dropZone.addEventListener(evt, (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
  });
  ['dragleave', 'drop'].forEach((evt) => {
    dropZone.addEventListener(evt, (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); });
  });
  dropZone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      setState('error', '✕ Please drop an audio file (WAV or MP3).');
      Toast.show('Please drop an audio file (WAV or MP3).', 'error');
      return;
    }
    fileNameEl.textContent = `${file.name} (${formatBytes(file.size)})`;
    removeBtn.hidden = false;
    decodeAndAnalyze(file, file.name, false);
  });

  removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    resetFile();
  });

  presetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const name = btn.dataset.preset;
      const path = PRESETS[name];
      fileNameEl.textContent = `Preset: ${name}`;
      removeBtn.hidden = true;
      decodeAndAnalyze(path, name, true);
    });
  });

  return { resetFile };

})();