let context: AudioContext | null = null;
let enabled = true;
let volume = 0.48;
let voiceEnabled = true;

export function configureAudio(sound: boolean, level: number, voice: boolean) {
  enabled = sound;
  volume = level;
  voiceEnabled = voice;
  if (!sound || !voice) window.speechSynthesis?.cancel();
}

export function wakeAudio() {
  if (!enabled) return;
  try {
    context ??= new AudioContext();
    if (context.state === 'suspended') void context.resume();
  } catch { /* Play continues when audio is unavailable. */ }
}

function tone(frequency: number, duration: number, delay = 0, kind: OscillatorType = 'sine', gain = 0.18) {
  if (!enabled) return;
  wakeAudio();
  if (!context) return;
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const envelope = context.createGain();
  oscillator.type = kind;
  oscillator.frequency.setValueAtTime(frequency, start);
  envelope.gain.setValueAtTime(0, start);
  envelope.gain.linearRampToValueAtTime(gain * volume, start + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.001, start + duration);
  oscillator.connect(envelope);
  envelope.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.025);
}

export function popSound(bubble = false) {
  if (!enabled) return;
  wakeAudio();
  if (!context) return;
  const start = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.setValueAtTime(bubble ? 800 : 240, start);
  oscillator.frequency.exponentialRampToValueAtTime(bubble ? 220 : 55, start + 0.1);
  gain.gain.setValueAtTime(0.34 * volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + 0.13);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + 0.15);
  tone(bubble ? 1046.5 : 783.99, 0.2, 0.035, 'sine', 0.08);
}

export function noteSound(index: number) {
  const notes = [261.63, 293.66, 329.63, 349.23, 392, 440, 493.88];
  tone(notes[index % notes.length], 0.58, 0, 'sine', 0.4);
  tone(notes[index % notes.length] * 2, 0.3, 0.015, 'sine', 0.06);
}

export function sparkleSound() {
  [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => tone(frequency, 0.35, index * 0.1, 'sine', 0.2));
}

export function tapSound() { tone(440, 0.13, 0, 'sine', 0.2); }

export function speak(text: string) {
  if (!enabled || !voiceEnabled || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  utterance.voice = voices.find(voice => voice.lang === 'zh-CN') ?? voices.find(voice => voice.lang.startsWith('zh')) ?? null;
  utterance.lang = 'zh-CN';
  utterance.rate = 0.85;
  utterance.pitch = 1.22;
  utterance.volume = volume;
  window.speechSynthesis.speak(utterance);
}

export function animalSound(kind: string) {
  const sounds: Record<string, string> = { rabbit: '蹦蹦，兔兔来啦！', cat: '喵，喵～', dog: '汪，汪！', panda: '你好呀，我是小熊猫！', duck: '嘎，嘎，嘎！', dinosaur: '嗷呜！', unicorn: '叮铃铃，魔法来啦！' };
  const calls: Record<string, number[]> = { rabbit: [440, 660, 880], cat: [780, 640, 820], dog: [180, 140], panda: [220, 330, 260], duck: [620, 520, 620], dinosaur: [110, 85, 65], unicorn: [523, 659, 784, 1046] };
  (calls[kind] ?? calls.rabbit).forEach((frequency, index) => tone(frequency, kind === 'dinosaur' ? 0.4 : 0.18, index * 0.19, kind === 'unicorn' ? 'sine' : 'triangle', 0.16));
  speak(sounds[kind] ?? '你好呀！');
}
