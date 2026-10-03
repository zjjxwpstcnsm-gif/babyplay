export type FaceBox = { originX: number; originY: number; width: number; height: number };
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
export function shadowFromFace(box: FaceBox, videoWidth: number, baseline: number) {
  const ratio = box.width / Math.max(1, videoWidth);
  return {
    scale: clamp(ratio / Math.max(.04, baseline), .45, 1.7),
    // A mirrored camera feels natural: moving right moves the animal right.
    x: clamp((.5 - (box.originX + box.width / 2) / Math.max(1, videoWidth)) * 40, -18, 18),
    ratio,
  };
}
