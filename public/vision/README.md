# Local face detection and person segmentation assets

Only the animal-shadow camera feature loads these files. Video frames are
processed in the browser, never recorded, stored, or sent over the network.

- MediaPipe Tasks Vision WASM runtime: `@mediapipe/tasks-vision@0.10.32`.
- BlazeFace short-range float16 model, version 1:
  https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite
- SelfieSegmenter square float16 model, version 1:
  https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite
- Upstream: https://github.com/google-ai-edge/mediapipe
- Documentation: https://ai.google.dev/edge/mediapipe/solutions/vision/face_detector/web_js
- License: Apache 2.0, included in `LICENSE`.

Face width relative to the video frame estimates proximity; it is not a depth
sensor. The largest detected face controls the animal. Face angle, lighting,
camera framing and multiple people can affect the estimate. The calibration
button sets the current face size as the medium reference. On lost detection the
shadow holds its last size and prompts the child to face the camera.

Person mode uses the segmentation model to extract each frame's actual human
silhouette. The pinned model exposes one confidence channel labeled `selfie` for
the person: low confidence is transparent and high confidence is dark, with a
short feathered edge. Its category-mask encoding is foreground 0 / background
255, so the renderer deliberately uses the verified float confidence channel.
It renders a mirrored mask at the original camera aspect ratio, preserving body
position, shape and apparent size. It does not use a face box, pose skeleton,
fixed person graphic, or scale normalization. The 320-pixel-wide inference input
and a maximum of 15 inferences per second bound the processing work. Confidence
masks are consumed inside the synchronous callback and are not retained.

Changing modes disposes of the previous model while retaining the camera stream.
Closing, hiding or pausing the scene releases the stream and clears the person
canvas. Empty scenes clear the last contour. Occlusion, lighting, background,
distance, and limbs outside the frame can affect contour quality. The model may
include multiple people, so let the child occupy the camera frame clearly.

To update the runtime, pin the dependency and copy all its `wasm/` files here.
Keep the JavaScript package and WASM runtime versions identical.
