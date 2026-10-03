# Local face detection assets

Only the animal-shadow camera feature loads these files. Video frames are
processed in the browser, never recorded, stored, or sent over the network.

- MediaPipe Tasks Vision WASM runtime: `@mediapipe/tasks-vision@0.10.32`.
- BlazeFace short-range float16 model, version 1:
  https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite
- Upstream: https://github.com/google-ai-edge/mediapipe
- Documentation: https://ai.google.dev/edge/mediapipe/solutions/vision/face_detector/web_js
- License: Apache 2.0, included in `LICENSE`.

Face width relative to the video frame estimates proximity; it is not a depth
sensor. The largest detected face controls the animal. Face angle, lighting,
camera framing and multiple people can affect the estimate. The calibration
button sets the current face size as the medium reference. On lost detection the
shadow holds its last size and prompts the child to face the camera.

To update the runtime, pin the dependency and copy all its `wasm/` files here.
Keep the JavaScript package and WASM runtime versions identical.
