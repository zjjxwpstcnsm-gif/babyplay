import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Expand, Gift, Home, MousePointer2, Play, Settings2, Sparkles, Volume2, VolumeX } from 'lucide-react';
import Playfield from './Playfield';
import AnimalGarden from './AnimalGarden';
import ParentSettings from './ParentSettings';
import usePlaygroundTools from './usePlaygroundTools';
import { configureAudio, sparkleSound, speak, wakeAudio } from './audio';
import { defaultSettings, modes, readLocal, saveLocal } from './data';
import type { Mode, Photo, Settings } from './data';

export default function App() {
  const [mode, setMode] = useState<Mode>('home');
  const [settings, setSettings] = useState<Settings>(() => ({ ...defaultSettings, ...readLocal('settings', {}) }));
  const [photos, setPhotos] = useState<Photo[]>(() => readLocal('photos', []));
  const [collected, setCollected] = useState<string[]>(() => readLocal('animals', []));
  const [popCount, setPopCount] = useState(0);
  const totalPops = useRef(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hidden, setHidden] = useState(document.hidden);
  const popAction = useRef<(() => void) | null>(null);
  const registerPop = useCallback((action: () => void) => { popAction.current = action; }, []);
  const handlePop = useCallback(() => { totalPops.current++; setPopCount(totalPops.current); return totalPops.current; }, []);
  useEffect(() => { configureAudio(settings.sound, settings.volume, settings.voice); saveLocal('settings', settings); }, [settings]);
  useEffect(() => { const handler = () => { setHidden(document.hidden); if (document.hidden) window.speechSynthesis?.cancel(); }; document.addEventListener('visibilitychange', handler); return () => document.removeEventListener('visibilitychange', handler); }, []);
  const go = (destination: Mode) => { wakeAudio(); setMode(destination); if (destination !== mode) sparkleSound(); };
  usePlaygroundTools({ mode, collected, pops: popCount, paused: settingsOpen || hidden }, go, () => popAction.current?.());
  const unlock = (id: string) => setCollected(previous => { if (previous.includes(id)) return previous; const next = [...previous, id]; saveLocal('animals', next); return next; });
  const fullscreen = () => { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen?.().catch(() => {}); };
  const active = modes.find(item => item.id === mode);
  return <main className="app-shell">
    <header className="app-header">
      <button className="brand" onClick={() => go('home')} aria-label="回到首页"><span className="brand-mark">🎈</span><span><strong>泡泡气球乐园<span className="brand-dot">.</span></strong><small>小小的手，大大的快乐</small></span></button>
      <div className="header-note"><Sparkles size={15} /> 为每一次好奇，准备一点惊喜</div>
      <div className="header-actions">
        <button className={`icon-button ${!settings.sound ? 'muted' : ''}`} aria-label={settings.sound ? '关闭声音' : '开启声音'} title={settings.sound ? '关闭声音' : '开启声音'} onClick={() => { wakeAudio(); setSettings(previous => ({ ...previous, sound: !previous.sound })); }}>{settings.sound ? <Volume2 size={21} /> : <VolumeX size={21} />}</button>
        <button className="icon-button" aria-label="切换全屏" title="全屏玩" onClick={fullscreen}><Expand size={20} /></button>
        <span className="header-divider" />
        <button className="parent-button" onClick={() => setSettingsOpen(true)}><Settings2 size={18} /><span>家长设置</span></button>
      </div>
    </header>
    <section className={`game-stage stage-${mode}`} aria-label={mode === 'home' ? '欢迎来到泡泡气球乐园' : active?.name}>
      <div className="scene-background" />
      {(mode === 'home' || mode === 'balloons' || mode === 'bubbles') && <Playfield mode={mode} settings={settings} photos={photos} paused={settingsOpen || hidden} onStart={() => setMode('balloons')} onPop={handlePop} onUnlock={unlock} onReady={registerPop} />}
      {(mode === 'animals' || mode === 'house') && <AnimalGarden house={mode === 'house'} collected={collected} reducedMotion={settings.reducedMotion} paused={settingsOpen || hidden} onPlay={() => go('balloons')} />}
      {mode === 'home' ? <>
        <div className="home-copy"><div className="welcome-pill"><span>✦</span> 欢迎来到你的快乐小天地</div><h1>小手拍拍，<br /><span>惊喜来啦！</span></h1><p>彩色气球里，藏着好多好朋友。<br />来和兔兔一起，把快乐拍出来吧。</p><button className="start-button" onClick={() => { go('balloons'); speak('欢迎来到气球乐园！拍拍气球吧！'); }}><Play size={25} fill="currentColor" strokeWidth={0} /> 开始玩 <span className="start-spark">✦</span></button><span className="start-hint"><MousePointer2 size={14} /> 点一下就能玩，按任意键也可以哦</span></div>
        <img className="home-bunny" src="art/bunny.webp" alt="拿着粉色气球、向你挥手的兔兔" draggable="false" />
        <span className="bunny-greeting">嗨，一起玩呀！ <span>♡</span></span>
        <div className="home-corner"><span>☀️</span> 今天也是快乐的一天</div>
      </> : <>
        <div className="scene-heading"><button className="back-button" aria-label="回到首页" onClick={() => go('home')}><ArrowLeft size={20} /></button><div><h1>{active?.name}</h1><p>{mode === 'bubbles' ? '啵！啵！让小泡泡飞起来' : mode === 'animals' ? '喵～嘎嘎～谁在和你打招呼？' : mode === 'house' ? '你的好朋友，在这里等你' : '拍拍气球，看看里面有什么'}</p></div></div>
        {(mode === 'balloons' || mode === 'bubbles') && <><div className="surprise-progress"><span className="gift-icon"><Gift size={22} /></span><span><small>下一份小惊喜</small><span className="progress-stars">{Array.from({ length: 10 }, (_, index) => <span key={index} className={index < popCount % 10 ? 'lit' : ''}>★</span>)}</span></span></div><div className="play-hint"><MousePointer2 size={16} /> {mode === 'bubbles' ? '戳戳泡泡' : '点点气球'} <span>或</span> <kbd>任意键</kbd><span className="hint-heart">♥</span> 怎么拍，都开心</div></>}
      </>}
    </section>
    <nav className="mode-navigation" aria-label="选择游乐场景">{modes.map(item => <button key={item.id} className={`mode-card ${mode === item.id ? 'selected' : ''}`} onClick={() => go(item.id)} style={{ '--card-color': item.color } as React.CSSProperties} aria-current={mode === item.id ? 'page' : undefined}><span className="mode-icon">{item.icon}</span><span className="mode-copy"><strong>{item.name}</strong><small>{item.sub}</small></span>{item.id === 'house' && collected.length > 0 ? <span className="animal-count">{collected.length}</span> : mode === item.id ? <span className="selected-dot" /> : <span className="mode-twinkle">✧</span>}</button>)}</nav>
    <footer className="app-footer"><span><Home size={13} /> 一个没有输赢的小小乐园</span><span>为 3–5 岁的小朋友和陪伴他们的你 <span className="footer-heart">♡</span></span></footer>
    {settingsOpen && <ParentSettings settings={settings} photos={photos} onSettings={setSettings} onPhotos={setPhotos} onClose={() => setSettingsOpen(false)} />}
  </main>;
}
