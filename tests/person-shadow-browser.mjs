// Real local segmentation model, driven by a simulated camera, never real hardware.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const bin = process.env.AGENT_BROWSER_BIN || 'agent-browser';
const url = process.env.BABYPLAY_TEST_URL || 'http://localhost:5173';
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(url)) throw new Error('Use a local test server.');
const run = (...args) => {
  const output = execFileSync(bin, ['--session', 'babyplay-person-tests', '--json', ...args], { encoding: 'utf8', timeout: 30000, maxBuffer: 4 * 1024 * 1024 });
  const result = JSON.parse(output.trim().split('\n').filter(line => line.startsWith('{')).at(-1));
  assert.equal(result.success, true, result.error || output);
  return result.data;
};
const evaluate = code => run('eval', code).result;
const click = selector => run('click', selector);
const scene = name => run('webmcp', 'invoke', 'switch_playground_scene', '--params', JSON.stringify({ scene: name }));
const waitFor = (code, label) => {
  for (let i = 0; i < 35; i++) { if (evaluate(code)) return; run('wait', '250'); }
  throw new Error(`Timed out: ${label}. ${evaluate('document.querySelector(".shadow-game")?.innerText')}`);
};
const pass = label => console.log(`PASS ${label}`);
const person = '.shadow-mode-switch button:nth-child(2)';
const animal = '.shadow-mode-switch button:first-child';
const metrics = `(()=>{const c=document.querySelector('.person-shadow-canvas');const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0,x=0,y=0;for(let i=0;i<p.length;i+=4){if(p[i+3]){n++;x+=(i/4)%c.width;y+=Math.floor(i/4/c.width)}}return {ratio:n/(c.width*c.height),x:n?x/n/c.width:0,y:n?y/n/c.height:0}})()`;
const bytes = process.env.BABYPLAY_PERSON_FIXTURE ? readFileSync(process.env.BABYPLAY_PERSON_FIXTURE) : Buffer.from(await (await fetch('https://storage.googleapis.com/mediapipe-assets/pose.jpg')).arrayBuffer());
run('open', url); run('set', 'viewport', '1440', '900');
scene('shadow'); click(person);
assert.equal(evaluate('document.querySelector("video").srcObject'), null);
assert.equal(evaluate('!!document.querySelector(".shadow-animal-wrap")'), false);
assert.equal(evaluate('!!document.querySelector(".calibrate-button")'), false);
assert.equal(evaluate('!!document.querySelector(".person-shadow-placeholder")'), true);
pass('Person mode is separate from animal shapes and does not open the camera automatically');

evaluate('navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException("Test denial", "NotAllowedError")}');
click('.camera-button'); waitFor('!!document.querySelector(".camera-error")', 'permission denial');
assert.equal(evaluate(metrics).ratio, 0);
pass('Denied permission leaves an empty silhouette and a retry button');

const setup = `(async()=>{
  const image=new Image();image.src='data:image/jpeg;base64,${bytes.toString('base64')}';await image.decode();
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;const ctx=canvas.getContext('2d');
  window.personTestWidth=480;window.personTestLeft=80;window.personTestCalls=0;
  window.drawPersonTest=(width,left=window.personTestLeft)=>{window.personTestWidth=width;window.personTestLeft=left;ctx.fillStyle='#ddd';ctx.fillRect(0,0,640,480);if(width>0){const h=width*image.height/image.width;ctx.drawImage(image,left,(480-h)/2,width,h)}};
  navigator.mediaDevices.getUserMedia=async()=>{window.personTestCalls++;window.personTestStream=canvas.captureStream(20);window.personTestTimer??=setInterval(()=>window.drawPersonTest(window.personTestWidth),50);return window.personTestStream};
  return true;
})()`;
assert.equal(evaluate(setup), true);
click('.camera-button');
waitFor('Number(document.querySelector(".person-shadow-canvas").dataset.foreground)>.005', 'real person segmentation');
const first = evaluate(metrics);
assert.ok(first.ratio > .005 && first.ratio < .5, `Expected a person, not the whole background: ${first.ratio}`);
assert.match(evaluate('getComputedStyle(document.querySelector(".person-shadow-canvas")).transform'), /^matrix\(-1,/);
assert.equal(evaluate('document.querySelector(".person-shadow-placeholder")'), null);
run('screenshot', '/tmp/babyplay-person-detected.png');
pass(`Local model extracts a mirrored human contour and removes the background (area ${first.ratio.toFixed(3)})`);

// Positions and size come directly from pixel segmentation, without a fixed silhouette.
evaluate('window.drawPersonTest(480,140)');
waitFor(`(${metrics}).x>${first.x + .04}`, 'contour follows horizontal body movement');
const moved = evaluate(metrics);
evaluate('window.drawPersonTest(300,170)');
waitFor(`(${metrics}).ratio<${first.ratio * .7}&&(${metrics}).ratio>.002`, 'far person becomes smaller');
const far = evaluate(metrics);
evaluate('window.drawPersonTest(540,50)');
waitFor(`(${metrics}).ratio>${far.ratio * 1.6}`, 'near person becomes larger');
const near = evaluate(metrics);
assert.ok(moved.x > first.x + .04 && near.ratio > far.ratio * 1.6);
pass(`Contours follow movement and camera size: far ${far.ratio.toFixed(3)}, near ${near.ratio.toFixed(3)}`);

assert.equal(evaluate('performance.getEntriesByType("resource").filter(r=>/wasm|tflite/.test(r.name)).every(r=>r.name.startsWith(location.origin))'), true);
click(animal); waitFor('document.querySelector(".camera-button").textContent.includes("关闭摄像头")', 'switch to animal model');
assert.equal(evaluate('window.personTestCalls'), 1);
assert.equal(evaluate('window.personTestStream.getTracks()[0].readyState'), 'live');
assert.equal(evaluate('!!document.querySelector(".shadow-animal-wrap")'), true);
click(person); waitFor('Number(document.querySelector(".person-shadow-canvas").dataset.foreground)>.005', 'switch back to person model');
assert.equal(evaluate('window.personTestCalls'), 1);
pass('Model switches preserve one live camera stream and keep both modes usable');

evaluate('window.drawPersonTest(0)');
waitFor('document.querySelector(".person-shadow-canvas").dataset.foreground==="0"', 'empty background clears the person');
assert.equal(evaluate(metrics).ratio, 0);
assert.ok(evaluate('!!document.querySelector(".person-shadow-placeholder")'));
evaluate('window.drawPersonTest(480,80)');
waitFor('Number(document.querySelector(".person-shadow-canvas").dataset.foreground)>.005', 'person returns');
click('.parent-button');
assert.equal(evaluate('window.personTestStream.getTracks().every(t=>t.readyState==="ended")'), true);
assert.equal(evaluate(metrics).ratio, 0);
click('[aria-label="关闭家长设置"]');
assert.match(evaluate('document.querySelector(".camera-button").textContent'), /开启摄像头/);
pass('Lost person clears stale pixels; parent pause releases the camera and silhouette');

click('.camera-button'); waitFor('Number(document.querySelector(".person-shadow-canvas").dataset.foreground)>.005', 'restart person camera');
scene('learning'); assert.equal(evaluate('window.personTestStream.getTracks().every(t=>t.readyState==="ended")'), true);
scene('shadow'); click(person); click('.camera-button'); click('.camera-button');
run('wait', '1200');
assert.match(evaluate('document.querySelector(".camera-button").textContent'), /开启摄像头/);
assert.equal(evaluate('window.personTestStream.getTracks().every(t=>t.readyState==="ended")'), true);
assert.equal(evaluate(metrics).ratio, 0);
pass('Navigation and cancelling startup cannot leave a camera or late silhouette active');

for (const [width,height] of [[1024,600],[390,844]]) {
  run('set','viewport',String(width),String(height));
  assert.equal(evaluate('document.documentElement.scrollWidth>innerWidth'),false);
  const contained=evaluate('[...document.querySelectorAll(".shadow-mode-switch button")].every(b=>{const r=b.getBoundingClientRect(),s=document.querySelector(".game-stage").getBoundingClientRect();return r.left>=s.left&&r.right<=s.right&&r.top>=s.top&&r.bottom<=s.bottom})');
  assert.ok(contained);
  run('screenshot',`/tmp/babyplay-person-${width}.png`);
}
assert.equal(run('errors').errors?.length || 0,0);
evaluate('clearInterval(window.personTestTimer)');
pass('Desktop and mobile mode controls fit with no runtime errors');
run('close');
