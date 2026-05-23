import { estimateWordTimestamps } from './estimateWordTimestamps.js';

/**
 * @typedef {{ lang?: string, androidCumulative?: boolean, fallbackIntervalMs?: number }} SpeechStreamOptions
 * @typedef {import('./estimateWordTimestamps.js').WordTimestamp} WordTimestamp
 */

/**
 * Wraps the Web Speech API in an async generator that yields WordTimestamp objects
 * as each final result arrives. Uses a queue to bridge the push-based API into
 * a pull-based async iterable.
 *
 * @param {SpeechStreamOptions} [options]
 * @returns {{ stream: AsyncGenerator<WordTimestamp>, stop: () => void, recStartMs: () => number|null }}
 */
export function createSpeechWordStream(options = {}) {
  const { lang = 'en-US', fallbackIntervalMs = 150 } = options;
  const isAndroid = options.androidCumulative ?? /android/i.test(navigator.userAgent);

  const queue = /** @type {WordTimestamp[]} */ ([]);
  let resolveWaiting = /** @type {(() => void)|null} */ (null);
  let done = false;
  let _recStartMs = /** @type {number|null} */ (null);
  let stopped = false;

  const interimHistory = /** @type {{ [ri: number]: import('./estimateWordTimestamps.js').InterimSnapshot[] }} */ ({});
  let androidCumulativeWords = /** @type {string[]} */ ([]);

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SR();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = lang;

  function flush() {
    if (resolveWaiting) { resolveWaiting(); resolveWaiting = null; }
  }

  recognition.onstart = () => {
    _recStartMs = Date.now();
  };

  recognition.onresult = (event) => {
    const arrivalMs = Date.now();
    const ri = event.resultIndex;
    const result = event.results[ri];
    const transcript = result[0].transcript.trim();
    const words = transcript.split(/\s+/).filter(Boolean);

    if (!result.isFinal) {
      if (!interimHistory[ri]) interimHistory[ri] = [];
      interimHistory[ri].push({ words: [...words], arrivalMs });
      return;
    }

    const recStart = _recStartMs ?? arrivalMs;

    if (isAndroid) {
      // Android sends cumulative finals containing all words spoken so far.
      const newWords = words.slice(androidCumulativeWords.length);
      androidCumulativeWords = words;
      if (!newWords.length) return;
      const timestamps = estimateWordTimestamps([], newWords, recStart, { arrivalMs, fallbackIntervalMs });
      queue.push(...timestamps);
    } else {
      const timestamps = estimateWordTimestamps(
        interimHistory[ri] || [],
        words,
        recStart,
        { arrivalMs, fallbackIntervalMs }
      );
      delete interimHistory[ri];
      queue.push(...timestamps);
    }

    flush();
  };

  recognition.onend = () => {
    if (isAndroid && !stopped) {
      try { recognition.start(); } catch (_) {}
      return;
    }
    done = true;
    flush();
  };

  recognition.onerror = () => {
    done = true;
    flush();
  };

  recognition.start();

  async function* gen() {
    while (!done || queue.length > 0) {
      if (queue.length === 0) {
        await new Promise(r => { resolveWaiting = r; });
      }
      while (queue.length > 0) yield queue.shift();
    }
  }

  return {
    stream: gen(),
    stop() {
      stopped = true;
      try { recognition.stop(); } catch (_) {}
    },
    recStartMs: () => _recStartMs,
  };
}
