import { useEffect, useRef } from 'react';
import { ambientNote } from './audio';
export default function useSoundscape(enabled: boolean, paused: boolean, underwater: boolean) {
  const unlocked = useRef(false);
  useEffect(() => { const wake = () => { unlocked.current = true; }; window.addEventListener('pointerdown', wake, { once: true }); window.addEventListener('keydown', wake, { once: true }); return () => { window.removeEventListener('pointerdown', wake); window.removeEventListener('keydown', wake); }; }, []);
  useEffect(() => {
    if (!enabled || paused) return;
    let step = 0;
    const timer = setInterval(() => { if (unlocked.current && !document.hidden) ambientNote(step++, underwater); }, 1350);
    return () => clearInterval(timer);
  }, [enabled, paused, underwater]);
}
