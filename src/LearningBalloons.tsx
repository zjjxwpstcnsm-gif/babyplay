import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Volume2 } from 'lucide-react';
import { popSound, sparkleSound, speak, wakeAudio } from './audio';
import { colors } from './data';
import type { Settings } from './data';
import { characterForKey, characterSpeech, lessons, makeRound } from './learning';
import type { Lesson } from './learning';

type Props = { paused: boolean; settings: Settings; onReady: (action: (event?: KeyboardEvent) => void) => void };
export default function LearningBalloons({ paused, settings, onReady }: Props) {
  const [lesson, setLesson] = useState<Lesson>('numbers');
  const [round, setRound] = useState(() => makeRound('numbers'));
  const [popped, setPopped] = useState(false);
  const [stars, setStars] = useState(0);
  const [message, setMessage] = useState('看看气球上的字，找一找一样的按键');
  const latest = useRef({ paused, lesson, round, popped });
  latest.current = { paused, lesson, round, popped };
  const choose = (character: string) => {
    const current = latest.current;
    if (current.paused || current.popped) return;
    wakeAudio();
    if (character !== current.round.character) {
      setMessage(`慢慢来，找找 ${current.round.character} 在哪里`);
      speak(characterSpeech(current.lesson, current.round.character));
      return;
    }
    latest.current.popped = true;
    setPopped(true);
    setStars(value => value + 1);
    setMessage(`找到 ${current.round.character} 啦！真开心！`);
    popSound(); sparkleSound();
    speak(`找到啦！${characterSpeech(current.lesson, current.round.character)}`);
  };
  const action = useRef(choose);
  action.current = choose;
  useEffect(() => {
    const keyAction = (event?: KeyboardEvent) => {
      if (!event || event.repeat || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target instanceof Element && event.target.closest('input, textarea, select, dialog')) return;
      const current = latest.current;
      const character = characterForKey(current.lesson, current.round, event.key);
      if (character !== undefined) { event.preventDefault(); action.current(character); }
    };
    onReady(keyAction);
    window.addEventListener('keydown', keyAction);
    return () => window.removeEventListener('keydown', keyAction);
  }, [onReady]);
  useEffect(() => {
    if (paused || popped) return;
    const timer = window.setTimeout(() => speak(characterSpeech(lesson, round.character)), 350);
    return () => window.clearTimeout(timer);
  }, [round, lesson, paused, popped]);
  useEffect(() => {
    if (!popped || paused) return;
    const timer = window.setTimeout(() => {
      setRound(makeRound(lesson, round.character)); setPopped(false);
      setMessage('看看气球上的字，找一找一样的按键');
    }, 1900);
    return () => window.clearTimeout(timer);
  }, [popped, paused, lesson, round]);
  const changeLesson = (next: Lesson) => {
    if (paused || next === lesson) return;
    wakeAudio(); setLesson(next); setRound(makeRound(next)); setPopped(false); setStars(0);
    setMessage('看看气球上的字，找一找一样的按键');
  };
  const color = colors[stars % colors.length];
  return <div className={`learning-game ${paused ? 'learning-paused' : ''} ${settings.reducedMotion ? 'learning-still' : ''}`}>
    <div className="lesson-switch" role="group" aria-label="选择学习内容">{lessons.map(item => <button key={item.id} aria-pressed={lesson === item.id} disabled={paused} onClick={() => changeLesson(item.id)}><b>{item.icon}</b>{item.label}</button>)}</div>
    <div className="learning-stars" aria-label={`已经找到 ${stars} 个字符`}>⭐ <span>{stars === 0 ? '一起慢慢找' : `找到 ${stars} 个啦`}</span></div>
    <div className="learning-balloon-area">
      {!popped ? <button className="learning-balloon" aria-label={`气球上的${characterSpeech(lesson, round.character)}，点一下听读音`} data-character={round.character} style={{ '--light': color.light, '--middle': color.middle, '--dark': color.dark } as CSSProperties} disabled={paused} onClick={() => { wakeAudio(); speak(characterSpeech(lesson, round.character)); }}><span className="learning-balloon-body"><i className="learning-shine" /><strong>{round.character}</strong><span className="learning-listen"><Volume2 size={17} /> 听一听</span></span><i className="learning-knot" /><svg viewBox="0 0 40 100" fill="none" aria-hidden="true"><path d="M20 0C-2 23 44 42 20 65C10 75 17 90 20 100" stroke="currentColor" strokeWidth="2" /></svg></button> : <div className="learning-celebration" role="status"><span>✦</span><b>{round.character}</b><span>✧</span><small>找到啦！</small><div aria-hidden="true">🎉　⭐　🎉</div></div>}
    </div>
    <div className="learning-controls">
      <p className="learning-message" role="status">{message}</p>
      <div className="character-keys" role="group" aria-label="选择和气球相同的字符">{round.choices.map((char, index) => <button key={char} disabled={paused || popped} aria-label={`选择 ${char}${lesson === 'hanzi' ? `，键盘 ${index + 1}` : ''}`} data-character={char} onClick={() => choose(char)}><strong>{char}</strong><small>{lesson === 'hanzi' ? <>键盘 <kbd>{index + 1}</kbd></> : <>按 <kbd>{char}</kbd> 键</>}</small></button>)}</div>
      <p className="learning-tip">点下面的字符按键，或按键盘{lesson === 'hanzi' ? ' 1、2、3 选择对应汉字' : `上的${lesson === 'letters' ? '字母（大小写都可以）' : '数字'}`} · 没有倒计时</p>
    </div>
  </div>;
}
