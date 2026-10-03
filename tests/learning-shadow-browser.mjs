// Dedicated local test browser. Never request access to a real camera.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const bin = process.env.AGENT_BROWSER_BIN || 'agent-browser';
const url = process.env.BABYPLAY_TEST_URL || 'http://localhost:5173';
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(url)) throw new Error('Use a local test server.');
const run = (...args) => {
  const output = execFileSync(bin, ['--session', 'babyplay-feature-tests', '--json', ...args], { encoding: 'utf8', timeout: 30000, maxBuffer: 4 * 1024 * 1024 });
  const result = JSON.parse(output.trim().split('\n').filter(line => line.startsWith('{')).at(-1));
  assert.equal(result.success, true, result.error || output);
  return result.data;
};
const evaluate = code => run('eval', code).result;
const click = selector => run('click', selector);
const wait = ms => run('wait', String(ms));
const scene = name => run('webmcp', 'invoke', 'switch_playground_scene', '--params', JSON.stringify({ scene: name }));
const char = () => evaluate('document.querySelector(".learning-balloon")?.dataset.character');
const scale = () => Number(evaluate('document.querySelector(".shadow-animal-wrap").dataset.scale'));
const pass = label => console.log(`PASS ${label}`);
const waitFor = (code, label) => {
  for (let i = 0; i < 25; i++) { if (evaluate(code)) return; wait(300); }
  throw new Error(`Timed out: ${label}. ${evaluate('document.querySelector(".shadow-game")?.innerText')}`);
};
run('open', url);
run('set', 'viewport', '1440', '900');
scene('learning');
const first = char();
click('.learning-balloon'); assert.equal(char(), first);
const wrong = evaluate('[...document.querySelectorAll(".character-keys button")].find(b=>b.dataset.character!==document.querySelector(".learning-balloon").dataset.character).dataset.character');
run('press', wrong); assert.equal(char(), first);
assert.equal(evaluate('!!document.querySelector(".learning-celebration")'), false);
run('press', first); assert.equal(evaluate('!!document.querySelector(".learning-celebration")'), true);
wait(2100); assert.notEqual(char(), first);
pass('Wrong keys and balloon taps cannot pop; the matching number key succeeds and replenishes');

click('.lesson-switch button:nth-child(2)');
const letter = char(); run('press', letter.toLowerCase());
assert.ok(evaluate('!!document.querySelector(".learning-celebration")'));
click('.lesson-switch button:nth-child(3)');
const hanzi = char();
const position = evaluate('[...document.querySelectorAll(".character-keys button")].findIndex(b=>b.dataset.character===document.querySelector(".learning-balloon").dataset.character)+1');
run('press', String(position)); assert.ok(evaluate('!!document.querySelector(".learning-celebration")'));
click('.parent-button'); wait(2200); assert.ok(evaluate('!!document.querySelector(".learning-celebration")'));
click('[aria-label="关闭家长设置"]'); wait(2100); assert.notEqual(char(), hanzi);
pass('Lowercase letter keys, numbered Hanzi keys and paused replenishment');

click('[aria-label="全屏并开启儿童锁"]'); click('.lock-dialog .continue-button');
const lockedChar = char();
const lockedIndex = evaluate('[...document.querySelectorAll(".character-keys button")].findIndex(b=>b.dataset.character===document.querySelector(".learning-balloon").dataset.character)+1');
run('press', String(lockedIndex % 3 + 1)); assert.equal(char(), lockedChar);
run('press', String(lockedIndex)); assert.ok(evaluate('!!document.querySelector(".learning-celebration")'));
run('press', 'Control+Alt+Shift+u');
const values = evaluate('document.querySelector(".parent-equation span").textContent').match(/\d+/g).map(Number);
run('fill', '[aria-label="算式答案"]', String(values[0] + values[1])); click('button[type="submit"]');
pass('Child lock preserves the pressed character and cannot turn wrong keys into successes');

scene('shadow');
click('.demo-toggle');
evaluate('document.querySelector("input[aria-label=体验影子大小]").value="0.5";document.querySelector("input[aria-label=体验影子大小]").dispatchEvent(new Event("input",{bubbles:true}));document.querySelector("input[aria-label=体验影子大小]").dispatchEvent(new Event("change",{bubbles:true}))');
// Use keyboard for the range so React receives trusted input.
run('focus', 'input[aria-label="体验影子大小"]'); run('press', 'End');
assert.equal(scale(), 1.7);
run('press', 'Home'); assert.equal(scale(), .45);
for (const animal of ['rabbit', 'cat', 'dog', 'bear', 'elephant', 'duck']) {
  click(`.shadow-animal-picker button:nth-child(${['rabbit','cat','dog','bear','elephant','duck'].indexOf(animal)+1})`);
  assert.equal(evaluate('document.querySelector(".shadow-animal-wrap").dataset.animal'), animal);
}
pass('Six animal silhouettes and optional manual size experience');

click('.demo-toggle');
evaluate('navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException("Denied for test", "NotAllowedError")}');
click('.camera-button'); waitFor('!!document.querySelector(".camera-error")', 'permission error');
assert.match(evaluate('document.querySelector(".camera-error").textContent'), /未获允许/);
assert.equal(evaluate('document.querySelector("video").srcObject'), null);
pass('Camera permission denial is recoverable');

const bytes = process.env.BABYPLAY_FACE_FIXTURE ? readFileSync(process.env.BABYPLAY_FACE_FIXTURE) : Buffer.from(await (await fetch('https://storage.googleapis.com/mediapipe-assets/portrait.jpg')).arrayBuffer());
const cameraSetup = `async()=>{
  const image=new Image(); image.src='data:image/jpeg;base64,${bytes.toString('base64')}'; await image.decode();
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;const ctx=canvas.getContext('2d');
  window.testFaceWidth=380;
  window.testDrawFace=(width)=>{window.testFaceWidth=width;ctx.fillStyle='#ddd';ctx.fillRect(0,0,640,480);if(width>0)ctx.drawImage(image,(640-width)/2,0,width,width*image.height/image.width)};
  window.testDrawFace(380);
  navigator.mediaDevices.getUserMedia=async()=>{window.testCameraStream=canvas.captureStream(10);window.testCameraCanvas=canvas;window.testCameraTimer??=setInterval(()=>window.testDrawFace(window.testFaceWidth),80);return window.testCameraStream};
  return true;
}`;
assert.equal(evaluate(`(${cameraSetup})()`), true);
click('.camera-button');
waitFor('document.querySelector(".camera-button").textContent.includes("关闭摄像头")', 'local WASM/model initialization');
waitFor('!document.querySelector(".calibrate-button").disabled', 'real face detection');
click('.calibrate-button'); wait(900); const medium = scale();
evaluate('window.testDrawFace(300)'); waitFor(`Number(document.querySelector(".shadow-animal-wrap").dataset.scale)<${medium - .05}`, 'far face shrinks the shadow'); const far = scale();
evaluate('window.testDrawFace(560)'); waitFor(`Number(document.querySelector(".shadow-animal-wrap").dataset.scale)>${medium + .15}`, 'near face enlarges the shadow'); const near = scale();
assert.ok(far < medium - .05, `Far shadow ${far} should be smaller than medium ${medium}`);
assert.ok(near > medium + .15, `Near shadow ${near} should be larger than medium ${medium}`);
assert.ok(evaluate('performance.getEntriesByType("resource").filter(r=>/vision|tflite|wasm/.test(r.name)).every(r=>r.name.startsWith(location.origin))'));
evaluate('window.testDrawFace(0)'); waitFor('document.querySelector(".calibrate-button").disabled', 'lost face');
assert.equal(evaluate('document.querySelector(".calibrate-button").disabled'), true);
click('.parent-button');
assert.equal(evaluate('window.testCameraStream.getTracks().every(t=>t.readyState==="ended")'), true);
click('[aria-label="关闭家长设置"]');
pass(`Real local detector: far ${far}, medium ${medium}, near ${near}; lost face and parent pause`);

click('.camera-button'); waitFor('document.querySelector(".camera-button").textContent.includes("关闭摄像头")', 'camera restart');
scene('learning'); assert.equal(evaluate('window.testCameraStream.getTracks().every(t=>t.readyState==="ended")'), true);
scene('shadow');
evaluate('navigator.mediaDevices.getUserMedia=()=>new Promise(resolve=>window.resolveTestCamera=()=>{window.lateCameraStream=window.testCameraCanvas.captureStream(10);resolve(window.lateCameraStream)})');
click('.camera-button'); scene('learning');
evaluate('window.resolveTestCamera()'); wait(200);
assert.equal(evaluate('window.lateCameraStream.getTracks().every(t=>t.readyState==="ended")'), true);
pass('Camera stops on navigation, including a late permission response');

run('set', 'viewport', '390', '844');
assert.equal(evaluate('document.documentElement.scrollWidth>innerWidth'), false);
assert.ok(evaluate('[...document.querySelectorAll(".character-keys button")].every(b=>{const r=b.getBoundingClientRect();const s=document.querySelector(".game-stage").getBoundingClientRect();return r.x>=s.x&&r.right<=s.right&&r.y>=s.y&&r.bottom<=s.bottom})'));
scene('shadow');
assert.equal(evaluate('document.documentElement.scrollWidth>innerWidth'), false);
assert.equal(run('errors').errors?.length || 0, 0);
pass('Mobile layout fits and no browser runtime errors');
run('close');
