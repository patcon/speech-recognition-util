# speech-recognition-util

> ⚠️ **Vibe-coded experiment.** This library was built through iterative AI-assisted exploration and may not be actively maintained. APIs may change without notice. Use at your own risk.

Utilities for estimating per-word timestamps from the [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API). Useful for generating VTT transcripts or syncing text to audio.

## How it works

The Web Speech API fires interim results as you speak and final results when a phrase is complete. This library tracks when each word first appeared in an interim result, using that arrival time as its timestamp estimate. Words that never appeared in an interim are extrapolated at 150ms intervals from the last known anchor.

All estimates are **raw** (no backdate correction applied). To compensate for API latency, apply a backdate yourself:

```js
const adjustedOffsetMs = Math.max(0, word.offsetMs - backdateMs);
```

Typical values for `backdateMs`: 400–2000ms depending on device and browser.

## Install

```sh
pnpm add github:patcon/speech-recognition-util
```

## Usage

### Pure function

Process one finalized speech recognition result at a time. No browser globals required — safe to unit test in Node.

```js
import { estimateWordTimestamps } from 'speech-recognition-util';

// interimSnapshots: array of { words: string[], arrivalMs: number }
//   collected from interim results for this resultIndex
// finalWords: transcript.split(/\s+/).filter(Boolean)
// recStartMs: Date.now() at recording start

const words = estimateWordTimestamps(interimSnapshots, finalWords, recStartMs);

// [
//   { word: 'hello', offsetMs: 820,  source: 'interim'  },
//   { word: 'world', offsetMs: 1340, source: 'interim'  },
//   { word: 'foo',   offsetMs: 1490, source: 'fallback' },
// ]
```

`source` values:
- `'interim'` — timestamp anchored to when the word first appeared in an interim result
- `'fallback'` — no interim anchor; extrapolated at 150ms per word from the last known anchor

Options:

```js
estimateWordTimestamps(snapshots, finalWords, recStartMs, {
  fallbackIntervalMs: 150, // ms between fallback-estimated words
  arrivalMs: Date.now(),   // final result arrival time, used as fallback anchor when snapshots is empty
});
```

### Async generator stream

Manages the `SpeechRecognition` lifecycle and yields `WordTimestamp` objects as each phrase finalizes. Handles Android's cumulative-finals quirk automatically.

```js
import { createSpeechWordStream } from 'speech-recognition-util';

const { stream, stop, recStartMs } = createSpeechWordStream({ lang: 'en-US' });

for await (const word of stream) {
  console.log(word.word, word.offsetMs, word.source);
}

// call stop() to end the session
stop();
```

### React hook

```js
import { useSpeechTimestamps } from 'speech-recognition-util';

function Transcriber() {
  const { words, isRecording, recStartMs, start, stop } = useSpeechTimestamps();
  const backdateMs = 600;

  return (
    <>
      <button onClick={start} disabled={isRecording}>record</button>
      <button onClick={stop} disabled={!isRecording}>stop</button>
      <ul>
        {words.map((w, i) => (
          <li key={i}>
            {w.word} @ {((Math.max(0, w.offsetMs - backdateMs)) / 1000).toFixed(2)}s
          </li>
        ))}
      </ul>
    </>
  );
}
```

## Running the example

```sh
pnpm install
pnpm example
```

Then open `http://localhost:8080/example/` in a browser that supports the Web Speech API (Chrome/Edge on desktop, Chrome on Android).

## Running tests

```sh
pnpm test
```

Tests cover the pure function only. The stream and hook require a browser environment.

## Browser support

The Web Speech API is available in Chromium-based browsers. Firefox and Safari have partial or no support.
