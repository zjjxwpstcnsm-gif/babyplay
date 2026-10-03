export type Mode = 'home' | 'balloons' | 'bubbles' | 'animals' | 'house' | 'peppa' | 'learning' | 'shadow';
export type PlayStyle = 'party' | 'music' | 'dream';
export type BalloonKind = 'normal' | 'animal' | 'giant' | 'rainbow' | 'music' | 'magic' | 'gift' | 'photo';
export const colors = [
  { name: '粉色', light: '#ffc5cd', middle: '#ff899f', dark: '#e76d8c' },
  { name: '橙色', light: '#ffddad', middle: '#ffb670', dark: '#ef9356' },
  { name: '黄色', light: '#fff2ad', middle: '#fbd567', dark: '#e8b73f' },
  { name: '绿色', light: '#c5f2d5', middle: '#87d7ad', dark: '#62ba91' },
  { name: '蓝色', light: '#c7edff', middle: '#89c9ef', dark: '#69acd5' },
  { name: '紫色', light: '#e6d6ff', middle: '#bea2e4', dark: '#9b7fcb' },
  { name: '红色', light: '#ffd0bb', middle: '#ff9587', dark: '#ed7669' },
];
export const animals = [
  { id: 'rabbit', name: '小兔', emoji: '🐰', color: '#ffe3e9', greeting: '蹦蹦跳跳，好开心！' },
  { id: 'cat', name: '小猫', emoji: '🐱', color: '#fff0d2', greeting: '喵～一起玩吧！' },
  { id: 'duck', name: '小鸭', emoji: '🐥', color: '#fff4bd', greeting: '嘎嘎嘎，找到你啦！' },
  { id: 'dog', name: '小狗', emoji: '🐶', color: '#f5e4d0', greeting: '汪汪！我的好朋友！' },
  { id: 'panda', name: '熊猫', emoji: '🐼', color: '#e4f4e9', greeting: '给你一个大大的抱抱！' },
  { id: 'dinosaur', name: '小恐龙', emoji: '🦕', color: '#d9f0dc', greeting: '嗷呜～我来啦！' },
  { id: 'unicorn', name: '独角兽', emoji: '🦄', color: '#eadefa', greeting: '送你一点小魔法！' },
  { id: 'george', name: '乔治', emoji: '🐷', color: '#ffdce9', greeting: '恐龙！一起跳泥坑吧！' },
];
export const modes: { id: Mode; name: string; sub: string; icon: string; color: string }[] = [
  { id: 'balloons', name: '气球乐园', sub: '拍拍，惊喜来啦', icon: '🎈', color: '#fff0ec' },
  { id: 'learning', name: '认字气球', sub: '找一样，轻轻按', icon: '🔤', color: '#fff2de' },
  { id: 'shadow', name: '动物影子', sub: '靠近大，退后小', icon: '🐾', color: '#eee9fc' },
  { id: 'bubbles', name: '泡泡浴', sub: '啵啵啵，戳个不停', icon: '🫧', color: '#ecf7fc' },
  { id: 'animals', name: '小动物乐园', sub: '听听谁在叫', icon: '🐰', color: '#f1f7e7' },
  { id: 'peppa', name: '泥坑派对', sub: '和乔治一起跳', icon: '🐷', color: '#ffedf4' },
  { id: 'house', name: '我的动物屋', sub: '好朋友都在这里', icon: '🏡', color: '#fff5dd' },
];
export type Photo = { id: string; name: string; data: string };
export type Settings = { sound: boolean; voice: boolean; music: boolean; volume: number; speed: 'slow' | 'normal'; reducedMotion: boolean };
export const defaultSettings: Settings = { sound: true, voice: true, music: true, volume: 0.48, speed: 'slow', reducedMotion: false };
export function readLocal<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(`babyplay-${key}`) ?? 'null') ?? fallback; } catch { return fallback; }
}
export function saveLocal(key: string, value: unknown): boolean {
  try { localStorage.setItem(`babyplay-${key}`, JSON.stringify(value)); return true; } catch { return false; }
}
