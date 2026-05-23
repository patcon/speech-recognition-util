/**
 * @typedef {{ words: string[], arrivalMs: number }} InterimSnapshot
 * @typedef {{ word: string, offsetMs: number, source: 'interim'|'fallback' }} WordTimestamp
 */

/**
 * Derives per-word timestamp estimates for one finalized speech recognition result.
 *
 * Returns raw estimates with no backdate applied. To apply a backdate correction:
 *   Math.max(0, word.offsetMs - backdateMs)
 *
 * @param {InterimSnapshot[]} snapshots - interimHistory[resultIndex] captured during recognition
 * @param {string[]} finalWords - tokenized words from the final result transcript
 * @param {number} recStartMs - Date.now() at recording start (baseline for offsetMs)
 * @param {{ fallbackIntervalMs?: number, arrivalMs?: number }} [options]
 *   fallbackIntervalMs: ms added per word when no interim anchor exists (default 150)
 *   arrivalMs: final result event arrival time, used as fallback anchor when snapshots is empty
 * @returns {WordTimestamp[]}
 */
export function estimateWordTimestamps(snapshots, finalWords, recStartMs, options = {}) {
  const { fallbackIntervalMs = 150, arrivalMs } = options;

  // Walk snapshots forward; each time new words appear, record their anchor time.
  // Mirrors the original deriveWordTimestamps() logic exactly.
  const derived = [];
  let covered = 0;
  for (const snap of snapshots) {
    if (snap.words.length > covered) {
      for (let j = covered; j < snap.words.length; j++) {
        derived.push({ estMs: snap.arrivalMs });
      }
      covered = snap.words.length;
    }
  }

  // Anchor for words that fall beyond the last interim entry.
  // Prefer the last derived entry, then the provided arrivalMs, then recStartMs.
  const fallbackAnchor = derived.length > 0
    ? derived[derived.length - 1].estMs
    : (arrivalMs ?? recStartMs);

  return finalWords.map((word, idx) => {
    let rawEstMs, source;
    if (idx < derived.length) {
      rawEstMs = derived[idx].estMs;
      source = 'interim';
    } else {
      rawEstMs = fallbackAnchor + (idx - derived.length + 1) * fallbackIntervalMs;
      source = 'fallback';
    }
    return { word, offsetMs: Math.max(0, rawEstMs - recStartMs), source };
  });
}
