/** The pinned SelfieSegmenter exposes one confidence channel for the person. */
export function paintPersonMask(confidences: Float32Array, rgba: Uint8ClampedArray) {
  let foreground = 0;
  for (let i = 0; i < confidences.length; i++) {
    const offset = i * 4;
    const confidence = confidences[i];
    rgba[offset] = 52;
    rgba[offset + 1] = 46;
    rgba[offset + 2] = 63;
    // A short feathered edge avoids jagged hands and hair without retaining
    // previous-frame silhouettes that could leave motion trails.
    rgba[offset + 3] = Math.max(0, Math.min(1, (confidence - .35) / .3)) * 255;
    if (confidence > .5) foreground++;
  }
  return foreground / Math.max(1, confidences.length);
}
