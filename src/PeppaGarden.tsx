import { useEffect, useRef, useState } from 'react';
import { CloudRain, Heart, Sparkles, Sun } from 'lucide-react';
import { noteSound, sparkleSound, speak, splashSound, wakeAudio } from './audio';

type Props = { paused: boolean; reducedMotion: boolean; onUnlock: (id: string) => void; onReady: (action: () => void) => void };
type Droplet = { x: number; y: number; vx: number; vy: number; age: number; size: number; rain: boolean };
type Jumper = { elapsed: number; active: boolean; landed: boolean };
const friends = [{ id: 'george', name: '乔治', x: .31 }, { id: 'dinosaur', name: '小恐龙', x: .74 }];

export default function PeppaGarden({ paused, reducedMotion, onUnlock, onReady }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const bodies = useRef<(HTMLSpanElement | null)[]>([]);
  const jumpers = useRef<Jumper[]>(friends.map(() => ({ elapsed: 0, active: false, landed: false })));
  const drops = useRef<Droplet[]>([]);
  const activeTime = useRef(0);
  const rainUntil = useRef(0);
  const messageUntil = useRef(0);
  const nextFriend = useRef(0);
  const landings = useRef(0);
  const [rainy, setRainy] = useState(false);
  const [message, setMessage] = useState('乔治带着小恐龙，来找你玩啦！');
  const latest = useRef({ paused, reducedMotion, onUnlock });
  latest.current = { paused, reducedMotion, onUnlock };

  function jump(index: number) {
    if (latest.current.paused || jumpers.current[index].active) return;
    wakeAudio(); noteSound(index === 0 ? 2 : 4);
    jumpers.current[index] = { elapsed: 0, active: true, landed: false };
    bodies.current[index]?.parentElement?.setAttribute('data-jumping', 'true');
    nextFriend.current = 1 - index;
  }
  function rain() {
    if (latest.current.paused) return;
    if (rainy) { rainUntil.current = 0; setRainy(false); sparkleSound(); return; }
    wakeAudio(); noteSound(5); setRainy(true);
    rainUntil.current = activeTime.current + 6;
    setMessage('滴答滴答，泥坑变得软软的！'); messageUntil.current = activeTime.current + 3;
    speak('滴答滴答，下点小雨啦！');
  }
  useEffect(() => {
    const element = root.current;
    const surface = canvas.current;
    if (!element || !surface) return;
    const context = surface.getContext('2d');
    if (!context) return;
    let width = 0, height = 0, frame = 0, previous = performance.now(), rainAccumulator = 0;
    const resize = () => {
      width = element.clientWidth; height = element.clientHeight;
      const dpr = Math.min(devicePixelRatio || 1, 2);
      surface.width = Math.round(width * dpr); surface.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      drops.current = [];
    };
    resize(); const observer = new ResizeObserver(resize); observer.observe(element);
    const update = (now: number) => {
      const dt = Math.min((now - previous) / 1000, .05); previous = now;
      if (!latest.current.paused) {
        activeTime.current += dt;
        context.clearRect(0, 0, width, height);
        jumpers.current.forEach((jumper, index) => {
          const body = bodies.current[index];
          if (!jumper.active || !body) return;
          jumper.elapsed += dt;
          const progress = Math.min(jumper.elapsed / .72, 1);
          const leap = Math.sin(progress * Math.PI) * (latest.current.reducedMotion ? 16 : Math.min(height * .22, 135));
          const squish = progress > .9 ? .94 : 1;
          body.style.transform = `translateY(${-leap}px) scale(${1 / squish},${squish}) rotate(${latest.current.reducedMotion ? 0 : Math.sin(progress * Math.PI * 2) * 6}deg)`;
          if (progress >= .96 && !jumper.landed) {
            jumper.landed = true; landings.current++;
            latest.current.onUnlock(friends[index].id); splashSound();
            const character = body.getBoundingClientRect(), area = element.getBoundingClientRect();
            const x = character.x + character.width / 2 - area.x, y = character.bottom - area.y - character.height * .06;
            for (let i = 0; i < (latest.current.reducedMotion ? 8 : 24); i++) drops.current.push({ x, y, vx: (Math.random() - .5) * 420, vy: -50 - Math.random() * 220, age: 0, size: 3 + Math.random() * 6, rain: false });
            setMessage(landings.current % 6 === 0 ? '噗嗤！今天的泥坑派对，真开心！' : index === 0 ? '乔治：恐龙！噗嗤～' : '小恐龙也会跳泥坑，嗷呜～');
            messageUntil.current = activeTime.current + 2.8;
            if (landings.current % 6 === 0) { sparkleSound(); speak('一起跳泥坑，好开心！'); }
          }
          if (progress === 1) { jumper.active = false; body.style.transform = ''; body.parentElement?.removeAttribute('data-jumping'); }
        });
        if (rainUntil.current > activeTime.current) {
          rainAccumulator += dt;
          if (rainAccumulator > (latest.current.reducedMotion ? .16 : .035)) {
            rainAccumulator = 0;
            drops.current.push({ x: Math.random() * width, y: -10, vx: -28, vy: 340, age: 0, size: 2, rain: true });
          }
        } else if (rainUntil.current > 0) { rainUntil.current = 0; setRainy(false); }
        if (messageUntil.current && activeTime.current > messageUntil.current) { messageUntil.current = 0; setMessage('点点乔治，或者按任意键，一起跳！'); }
        drops.current = drops.current.filter(drop => drop.rain ? drop.y < height * .85 : drop.age < .85).slice(-180);
        for (const drop of drops.current) {
          drop.age += dt; drop.x += drop.vx * dt; drop.y += drop.vy * dt;
          if (drop.rain) {
            context.strokeStyle = '#ecfcffb3'; context.lineWidth = 2; context.beginPath(); context.moveTo(drop.x, drop.y); context.lineTo(drop.x + 1.5, drop.y - 11); context.stroke();
          } else {
            drop.vy += 650 * dt; context.globalAlpha = Math.max(0, 1 - drop.age / .85);
            context.fillStyle = '#93694e'; context.beginPath(); context.ellipse(drop.x, drop.y, drop.size, drop.size * .72, drop.age * 3, 0, Math.PI * 2); context.fill();
            context.fillStyle = '#c8a381'; context.beginPath(); context.arc(drop.x - 1, drop.y - 1, drop.size * .28, 0, Math.PI * 2); context.fill(); context.globalAlpha = 1;
          }
        }
      }
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, []);
  const action = useRef(() => {}); action.current = () => jump(nextFriend.current);
  useEffect(() => {
    onReady(() => action.current());
    const keydown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey || event.repeat || /^F\d{1,2}$/.test(event.key) || ['Tab', 'Escape', 'Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(event.key)) return;
      const target = event.target as HTMLElement;
      if (target.closest('dialog,input,textarea,select') || target.closest('button') && ['Enter', ' '].includes(event.key)) return;
      event.preventDefault(); action.current();
    };
    window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown);
  }, [onReady]);
  return <div ref={root} className={`peppa-garden ${rainy ? 'mud-rainy' : ''} ${paused ? 'mud-paused' : ''} ${reducedMotion ? 'still-field' : ''}`}>
    <div className="mud-weather" aria-hidden="true">{rainy ? <CloudRain size={23} /> : <Sun size={23} />} {rainy ? '滴答滴答的小雨天' : '今天适合跳泥坑'}</div>
    <p className="mud-message" aria-live="polite"><Heart size={16} />{message}</p>
    {friends.map((friend, index) => <button key={friend.id} className={`mud-friend mud-${friend.id}`} aria-label={`和${friend.name}跳泥坑`} onPointerDown={event => { if (event.isPrimary && event.button === 0) { event.preventDefault(); jump(index); } }} onClick={event => { if (event.detail === 0) jump(index); }}>
      <span className="mud-ground-shadow" /><span className="mud-jumper" ref={element => { bodies.current[index] = element; }}><img src={`art/animals/${friend.id}.webp`} alt={friend.name} draggable="false" /></span><span className="mud-friend-name">{friend.name}<Heart size={12} /></span>
    </button>)}
    <canvas ref={canvas} className="mud-particles" aria-hidden="true" />
    <div className="mud-controls"><button onClick={() => { jump(0); jump(1); }}><Sparkles size={23} />一起跳！</button><button onClick={rain} aria-pressed={rainy}>{rainy ? <Sun size={23} /> : <CloudRain size={23} />}{rainy ? '太阳出来啦' : '下点小雨'}</button></div>
  </div>;
}
