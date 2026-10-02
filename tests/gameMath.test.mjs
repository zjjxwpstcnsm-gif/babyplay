import test from 'node:test';
import assert from 'node:assert/strict';
import { nearPoint, spawnPosition } from '../src/gameMath.ts';

test('A near miss remains tappable without catching faraway balloons', () => {
  assert.equal(nearPoint(151,100,100,100,64),true);
  assert.equal(nearPoint(170,100,100,100,64),false);
  assert.equal(nearPoint(100,100,100,100,64),true);
});

test('Spawn stays inside different PC play areas and below the controls', () => {
  for (const [w,h] of [[750,390],[1024,550],[1440,720]]) {
    const occupied=[];
    for (let i=0;i<100;i++) {
      const size=100+(i%4)*12;
      const p=spawnPosition(w,h,size,occupied,true);
      assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y));
      assert.ok(p.x>=18&&p.x+size<=w-18);
      assert.ok(p.y>=100&&p.y+size*1.17<=h-40);
      occupied.push({...p,size});
      if(occupied.length>7)occupied.shift();
    }
  }
});
