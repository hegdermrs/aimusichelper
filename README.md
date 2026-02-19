# Aimusichelper

A browser-based vocal practice prototype for students.

## What it does now

- Real-time pitch detection (Hz + note name)
- Pitch trace line on canvas
- Stability/wobble meter (short-window pitch standard deviation)
- Volume consistency meter (RMS)
- Airflow proxy (breathy vs cleaner) from spectral features
- Sustain timer triggered by stable, audible pitch

## Why no real-time AI?

AI voice/video critique introduces latency. This prototype keeps feedback local and immediate with Web Audio + feature extraction. AI is reserved for post-session coaching.

## Planned post-processing pipeline

1. Record synced audio + video
2. Upload media + extracted timeline features
3. Run AI analysis for:
   - Technique notes
   - Targeted exercises/homework
   - Progress tracking against a knowledge base

## Tech stack

- Web Audio API
- JavaScript
- Meyda
- pitchfinder
- Canvas

## How to run this

### 1) Prerequisites

- Python 3 installed (`python3 --version`)
- A modern browser (Chrome/Edge recommended)
- A working microphone

### 2) Start a local server

From the project root:

```bash
python3 -m http.server 4173
```

### 3) Open the app

Open:

```text
http://localhost:4173
```

Then click **Start Microphone** and allow microphone access when prompted.

### 4) Stop the app

- In browser: click **Stop**
- In terminal: press `Ctrl + C` to stop the server

## Troubleshooting

- **No microphone prompt:** check browser site permissions and allow microphone for `localhost`.
- **Meters not moving:** verify the selected input device in your OS/browser sound settings.
- **Page loads but audio fails:** keep the tab focused and retry **Start Microphone** (some browsers block audio contexts until user interaction).
