// Run against a dedicated local test browser; no production URL or user profile.
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const bin = process.env.AGENT_BROWSER_BIN || 'agent-browser';
const url = process.env.BABYPLAY_TEST_URL || 'http://localhost:5173';
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(url)) throw new Error('Use a local test server.');
const run = (...args) => {
  const output = execFileSync(bin, ['--json', ...args], { encoding: 'utf8', timeout: 20000 });
  const result = JSON.parse(output.trim().split('\n').filter(line => line.startsWith('{')).at(-1));
  assert.equal(result.success, true, result.error || output);
  return result.data;
};
const evaluate = code => run('eval', code).result;
const state = () => run('webmcp', 'invoke', 'get_playground_state', '--params', '{}').output;
const scene = name => run('webmcp', 'invoke', 'switch_playground_scene', '--params', JSON.stringify({ scene: name }));
const click = selector => run('click', selector);
const pass = label => console.log(`PASS ${label}`);
const center = selector => evaluate(`(() => {const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
const tap = ({ x, y }) => { run('mouse', 'move', String(Math.round(x)), String(Math.round(y))); run('mouse', 'down'); run('mouse', 'up'); };
const solve = () => { const values = evaluate('document.querySelector(".parent-equation span").textContent').match(/\d+/g).map(Number); run('fill', '[aria-label="算式答案"]', String(values[0] + values[1])); click('button[type="submit"]'); };

run('open', url);
run('set', 'viewport', '1440', '900');
scene('bubbles');
const initial = state().pops;
tap(center('.bubble-target'));
run('wait', '700');
assert.ok(state().pops > initial, 'Pointer press must pop a bubble.');
pass('Pointer input and delayed bubble chain');

const beforeSweep = state().pops;
const points = evaluate('[...document.querySelectorAll(".bubble-target")].slice(0,7).map(b=>{const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.width/2}})');
run('mouse','move',String(Math.round(points[0].x)),String(Math.round(points[0].y))); run('mouse','down');
for (const p of points.slice(1)) run('mouse','move',String(Math.round(p.x)),String(Math.round(p.y)));
run('mouse','up'); run('wait','700');
assert.ok(state().pops >= beforeSweep + 2);
pass('One held pointer sweeps several bubbles');

click('.parent-button'); const pausedPops = state().pops;
run('wait','700'); assert.equal(state().pops, pausedPops); assert.equal(state().paused,true);
click('[aria-label="关闭家长设置"]');
pass('Parent dialog pauses pending gameplay');

scene('balloons'); click('.play-style-switch button:nth-child(2)');
assert.equal(evaluate('document.querySelectorAll(".piano-dock button").length'),7);
click('[aria-label="弹奏Mi"]');
assert.equal(evaluate('document.querySelector(".piano-dock .ringing")?.getAttribute("aria-label")'),'弹奏Mi');
assert.ok(evaluate('[...document.querySelectorAll(".balloon-target")].every(b=>b.dataset.kind==="music")'));
click('.play-style-switch button:nth-child(3)');
run('wait','700'); // Wait for the deliberate scene crossfade.
assert.match(evaluate('getComputedStyle(document.querySelector(".scene-background")).backgroundImage'),/starlight/);
assert.equal(evaluate('document.querySelector(".piano-dock")'),null);
pass('Music keys, music balloons, and dream world');

scene('animals');
assert.equal(evaluate('document.querySelectorAll(".animal-character img").length'),8);
click('.pet-activities button:nth-child(2)'); click('[aria-label="点小兔听声音"]');
assert.match(evaluate('document.querySelector(".animal-speech").textContent'),/点心/);
click('.pet-activities button:nth-child(3)'); click('[aria-label="点小兔听声音"]');
assert.equal(evaluate('document.querySelectorAll(".pet-sleeping").length'),1);
click('[aria-label="点小兔听声音"]'); assert.equal(evaluate('document.querySelectorAll(".pet-sleeping").length'),0);
pass('Feed, sleep and wake animals');

scene('peppa');
assert.equal(evaluate('document.querySelectorAll(".mud-jumper img").length'),2);
click('.mud-controls button:first-child'); run('wait','850');
assert.ok(state().collected.includes('george')); assert.ok(state().collected.includes('dinosaur'));
assert.match(evaluate('document.querySelector(".mud-message").textContent'),/乔治|小恐龙|派对/);
click('.mud-controls button:last-child');
assert.equal(evaluate('document.querySelector(".mud-controls button:last-child").getAttribute("aria-pressed")'),'true');
click('.parent-button'); run('wait','1000'); assert.equal(state().paused,true);
assert.equal(evaluate('document.querySelector(".mud-controls button:last-child").getAttribute("aria-pressed")'),'true');
click('[aria-label="关闭家长设置"]');
click('.mud-controls button:last-child');
assert.equal(evaluate('document.querySelector(".mud-controls button:last-child").getAttribute("aria-pressed")'),'false');
scene('house'); assert.ok(evaluate('!!document.querySelector("img[alt=乔治]")'));
scene('animals');
pass('Muddy puddle jumps, rain, pause and George collection');

click('[aria-label="全屏并开启儿童锁"]');
assert.ok(evaluate('!!document.querySelector(".system-gesture-guide")'));
click('.lock-dialog .continue-button');
assert.equal(state().childLocked,true); assert.equal(evaluate('!!document.fullscreenElement'),true);
assert.equal(evaluate('document.querySelector(".parent-button")'),null);
const origin = evaluate('performance.timeOrigin'); run('press','Meta+r'); assert.equal(evaluate('performance.timeOrigin'),origin);
const checks = evaluate(`['wheel','contextmenu','gesturestart'].map(type=>{const e=new Event(type,{cancelable:true,bubbles:true});document.querySelector('.game-stage').dispatchEvent(e);return e.defaultPrevented})`);
assert.ok(checks.every(Boolean));
pass('Fullscreen uses child lock; refresh and delivered gesture events blocked');

evaluate('window.dispatchEvent(new Event("blur"))');
assert.ok(evaluate('!!document.querySelector(".lock-recovery")')); assert.equal(state().paused,true);
click('.lock-recovery .continue-button'); assert.equal(state().paused,false);
run('press','a'); assert.ok(evaluate('!!document.querySelector(".animal-speech")'));
pass('Focus interruption resumes with working game input');

const lock = center('.locked-button'); run('mouse','move',String(Math.round(lock.x)),String(Math.round(lock.y)));run('mouse','down');run('wait','3200');run('mouse','up');
assert.ok(evaluate('!!document.querySelector("[data-parent-gate]")'));
run('fill','[aria-label="算式答案"]','0');click('button[type="submit"]');assert.equal(state().childLocked,true);
assert.ok(evaluate('!!document.querySelector("[role=alert]")')); solve();
assert.equal(state().childLocked,false);assert.equal(evaluate('!!document.fullscreenElement'),false);
assert.equal(evaluate('sessionStorage.getItem("babyplay-child-lock")'),null);
pass('Three-second hold, wrong answer protection, verified unlock');
assert.equal(run('errors').errors?.length || 0,0);
pass('No runtime errors');
