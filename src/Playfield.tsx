import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { animals, colors } from './data';
import type { BalloonKind, Mode, Photo, Settings } from './data';
import { animalSound, noteSound, popSound, sparkleSound, speak, tapSound, wakeAudio } from './audio';

type Balloon = { id: number; x: number; y: number; size: number; color: number; kind: BalloonKind; hp: number; animal: number; phase: number; drift: number; dodged: boolean; photo?: Photo };
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; angle: number; spin: number; shape: number };
type Reward = { id: number; emoji?: string; text: string; x: number; y: number; photo?: string; kind?: string };
type Props = { mode: Mode; settings: Settings; photos: Photo[]; paused: boolean; onStart: () => void; onPop: () => number; onUnlock: (id: string) => void; onReady?: (action: () => void) => void };
let nextId = 1;

export default function Playfield({ mode, settings, photos, paused, onStart, onPop, onUnlock, onReady }: Props) {
  const layer = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const nodes = useRef(new Map<number, HTMLButtonElement>());
  const targets = useRef<Balloon[]>([]);
  const particles = useRef<Particle[]>([]);
  const dimensions = useRef({ w: 1000, h: 600 });
  const count = useRef(0);
  const spawnAt = useRef(0);
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [special, setSpecial] = useState<{ kind: string; id: number } | null>(null);
  const [night, setNight] = useState(false);
  const timeouts = useRef<ReturnType<typeof setTimeout>[]>([]);
  const latest = useRef({ mode, settings, photos, paused, onStart, onPop, onUnlock });
  latest.current = { mode, settings, photos, paused, onStart, onPop, onUnlock };

  const later = (callback: () => void, delay: number) => {
    const timer = setTimeout(() => { timeouts.current = timeouts.current.filter(item => item !== timer); callback(); }, delay);
    timeouts.current.push(timer);
  };

  function burst(x: number, y: number, bubble = false, big = false) {
    const n = latest.current.settings.reducedMotion ? 8 : big ? 64 : 28;
    for (let i = 0; i < n; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (bubble ? 60 : 100) + Math.random() * (big ? 260 : 180);
      const life = 0.65 + Math.random() * 0.65;
      particles.current.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 70, life, max: life, color: bubble ? ['#ffffff', '#c2edff', '#e0d0ff'][i % 3] : colors[i % colors.length].middle, size: 4 + Math.random() * 7, angle, spin: Math.random() * 8 - 4, shape: i % 3 });
    }
    if (particles.current.length > 550) particles.current.splice(0, particles.current.length - 550);
  }

  function reward(emoji: string | undefined, text: string, x: number, y: number, photo?: string, kind?: string) {
    const id = nextId++;
    setRewards(previous => [...previous.slice(-4), { id, emoji, text, x, y, photo, kind }]);
    later(() => setRewards(previous => previous.filter(item => item.id !== id)), 2700);
  }

  function celebrate(kind: string) {
    const id = nextId++;
    setSpecial({ kind, id });
    sparkleSound();
    if (kind === 'rainbow') speak('哇，好漂亮的彩虹！');
    if (kind === 'train') speak('小火车来啦！呜呜！');
    later(() => setSpecial(previous => previous?.id === id ? null : previous), 4800);
  }

  function createTarget(initial = false, index = 0): Balloon {
    const { w, h } = dimensions.current;
    const bubble = latest.current.mode === 'bubbles';
    const photoList = latest.current.photos;
    const roll = Math.random();
    let kind: BalloonKind = roll < 0.37 ? 'normal' : roll < 0.55 ? 'animal' : roll < 0.66 ? 'music' : roll < 0.75 ? 'giant' : roll < 0.83 ? 'rainbow' : roll < 0.91 ? 'magic' : 'gift';
    if (initial && !bubble) kind = (['normal', 'animal', 'music', 'normal', 'rainbow', 'giant', 'gift'] as BalloonKind[])[index % 7];
    if (photoList.length && (Math.random() < 0.18 || (initial && index === 3))) kind = 'photo';
    if (bubble) kind = 'normal';
    const size = bubble ? 48 + Math.random() * Math.min(62, h * 0.11) : Math.max(85, Math.min(145, h * 0.22)) * (kind === 'giant' ? 1.28 : 0.86 + Math.random() * 0.22);
    const x = initial ? bubble ? 36 + Math.random() * (w - 90) : w * [0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 0.34][index % 7] : 35 + Math.random() * (w - size - 60);
    const y = initial ? bubble ? h * 0.1 + Math.random() * h * 0.63 : h * [0.22, 0.41, 0.14, 0.45, 0.23, 0.47, 0.67][index % 7] : latest.current.settings.reducedMotion ? h * (0.18 + Math.random() * 0.45) : h - size * 1.45;
    return { id: nextId++, x: Math.min(w - size - 20, Math.max(20, x)), y, size, color: initial ? [0, 2, 5, 3, 4, 1, 6][index % 7] : Math.floor(Math.random() * colors.length), kind, hp: kind === 'giant' ? 3 : 1, animal: Math.floor(Math.random() * animals.length), phase: Math.random() * Math.PI * 2, drift: Math.random() * 2 + 1, dodged: false, photo: kind === 'photo' ? photoList[Math.floor(Math.random() * photoList.length)] : undefined };
  }

  function pop(target: Balloon, force = false) {
    const config = latest.current;
    if (config.paused || !targets.current.some(item => item.id === target.id)) return;
    wakeAudio();
    if (config.mode === 'home') config.onStart();
    const x = target.x + target.size / 2;
    const y = target.y + target.size * 0.58;
    if (!force && target.color === 2 && target.kind === 'normal' && !target.dodged && config.mode !== 'bubbles') {
      target.dodged = true;
      target.x = Math.min(dimensions.current.w - target.size - 20, Math.max(20, target.x + (target.x > dimensions.current.w / 2 ? -50 : 50)));
      tapSound();
      reward('💨', '咻～', x, y);
      return;
    }
    if (target.hp > 1) {
      target.hp--;
      target.size *= 1.065;
      tapSound();
      burst(x, y, false);
      setBalloons([...targets.current]);
      reward('⭐', target.hp === 2 ? '再拍拍～' : '就差一下啦！', x, y);
      return;
    }
    targets.current = targets.current.filter(item => item.id !== target.id);
    setBalloons([...targets.current]);
    const bubble = config.mode === 'bubbles';
    popSound(bubble);
    burst(x, y, bubble, target.kind === 'giant');
    count.current = config.onPop();
    if (target.kind === 'animal') {
      const animal = animals[target.animal];
      config.onUnlock(animal.id);
      reward(animal.emoji, animal.greeting, x, y, undefined, 'animal');
      animalSound(animal.id);
    } else if (target.kind === 'gift') {
      sparkleSound();
      reward(['🧸', '🚗', '🪁', '🪀', '🎨'][target.animal % 5], '送你一个小玩具！', x, y);
      speak('送你一个小玩具！');
    } else if (target.kind === 'rainbow') celebrate('rainbow');
    else if (target.kind === 'music') {
      noteSound(target.color);
      reward('🎵', ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'][target.color], x, y);
    } else if (target.kind === 'magic') {
      sparkleSound();
      reward(['🦋', '🌟', '🎆'][target.animal % 3], '变变变！', x, y);
    } else if (target.kind === 'photo' && target.photo) {
      sparkleSound();
      reward(undefined, `找到${target.photo.name}啦！`, x, y, target.photo.data);
      speak(`找到${target.photo.name}啦！`);
    } else if (target.kind === 'giant') reward('🌟', '砰！好大一颗星星！', x, y);
    else if (count.current % 4 === 1) reward(bubble ? '✨' : '⭐', bubble ? '啵！' : '啪！', x, y);
    if (count.current % 10 === 0) {
      const milestone = Math.floor(count.current / 10);
      if (milestone % 4 === 2) celebrate('rainbow');
      else if (milestone % 4 === 3) celebrate('train');
      else {
        const animal = animals[milestone % 4 === 1 ? 0 : 5];
        config.onUnlock(animal.id);
        reward(animal.emoji, milestone % 4 === 1 ? '兔兔来找你玩啦！' : '嗷呜！小恐龙来啦！', dimensions.current.w / 2, dimensions.current.h * 0.65, undefined, 'big-animal');
        animalSound(animal.id);
      }
    }
  }
  const popRef = useRef(pop);
  popRef.current = pop;

  useEffect(() => {
    const container = layer.current;
    const surface = canvas.current;
    if (!container || !surface) return;
    const context = surface.getContext('2d');
    if (!context) return;
    const resize = () => {
      const { width: w, height: h } = container.getBoundingClientRect();
      dimensions.current = { w, h };
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      surface.width = w * ratio;
      surface.height = h * ratio;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      targets.current.forEach(item => { item.x = Math.min(item.x, w - item.size - 20); item.y = Math.min(item.y, h * 0.8); });
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    setRewards([]);
    setSpecial(null);
    setNight(false);
    const n = latest.current.mode === 'bubbles' ? 26 : 6;
    targets.current = Array.from({ length: n }, (_, i) => createTarget(true, i));
    setBalloons([...targets.current]);
    let frame: number;
    let previousTime = performance.now();
    const draw = (now: number) => {
      const dt = Math.min((now - previousTime) / 1000, 0.035);
      previousTime = now;
      const { w, h } = dimensions.current;
      const config = latest.current;
      const bubble = config.mode === 'bubbles';
      if (!config.paused) {
        const speed = config.mode === 'home' ? 0 : config.settings.reducedMotion ? 0 : config.settings.speed === 'slow' ? 12 : 23;
        let changed = false;
        targets.current.forEach(item => {
          item.y -= speed * dt * (bubble ? 1.2 : 1);
          const bob = config.settings.reducedMotion ? 0 : Math.sin(now / 1600 + item.phase) * (bubble ? 5 : 12);
          const node = nodes.current.get(item.id);
          if (node) node.style.transform = `translate3d(${item.x + bob}px, ${item.y}px, 0) rotate(${config.settings.reducedMotion ? 0 : Math.sin(now / 2200 + item.phase) * 4}deg)`;
          if (item.y < -item.size * 0.35) changed = true;
        });
        if (changed) targets.current = targets.current.filter(item => item.y >= -item.size * 0.35);
        if (config.mode !== 'home' && targets.current.length < (bubble ? 28 : 7) && now > spawnAt.current) {
          targets.current.push(createTarget());
          spawnAt.current = now + (bubble ? 90 : 340);
          changed = true;
        }
        if (changed) setBalloons([...targets.current]);
      }
      context.clearRect(0, 0, w, h);
      particles.current = particles.current.filter(p => p.life > 0);
      for (const p of particles.current) {
        if (!config.paused) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 240 * dt; p.angle += p.spin * dt; }
        context.save();
        context.globalAlpha = Math.min(1, p.life / p.max * 2);
        context.translate(p.x, p.y);
        context.rotate(p.angle);
        context.fillStyle = p.color;
        if (p.shape === 0) { context.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.55); }
        else if (p.shape === 1) { context.beginPath(); context.arc(0, 0, p.size / 2, 0, Math.PI * 2); context.fill(); }
        else { context.beginPath(); for (let i = 0; i < 10; i++) { const radius = i % 2 ? p.size * 0.25 : p.size * 0.6; const a = i * Math.PI / 5; context.lineTo(Math.cos(a) * radius, Math.sin(a) * radius); } context.closePath(); context.fill(); }
        context.restore();
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); particles.current = []; timeouts.current.forEach(clearTimeout); timeouts.current = []; };
  // The entire field is recreated only when switching into or out of bubble mode.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode === 'bubbles']);

  useEffect(() => {
    const action = () => { const target = [...targets.current].sort((a, b) => a.y - b.y).find(item => item.y > 30 && item.y < dimensions.current.h - item.size); if (target) popRef.current(target, true); };
    onReady?.(action);
    const keydown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat || ['Tab', 'Escape', 'Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(event.key) || event.key.startsWith('F') && event.key.length < 4) return;
      const element = event.target as HTMLElement;
      if (element.closest('input, textarea, select, dialog') || element.tagName === 'BUTTON' && ['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      action();
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [onReady]);

  const backgroundTap = (event: React.PointerEvent<HTMLDivElement>) => {
    if (latest.current.paused || (event.target as HTMLElement).closest('button')) return;
    const rect = layer.current!.getBoundingClientRect();
    wakeAudio();
    burst(event.clientX - rect.left, event.clientY - rect.top, true);
    tapSound();
  };

  return <div ref={layer} className={`playfield ${mode === 'bubbles' ? 'bubble-field' : ''} ${night ? 'night-field' : ''} ${settings.reducedMotion ? 'still-field' : ''}`} onPointerDown={backgroundTap}>
    {balloons.map(item => {
      const c = colors[item.color];
      const bubble = mode === 'bubbles';
      const style = { width: item.size, height: bubble ? item.size : item.size * 1.55, '--light': c.light, '--middle': c.middle, '--dark': c.dark, '--size': `${item.size}px`, transform: `translate3d(${item.x}px, ${item.y}px, 0)` } as CSSProperties;
      return <button key={item.id} ref={node => { if (node) nodes.current.set(item.id, node); else nodes.current.delete(item.id); }} className={`balloon-target ${bubble ? 'bubble-target' : ''} kind-${item.kind}`} style={style} onClick={event => { event.stopPropagation(); popRef.current(item); }} aria-label={bubble ? '拍破泡泡' : `拍${c.name}${item.kind === 'giant' ? '超大' : item.kind === 'rainbow' ? '彩虹' : item.kind === 'animal' ? '动物' : item.kind === 'music' ? '音乐' : item.kind === 'photo' ? item.photo?.name : ''}气球`} data-kind={item.kind}>
        <span className="balloon-body"><span className="balloon-shine" />{!bubble && <span className="balloon-face">{item.kind === 'animal' ? animals[item.animal].emoji : item.kind === 'music' ? '♫' : item.kind === 'magic' ? '✦' : item.kind === 'gift' ? '🎁' : item.kind === 'giant' ? '★' : item.kind === 'photo' && item.photo ? <img src={item.photo.data} alt={item.photo.name} /> : item.kind === 'rainbow' ? '☁' : <span className="happy-face"><i /><i /><b /></span>}</span>}{item.kind === 'giant' && <span className="balloon-hearts">{Array.from({ length: item.hp }, (_, i) => <i key={i} />)}</span>}</span>
        {!bubble && <><span className="balloon-knot" /><svg className="balloon-string" viewBox="0 0 40 95" fill="none" aria-hidden="true"><path d="M20 0C-2 23 44 42 20 65C10 75 17 83 19 95" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg></>}
      </button>;
    })}
    <canvas ref={canvas} className="particle-canvas" aria-hidden="true" />
    {rewards.map(item => <div key={item.id} className={`pop-reward ${item.kind ?? ''}`} style={{ left: Math.min(dimensions.current.w - 90, Math.max(90, item.x)), top: Math.min(dimensions.current.h - 70, Math.max(110, item.y)) }} aria-live="polite"><span className="reward-emoji">{item.photo ? <img src={item.photo} alt="熟悉的面孔" /> : item.emoji}</span><span className="reward-caption">{item.text}</span></div>)}
    {special && <div key={special.id} className={`special-effect ${special.kind}`} aria-live="polite">{special.kind === 'rainbow' ? <><span>🌈</span><p>彩虹来啦！</p></> : <span>🚂<span>🚃🚃</span></span>}</div>}
    {mode !== 'home' && <>
      <button className="sky-sun" aria-label={night ? '点月亮，变回白天' : '点太阳，看看小星星'} onClick={() => { wakeAudio(); setNight(!night); sparkleSound(); speak(night ? '太阳出来啦！' : '小星星，亮晶晶！'); }}>{night ? '🌙' : '☀️'}</button>
      <button className="cloud-touch" aria-label="点云朵，下点小雨" onClick={() => { const { w } = dimensions.current; burst(w * 0.13, 120, true, true); sparkleSound(); reward('💧', '滴答，滴答～', w * 0.13, 150); }} />
      {night && <div className="night-stars" aria-hidden="true">✧　　✦　　　　　✧　　✦<br />　　　✧　　　✦　　　　✧</div>}
    </>}
  </div>;
}
