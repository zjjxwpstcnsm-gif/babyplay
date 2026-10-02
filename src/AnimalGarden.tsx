import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Heart, Play, Sparkles } from 'lucide-react';
import { animals } from './data';
import { animalSound, wakeAudio } from './audio';

export default function AnimalGarden({ house, collected, reducedMotion, paused, onPlay }: { house: boolean; collected: string[]; reducedMotion: boolean; paused: boolean; onPlay: () => void }) {
  const [talking, setTalking] = useState('');
  const [bounce, setBounce] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  function greet(id: string) {
    if (paused) return;
    wakeAudio();
    animalSound(id);
    setTalking(id);
    setBounce(previous => previous + 1);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setTalking(''), 2800);
  }
  const friends = house ? animals.filter(item => collected.includes(item.id)) : animals;
  const missing = animals.filter(item => !collected.includes(item.id));
  return <div className={`animal-garden ${house ? 'animal-house' : ''} ${reducedMotion ? 'still-field' : ''}`}>
    <div className="garden-title"><span className="garden-pill"><Heart size={14} /> {house ? '找到的好朋友，都会住在这里' : '点点小动物，打个招呼吧'}</span></div>
    {house && friends.length === 0 ? <div className="empty-house"><span className="empty-house-icon">🏡</span><h2>谁会是你的第一个好朋友？</h2><p>气球里藏着小动物，拍拍就能找到它们。</p><button className="small-start" onClick={onPlay}><Play size={18} fill="currentColor" /> 去拍气球</button></div> : <div className="animal-roaming" style={{ '--friend-count': friends.length } as CSSProperties}>
      {friends.map((animal, index) => <div className="animal-spot" key={animal.id} style={{ '--animal-color': animal.color, '--delay': `${index * .45}s`, '--tilt': `${index % 2 ? 4 : -4}deg` } as CSSProperties}>
        {talking === animal.id && <div className="animal-speech" key={bounce} aria-live="polite">{animal.greeting}</div>}
        <button className="animal-button" aria-label={`点${animal.name}听声音`} onClick={() => greet(animal.id)}><span key={talking === animal.id ? bounce : 'idle'} className={`animal-character ${talking === animal.id ? 'greeting' : ''}`}>{animal.emoji}</span><span className="animal-shadow" /></button>
        <span className="animal-name">{animal.name}<span>♡</span></span>
      </div>)}
    </div>}
    {house && missing.length > 0 && friends.length > 0 && <div className="missing-friends"><span><Sparkles size={14} /> 还有好朋友藏在气球里</span>{missing.map(animal => <span className="missing-friend" key={animal.id} aria-label={`还没找到${animal.name}`}>?</span>)}</div>}
    {house && friends.length === animals.length && <div className="missing-friends all-friends">所有好朋友都来啦！ <span>♡</span></div>}
    {!house && <div className="garden-bottom">🐾　小动物也很喜欢和你一起玩</div>}
  </div>;
}
