import { useState, useRef } from 'react';
import { createSpeechWordStream } from './createSpeechWordStream.js';

/**
 * @typedef {import('./createSpeechWordStream.js').SpeechStreamOptions} SpeechStreamOptions
 * @typedef {import('./estimateWordTimestamps.js').WordTimestamp} WordTimestamp
 */

/**
 * React hook that manages a SpeechRecognition session and accumulates per-word
 * timestamp estimates into state as finals arrive.
 *
 * recStartMs is exposed so consumers can apply backdate correction:
 *   Math.max(0, word.offsetMs - backdateMs)
 *
 * @param {SpeechStreamOptions} [options]
 * @returns {{ words: WordTimestamp[], isRecording: boolean, recStartMs: number|null, start: () => void, stop: () => void }}
 */
export function useSpeechTimestamps(options = {}) {
  const [words, setWords] = useState(/** @type {WordTimestamp[]} */ ([]));
  const [isRecording, setIsRecording] = useState(false);
  const [recStartMs, setRecStartMs] = useState(/** @type {number|null} */ (null));
  const streamRef = useRef(/** @type {{ stop: () => void, recStartMs: () => number|null }|null} */ (null));

  function start() {
    setWords([]);
    setIsRecording(true);
    setRecStartMs(null);

    const { stream, stop, recStartMs: getStart } = createSpeechWordStream(options);
    streamRef.current = { stop, recStartMs: getStart };

    (async () => {
      for await (const word of stream) {
        setWords(prev => [...prev, word]);
      }
      setIsRecording(false);
      setRecStartMs(streamRef.current?.recStartMs() ?? null);
    })();
  }

  function stop() {
    streamRef.current?.stop();
  }

  return { words, isRecording, recStartMs, start, stop };
}
