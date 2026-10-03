import { useCallback, useEffect, useRef, useState } from 'react';

type KeyboardCapture = { lock: (codes?: string[]) => Promise<void>; unlock: () => void };
type KeyboardStatus = 'off' | 'waiting' | 'active' | 'unavailable';
const storageKey = 'babyplay-child-lock';
const historyKey = '__babyplayChildLock';
export function restoreChildLock() {
  try { return sessionStorage.getItem(storageKey) === 'on'; } catch { return false; }
}
function remember(value: boolean) {
  try { if (value) sessionStorage.setItem(storageKey, 'on'); else sessionStorage.removeItem(storageKey); } catch { /* Memory-only protection remains available. */ }
}
function keyboard() { return (navigator as Navigator & { keyboard?: KeyboardCapture }).keyboard; }

/** Page protection is deliberately reversible; OS shortcuts remain under OS control. */
export default function useChildLock(onPlayKey: (event: KeyboardEvent) => void) {
  const [locked, setLocked] = useState(restoreChildLock);
  const [parentGate, setParentGate] = useState(false);
  const [needsResume, setNeedsResume] = useState(restoreChildLock);
  const [fullscreen, setFullscreen] = useState(!!document.fullscreenElement);
  const [keyboardStatus, setKeyboardStatus] = useState<KeyboardStatus>('off');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [away, setAway] = useState(false);
  const current = useRef({ locked, parentGate, onPlayKey, needsResume, busy, keyboardStatus });
  current.current = { locked, parentGate, onPlayKey, needsResume, busy, keyboardStatus };
  const attempt = useRef(0);

  const captureKeyboard = useCallback(async (request: number) => {
    const api = keyboard();
    if (!api?.lock) { setKeyboardStatus('unavailable'); return; }
    setKeyboardStatus('waiting');
    try {
      await api.lock();
      if (!current.current.locked || request !== attempt.current) { api.unlock(); return; }
      setKeyboardStatus(document.fullscreenElement ? 'active' : 'unavailable');
    } catch { if (request === attempt.current) setKeyboardStatus('unavailable'); }
  }, []);

  const enter = useCallback(async () => {
    if (busy) return;
    const request = ++attempt.current;
    current.current.locked = true;
    setLocked(true);
    remember(true);
    setBusy(true);
    setNotice('');
    setNeedsResume(false);
    setAway(false);
    try {
      if (!document.fullscreenElement) {
        if (!document.documentElement.requestFullscreen) throw new Error('unsupported');
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      }
      if (!current.current.locked || request !== attempt.current) return;
      setFullscreen(!!document.fullscreenElement);
      // Do not keep the UI busy while a browser permission prompt is open.
      void captureKeyboard(request);
    } catch {
      setNotice('当前只启用了网页内保护。浏览器未进入全屏，部分浏览器快捷键仍可能生效。');
      setKeyboardStatus('unavailable');
    } finally { if (request === attempt.current) setBusy(false); }
  }, [busy, captureKeyboard]);

  const exit = useCallback(() => {
    attempt.current++;
    current.current.locked = false;
    remember(false);
    setLocked(false);
    setParentGate(false);
    setNeedsResume(false);
    setAway(false);
    setBusy(false);
    setKeyboardStatus('off');
    keyboard()?.unlock();
    if (history.state?.[historyKey]) history.back();
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    if (!locked) return;
    document.documentElement.classList.add('child-lock-active');
    document.body.classList.add('child-lock-active');
    window.scrollTo(0, 0);
    if (!history.state?.[historyKey]) history.pushState({ ...(typeof history.state === 'object' && history.state || {}), [historyKey]: true }, '', location.href);
    const prevent = (event: Event) => { if (event.cancelable) event.preventDefault(); };
    const inGate = (target: EventTarget | null) => target instanceof Element && !!target.closest('[data-parent-gate]');
    const keydown = (event: KeyboardEvent) => {
      if (!current.current.locked) return;
      if (event.code === 'KeyU' && event.ctrlKey && event.altKey && event.shiftKey && !event.metaKey) {
        prevent(event); event.stopImmediatePropagation(); setParentGate(true); return;
      }
      // The parent form keeps normal typing and native dialog focus containment.
      if (current.current.parentGate && inGate(event.target) && !event.ctrlKey && !event.metaKey && !event.altKey && !/^F\d{1,2}$/.test(event.key)) return;
      prevent(event);
      event.stopImmediatePropagation();
      if (current.current.parentGate || current.current.needsResume || event.repeat || event.ctrlKey || event.metaKey || event.altKey || /^F\d{1,2}$/.test(event.key) || ['Escape', 'Tab', 'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'PrintScreen'].includes(event.key)) return;
      current.current.onPlayKey(event);
    };
    const keyup = (event: KeyboardEvent) => { if (!inGate(event.target)) { prevent(event); event.stopImmediatePropagation(); } };
    const wheel = (event: WheelEvent) => { if (!inGate(event.target) || event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) { prevent(event); event.stopImmediatePropagation(); } };
    const touchstart = (event: TouchEvent) => { if (event.touches.length > 1) { prevent(event); event.stopImmediatePropagation(); window.dispatchEvent(new Event('babyplay:cancel-input')); } };
    const touchmove = (event: TouchEvent) => { if (!inGate(event.target) || event.touches.length > 1) prevent(event); };
    const select = (event: Event) => { if (!inGate(event.target)) prevent(event); };
    const pointer = (event: MouseEvent) => {
      if (event.button !== 0) { prevent(event); event.stopImmediatePropagation(); }
      else setAway(false);
    };
    const beforeunload = (event: BeforeUnloadEvent) => { if (current.current.locked) { event.preventDefault(); event.returnValue = ''; } };
    const popstate = () => { if (current.current.locked && !history.state?.[historyKey]) history.forward(); };
    const fullchange = () => {
      const active = !!document.fullscreenElement;
      setFullscreen(active);
      if (!active && current.current.locked) { setKeyboardStatus('off'); setNeedsResume(true); keyboard()?.unlock(); }
    };
    const focus = () => { setAway(false); };
    const interrupted = () => { window.dispatchEvent(new Event('babyplay:cancel-input')); window.speechSynthesis?.cancel(); if (!current.current.busy && current.current.keyboardStatus !== 'waiting' && !current.current.parentGate) setNeedsResume(true); };
    const blur = () => { setAway(true); interrupted(); };
    const visible = () => { if (!document.hidden) setAway(false); else interrupted(); };
    const pageRestore = () => { setAway(false); if (current.current.locked) setNeedsResume(true); };
    const options = { capture: true, passive: false };
    window.addEventListener('keydown', keydown, true);
    window.addEventListener('keyup', keyup, true);
    window.addEventListener('wheel', wheel, options);
    window.addEventListener('touchstart', touchstart, options);
    window.addEventListener('touchmove', touchmove, options);
    for (const type of ['gesturestart', 'gesturechange', 'gestureend', 'contextmenu', 'dragstart', 'drop']) window.addEventListener(type, prevent, options);
    window.addEventListener('selectstart', select, options);
    for (const type of ['pointerdown', 'mousedown', 'mouseup', 'auxclick'] as const) window.addEventListener(type, pointer, true);
    window.addEventListener('beforeunload', beforeunload);
    window.addEventListener('popstate', popstate);
    window.addEventListener('focus', focus);
    window.addEventListener('blur', blur);
    window.addEventListener('pageshow', pageRestore);
    document.addEventListener('visibilitychange', visible);
    document.addEventListener('fullscreenchange', fullchange);
    return () => {
      document.documentElement.classList.remove('child-lock-active');
      document.body.classList.remove('child-lock-active');
      window.removeEventListener('keydown', keydown, true);
      window.removeEventListener('keyup', keyup, true);
      window.removeEventListener('wheel', wheel, true);
      window.removeEventListener('touchstart', touchstart, true);
      window.removeEventListener('touchmove', touchmove, true);
      for (const type of ['gesturestart', 'gesturechange', 'gestureend', 'contextmenu', 'dragstart', 'drop']) window.removeEventListener(type, prevent, true);
      window.removeEventListener('selectstart', select, true);
      for (const type of ['pointerdown', 'mousedown', 'mouseup', 'auxclick'] as const) window.removeEventListener(type, pointer, true);
      window.removeEventListener('beforeunload', beforeunload);
      window.removeEventListener('popstate', popstate);
      window.removeEventListener('focus', focus);
      window.removeEventListener('blur', blur);
      window.removeEventListener('pageshow', pageRestore);
      document.removeEventListener('visibilitychange', visible);
      document.removeEventListener('fullscreenchange', fullchange);
      keyboard()?.unlock();
    };
  }, [locked]);
  return { locked, parentGate, setParentGate, needsResume, fullscreen, keyboardStatus, busy, notice, enter, exit, paused: locked && (parentGate || needsResume || away) };
}
