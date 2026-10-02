import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { Check, Expand, Hand, Keyboard, LockKeyhole, ShieldCheck, X } from 'lucide-react';
import type useChildLock from './useChildLock';
type LockState = ReturnType<typeof useChildLock>;

export function LockSetup({ onStart, onClose }: { onStart: () => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} className="lock-dialog" aria-labelledby="lock-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <button className="close-button" onClick={onClose} aria-label="关闭儿童锁说明"><X size={20} /></button>
    <span className="lock-dialog-emblem"><ShieldCheck size={35} /></span>
    <span className="dialog-eyebrow">给小手一个安心的游乐场</span><h2 id="lock-title">打开儿童锁，专心玩一会儿</h2>
    <div className="lock-benefits"><p><Expand size={19} /><span><strong>全屏玩耍</strong><small>收起浏览器和家长设置，留下大大的游戏画面。</small></span></p><p><Keyboard size={19} /><span><strong>按键防误触</strong><small>普通按键继续玩，拦截网页能收到的快捷操作。</small></span></p><p><Hand size={19} /><span><strong>小手随意拍拍</strong><small>防滚动、缩放、右键和网页前后滑动。</small></span></p></div>
    <div className="lock-exit-guide"><LockKeyhole size={18} /><p>家长退出：<strong>长按右上角小锁 3 秒</strong>，再完成算式验证。</p></div>
    <p className="lock-limit">部分浏览器会询问“允许使用键盘锁定”，允许后保护更完整。系统切换应用、切换桌面等操作仍由系统控制；网页无法实现系统级全面锁定。</p>
    <button className="continue-button" onClick={onStart}><ShieldCheck size={19} /> 锁定并全屏玩</button>
    <small className="lock-keyboard-help">家长也可用 Ctrl + Alt + Shift + U 打开验证</small>
  </dialog>;
}

export function LockButton({ state }: { state: LockState }) {
  const [progress, setProgress] = useState(0);
  const frame = useRef(0);
  const pointerId = useRef<number | null>(null);
  const stop = () => { cancelAnimationFrame(frame.current); pointerId.current = null; setProgress(0); };
  useEffect(() => () => cancelAnimationFrame(frame.current), []);
  return <button className="locked-button" aria-label="长按三秒打开家长解锁" title="长按 3 秒，再完成家长验证" style={{ '--hold-progress': `${progress * 100}%` } as CSSProperties}
    onPointerDown={event => {
      if (event.button !== 0 || pointerId.current !== null) return;
      event.preventDefault();
      pointerId.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      const start = performance.now();
      const tick = () => { const value = Math.min(1, (performance.now() - start) / 3000); setProgress(value); if (value >= 1) { stop(); state.setParentGate(true); } else frame.current = requestAnimationFrame(tick); };
      frame.current = requestAnimationFrame(tick);
    }} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop} onContextMenu={event => event.preventDefault()}>
    <span className="lock-hold-ring"><LockKeyhole size={17} /></span><span><strong>{progress ? '继续按住…' : '儿童锁已开启'}</strong><small>{progress ? `${Math.ceil(3 * (1 - progress))} 秒后进行家长验证` : '长按小锁解锁'}</small></span>
  </button>;
}

export function ParentGate({ state }: { state: LockState }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [question] = useState(() => ({ a: 11 + Math.floor(Math.random() * 9), b: 6 + Math.floor(Math.random() * 9) }));
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { ref.current?.showModal(); }, []);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (Number(answer.trim()) !== question.a + question.b || !answer.trim()) { setError('答案还不对，请家长再算一遍。'); setAnswer(''); return; }
    state.exit();
  }
  return <dialog ref={ref} data-parent-gate className="lock-dialog parent-gate" aria-labelledby="parent-gate-title" onCancel={event => { event.preventDefault(); state.setParentGate(false); }}>
    <button className="close-button" aria-label="保持锁定，继续玩" onClick={() => state.setParentGate(false)}><X size={20} /></button>
    <span className="lock-dialog-emblem"><LockKeyhole size={32} /></span><span className="dialog-eyebrow">这是家长的小任务</span><h2 id="parent-gate-title">准备结束锁定了吗？</h2>
    <p className="parent-gate-subtitle">请计算下方算式，再恢复家长操作。</p>
    <form onSubmit={submit}><label className="parent-equation"><span>{question.a} + {question.b} =</span><input autoFocus type="text" inputMode="numeric" pattern="[0-9]*" maxLength={3} value={answer} aria-label="算式答案" autoComplete="off" onChange={event => { setAnswer(event.target.value.replace(/\D/g, '')); setError(''); }} /></label>
      {error && <p role="alert" className="gate-error">{error}</p>}
      <button type="submit" className="continue-button"><Check size={19} /> 验证并解除锁定</button>
    </form>
    <button className="gate-cancel" onClick={() => state.setParentGate(false)}>保持锁定，继续玩</button>
    <p className="lock-status-detail">全屏：{state.fullscreen ? '已开启' : '未开启'} · 增强按键保护：{state.keyboardStatus === 'active' ? '已开启' : state.keyboardStatus === 'waiting' ? '等待浏览器授权' : '当前不可用'}</p>
  </dialog>;
}

export function LockRecovery({ state }: { state: LockState }) {
  if (!state.needsResume || state.parentGate) return null;
  return <div className="lock-recovery" role="region" aria-label="恢复锁定游戏"><div><img src="art/bunny.webp" alt="兔兔等你回来玩" draggable="false" /><h2>兔兔还在这里等你</h2><p>儿童锁还在，点一下回到全屏乐园。</p><button className="continue-button" disabled={state.busy} onClick={() => void state.enter()}><PlayIcon /> {state.busy ? '正在回来…' : '回到全屏乐园'}</button><button className="gate-cancel" onClick={() => state.setParentGate(true)}>家长验证并退出</button></div></div>;
}
function PlayIcon() { return <Expand size={19} />; }
