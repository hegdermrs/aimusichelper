const elements = {
  startBtn: document.getElementById('startBtn'),
  stopBtn: document.getElementById('stopBtn'),
  pitchHz: document.getElementById('pitchHz'),
  noteName: document.getElementById('noteName'),
  stabilityValue: document.getElementById('stabilityValue'),
  rmsValue: document.getElementById('rmsValue'),
  airflowValue: document.getElementById('airflowValue'),
  sustainTimer: document.getElementById('sustainTimer'),
  stabilityBar: document.getElementById('stabilityBar'),
  volumeBar: document.getElementById('volumeBar'),
  airflowBar: document.getElementById('airflowBar'),
  pitchCanvas: document.getElementById('pitchCanvas')
};

const state = {
  audioCtx: null,
  stream: null,
  analyzer: null,
  detector: null,
  pitchWindow: [],
  pitchHistory: [],
  sustainStart: null,
  rafId: null
};

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function hzToNoteName(freq) {
  const midi = Math.round(69 + 12 * Math.log2(freq / 440));
  const note = NOTE_NAMES[((midi % 12) + 12) % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}

function stdDev(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function drawPitchHistory() {
  const ctx = elements.pitchCanvas.getContext('2d');
  const { width, height } = elements.pitchCanvas;
  ctx.clearRect(0, 0, width, height);

  ctx.strokeStyle = '#2a3c5f';
  ctx.lineWidth = 1;
  for (let y = 0; y <= 4; y += 1) {
    const yy = (height / 4) * y;
    ctx.beginPath();
    ctx.moveTo(0, yy);
    ctx.lineTo(width, yy);
    ctx.stroke();
  }

  ctx.strokeStyle = '#61dafb';
  ctx.lineWidth = 2;
  ctx.beginPath();

  const minHz = 80;
  const maxHz = 1000;

  state.pitchHistory.forEach((p, i) => {
    const x = (i / Math.max(1, state.pitchHistory.length - 1)) * width;
    const normalized = clamp01((p - minHz) / (maxHz - minHz));
    const y = height - normalized * height;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function updateFromFeatures(features) {
  const pitch = state.detector(features.buffer);
  if (pitch && pitch > 60 && pitch < 1400) {
    state.pitchWindow.push(pitch);
    state.pitchHistory.push(pitch);
    if (state.pitchWindow.length > 24) state.pitchWindow.shift();
    if (state.pitchHistory.length > 90) state.pitchHistory.shift();

    elements.pitchHz.textContent = pitch.toFixed(1);
    elements.noteName.textContent = hzToNoteName(pitch);
  }

  const wobble = stdDev(state.pitchWindow);
  const wobbleScore = clamp01(1 - wobble / 18);
  elements.stabilityValue.textContent = wobbleScore > 0.7 ? 'Stable' : wobbleScore > 0.45 ? 'Needs focus' : 'Wobbly';
  elements.stabilityBar.style.width = `${Math.round(wobbleScore * 100)}%`;

  const rms = features.rms || 0;
  elements.rmsValue.textContent = rms.toFixed(3);
  elements.volumeBar.style.width = `${Math.round(clamp01(rms / 0.25) * 100)}%`;

  const harmonic = (features.spectralCentroid || 0) / 5000;
  const noise = clamp01((features.zcr || 0) / 0.25);
  const airflow = clamp01(noise * 0.6 + (1 - harmonic) * 0.4);
  elements.airflowValue.textContent = airflow > 0.55 ? 'Breathy' : 'Cleaner';
  elements.airflowBar.style.width = `${Math.round(airflow * 100)}%`;

  if (pitch && wobbleScore > 0.65 && rms > 0.015) {
    if (!state.sustainStart) state.sustainStart = performance.now();
  } else {
    state.sustainStart = null;
  }

  const sustainMs = state.sustainStart ? performance.now() - state.sustainStart : 0;
  elements.sustainTimer.textContent = `${(sustainMs / 1000).toFixed(2)}s`;

  drawPitchHistory();
}

async function start() {
  state.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  state.audioCtx = new AudioContext();
  const source = state.audioCtx.createMediaStreamSource(state.stream);

  state.detector = Pitchfinder.AMDF({ sampleRate: state.audioCtx.sampleRate });
  state.analyzer = Meyda.createMeydaAnalyzer({
    audioContext: state.audioCtx,
    source,
    bufferSize: 2048,
    featureExtractors: ['buffer', 'rms', 'zcr', 'spectralCentroid'],
    callback: updateFromFeatures
  });

  state.analyzer.start();
  elements.startBtn.disabled = true;
  elements.stopBtn.disabled = false;
}

function stop() {
  if (state.analyzer) state.analyzer.stop();
  if (state.audioCtx) state.audioCtx.close();
  if (state.stream) state.stream.getTracks().forEach((t) => t.stop());

  Object.assign(state, {
    audioCtx: null,
    stream: null,
    analyzer: null,
    detector: null,
    pitchWindow: [],
    pitchHistory: [],
    sustainStart: null
  });

  elements.startBtn.disabled = false;
  elements.stopBtn.disabled = true;
}

elements.startBtn.addEventListener('click', () => start().catch((err) => alert(err.message)));
elements.stopBtn.addEventListener('click', stop);
