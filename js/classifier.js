// classifier.js
// STUB VERSION — replace internals with real TF.js model loading + inference
// once your teammate delivers the trained model.
// Interface stays the same: window.Classifier.classify(audioBuffer, sourceLabel)
// Writes results into window.AppState so scene3d.js and report.js stay in sync.

window.AppState = window.AppState || {
  classification: null,   // { noiseClass, frequency, status, vesselType, sourceLabel, timestamp }
  lastCopilotReply: null,
  sceneReady: false
};

const Classifier = (function () {

  const resultLabel = document.getElementById('result-label');
  const resultContainer = document.getElementById('classification-result');

  const CLASSES = ['low', 'medium', 'high'];
  const STATUS_MAP = { low: 'Normal', medium: 'Elevated', high: 'Extreme' };
  const FREQ_RANGES = { low: [60, 100], medium: [101, 160], high: [161, 220] };
  const VESSEL_TYPES = {
    low: ['research vessel', 'fishing boat'],
    medium: ['cargo ship', 'fishing boat'],
    high: ['tanker', 'cargo ship']
  };

  // TODO: Replace this stub with real model loading, e.g.:
  // let model = null;
  // async function loadModel() {
  //   model = await tf.loadLayersModel('assets/models/model.json');
  // }
  // loadModel();

  function randomInRange([min, max]) {
    return Math.round(min + Math.random() * (max - min));
  }

  function pickVesselType(noiseClass) {
    const options = VESSEL_TYPES[noiseClass];
    return options[Math.floor(Math.random() * options.length)];
  }

  function displayResult(data) {
    resultLabel.textContent = data.sourceLabel
      ? `${data.sourceLabel}: ${data.status} (${data.frequency} Hz)`
      : `${data.status} — ${data.frequency} Hz`;

    resultContainer.className = '';
    resultLabel.className = `noise-${data.noiseClass}`;
  }

  // STUB: randomly generates a result instead of running real inference.
  // audioBuffer is accepted for interface compatibility but unused here.
  async function classify(audioBuffer, sourceLabel) {
    await new Promise((resolve) => setTimeout(resolve, 600));

    // TODO: Replace with real feature extraction (spectrogram) + model.predict()
    const noiseClass = CLASSES[Math.floor(Math.random() * CLASSES.length)];
    const frequency = randomInRange(FREQ_RANGES[noiseClass]);
    const status = STATUS_MAP[noiseClass];
    const vesselType = pickVesselType(noiseClass);

    const result = {
      noiseClass,
      frequency,
      status,
      vesselType,
      sourceLabel: sourceLabel || 'Uploaded clip',
      timestamp: new Date().toISOString()
    };

    // Single source of truth for the whole app
    window.AppState.classification = result;

    displayResult(result);

    // Notify other modules (scene3d.js) that a new classification happened
    document.dispatchEvent(new CustomEvent('azhiyam:classificationResult', {
      detail: result
    }));

    return result;
  }

  return { classify };

})();

window.Classifier = Classifier;