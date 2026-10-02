import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Carrot, HandHeart, Heart, MoonStar, Play, Sparkles } from 'lucide-react';
import { animals } from './data';
import { animalSound, noteSound, sparkleSound, speak, wakeAudio } from './audio';
import AnimalArt from './AnimalArt';

type Props = { house: boolean; collected: string[]; reducedMotion: boolean; paused: boolean; onPlay: () => void; onReady: (action: () => void) => void };
export default function AnimalGarden({ house, collected, reducedMotion, paused, onPlay, onReady }: Props) {
  const [talking, setTalking] = useState('');
  const [bounce, setBounce] = useState(0);
  const [activity, setActivity] = useState<'pet' | 'feed' | 'sleep'>('pet');
  const [sleeping, setSleeping] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const friends = house ? animals.filter(item => collected.includes(item.id)) : animals;
  const splitAt = Math.ceil(friends.length / 2);
  const rows = friends.length > 4 ? [friends.slice(0, splitAt), friends.slice(splitAt)] : [friends];
  function greet(id: string) {
    if (paused) return;
    wakeAudio(); setTalking(id); setBounce(previous => previous + 1);
    const animal = animals.find(friend => friend.id === id)!;
    if (activity === 'sleep') {
      const asleep = sleeping.includes(id);
      setSleeping(previous => asleep ? previous.filter(friend => friend !== id) : [...previous, id]);
      setMessage(asleep ? '睡醒啦，抱抱！' : '晚安，做个甜甜的梦～');
      noteSound(asleep ? 4 : 0); speak(asleep ? '睡醒啦！' : `${animal.name}，晚安。`);
    } else {
      setSleeping(previous => previous.filter(friend => friend !== id));
      if (activity === 'feed') { setMessage('啊呜～谢谢你的小点心！'); sparkleSound(); speak('啊呜，好好吃！'); }
      else { setMessage(animal.greeting); animalSound(id); }
    }
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
      {rows.map((row, rowIndex) => <div className="pet-row" key={rowIndex}>{row.map((animal, index) => <div className={`animal-spot ${talking === animal.id ? 'is-talking' : ''} ${sleeping.includes(animal.id) ? 'pet-sleeping' : ''}`} key={animal.id} style={{ '--animal-color': animal.color, '--delay': `${(index + rowIndex * 3) * .65}s`, '--tilt': `${index % 2 ? 2 : -2}deg` } as CSSProperties}>
        {talking === animal.id && <div className="animal-speech" key={bounce} aria-live="polite">{message}</div>}
        <button className="animal-button" aria-label={`点${animal.name}听声音`} onClick={() => greet(animal.id)}><span className="animal-shadow" /><span key={talking === animal.id ? bounce : 'idle'} className={`animal-character ${talking === animal.id ? 'greeting' : ''}`}><AnimalArt id={animal.id} alt={animal.name} /></span>{talking === animal.id && <span key={`hearts-${bounce}`} className="pet-hearts" aria-hidden="true"><i>♡</i><i>✦</i><i>♥</i></span>}</button>
        <span className="animal-name">{animal.name}<Heart size={12} /></span>
        {sleeping.includes(animal.id) && <span className="sleep-breath" aria-hidden="true">z Z z</span>}
        {talking === animal.id && activity === 'feed' && <span className="feeding-treat" key={`treat-${bounce}`} aria-hidden="true"><Carrot size={43} fill="#ffc886" /></span>}
      </div>)}</div>)}
    </div>}
    {house && friends.length > 0 && <div className="missing-friends">{friends.length < animals.length ? <button className="find-friends" onClick={onPlay}><Sparkles size={15} /> 再带一个好朋友回家 <span>→</span></button> : <span><Heart size={15} /> 好朋友都到齐啦，抱抱！</span>}</div>}
    {friends.length > 0 && <div className="pet-activities" role="group" aria-label="和小动物怎么玩">{([{id:'pet',name:'摸摸',icon:HandHeart},{id:'feed',name:'喂点心',icon:Carrot},{id:'sleep',name:'哄睡',icon:MoonStar}] as const).map(item=><button key={item.id} aria-pressed={activity===item.id} onClick={()=>{if(paused)return;setActivity(item.id);setTalking('');}}><item.icon size={25}/><span>{item.name}</span></button>)}</div>}
  </div>;
}
