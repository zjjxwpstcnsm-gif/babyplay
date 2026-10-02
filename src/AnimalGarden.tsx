import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Heart, PawPrint, Play, Sparkles } from 'lucide-react';
import { animals } from './data';
import { animalSound, wakeAudio } from './audio';
import AnimalArt from './AnimalArt';

type Props = { house: boolean; collected: string[]; reducedMotion: boolean; paused: boolean; onPlay: () => void; onReady: (action: () => void) => void };
export default function AnimalGarden({ house, collected, reducedMotion, paused, onPlay, onReady }: Props) {
  const [talking, setTalking] = useState('');
  const [bounce, setBounce] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const friends = house ? animals.filter(item => collected.includes(item.id)) : animals;
  const rows = friends.length > 4 ? [friends.slice(0, 3), friends.slice(3)] : [friends];
  function greet(id: string) {
    if (paused) return;
    wakeAudio(); animalSound(id); setTalking(id); setBounce(previous => previous + 1);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setTalking(''), 2800);
  }
  const action = useRef(() => {});
  action.current = () => { if (paused) return; const friend = friends[Math.floor(Math.random() * friends.length)]; if (friend) greet(friend.id); else onPlay(); };
  useEffect(() => {
    onReady(() => action.current());
    const keydown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey || event.repeat || /^F\d{1,2}$/.test(event.key) || ['Tab', 'Escape', 'Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(event.key)) return;
      const target = event.target as HTMLElement;
      if (target.closest('dialog,input,textarea,select') || target.closest('button') && ['Enter', ' '].includes(event.key)) return;
      event.preventDefault(); action.current();
    };
    window.addEventListener('keydown', keydown);
    return () => { window.removeEventListener('keydown', keydown); clearTimeout(timer.current); };
  }, [onReady]);
  return <div className={`animal-garden ${house ? 'animal-house' : ''} ${reducedMotion ? 'still-field' : ''} ${paused ? 'friends-paused' : ''}`}>
    <div className="garden-title"><span className="garden-pill"><Heart size={14} /> {house ? '欢迎回家，我的好朋友' : '点点小动物，打个招呼吧'}</span></div>
    {house && friends.length === 0 ? <div className="empty-house"><div className="empty-house-art"><AnimalArt id="rabbit" /><span>♡</span></div><h2>给好朋友，留一个暖暖的家</h2><p>兔兔和它的朋友藏在气球里，拍拍就能带它们回家。</p><button className="small-start" onClick={onPlay}><Play size={18} fill="currentColor" /> 去找好朋友</button></div> : <div className={`animal-roaming ${rows.length === 1 ? 'single-row' : ''}`}>
      {rows.map((row, rowIndex) => <div className="pet-row" key={rowIndex}>{row.map((animal, index) => <div className={`animal-spot ${talking === animal.id ? 'is-talking' : ''}`} key={animal.id} style={{ '--animal-color': animal.color, '--delay': `${(index + rowIndex * 3) * .65}s`, '--tilt': `${index % 2 ? 2 : -2}deg` } as CSSProperties}>
        {talking === animal.id && <div className="animal-speech" key={bounce} aria-live="polite">{animal.greeting}</div>}
        <button className="animal-button" aria-label={`点${animal.name}听声音`} onClick={() => greet(animal.id)}><span className="animal-shadow" /><span key={talking === animal.id ? bounce : 'idle'} className={`animal-character ${talking === animal.id ? 'greeting' : ''}`}><AnimalArt id={animal.id} alt={animal.name} /></span>{talking === animal.id && <span key={`hearts-${bounce}`} className="pet-hearts" aria-hidden="true"><i>♡</i><i>✦</i><i>♥</i></span>}</button>
        <span className="animal-name">{animal.name}<Heart size={12} /></span>
      </div>)}</div>)}
    </div>}
    {house && friends.length > 0 && <div className="missing-friends">{friends.length < animals.length ? <button className="find-friends" onClick={onPlay}><Sparkles size={15} /> 再带一个好朋友回家 <span>→</span></button> : <span><Heart size={15} /> 好朋友都到齐啦，抱抱！</span>}</div>}
    {!house && <div className="garden-bottom"><PawPrint size={15} /> 摸摸小脑袋，听听它的悄悄话</div>}
  </div>;
}
