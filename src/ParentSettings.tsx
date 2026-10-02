import { useEffect, useRef, useState } from 'react';
import { Camera, Check, Heart, Plus, Settings2, ShieldCheck, Trash2, Volume2, X } from 'lucide-react';
import { saveLocal } from './data';
import type { Photo, Settings } from './data';

type Props = { settings: Settings; photos: Photo[]; onSettings: (value: Settings) => void; onPhotos: (value: Photo[]) => void; onClose: () => void; onLock: () => void };
function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return <button className={`toggle ${checked ? 'on' : ''}`} role="switch" aria-checked={checked} aria-label={label} onClick={onChange}><span /></button>;
}

export default function ParentSettings({ settings, photos, onSettings, onPhotos, onClose, onLock }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('宝宝');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  function change<K extends keyof Settings>(key: K, value: Settings[K]) { onSettings({ ...settings, [key]: value }); }
  async function addPhoto(file?: File) {
    if (!file) return;
    setMessage('');
    if (photos.length >= 6) { setMessage('最多放 6 位好朋友，先移除一张照片再添加吧。'); return; }
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) { setMessage('请选择 JPG、PNG、WebP 或 GIF 图片。'); return; }
    if (file.size > 10 * 1024 * 1024) { setMessage('这张照片有点大，请选择 10 MB 以内的照片。'); return; }
    setBusy(true);
    try {
      const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result as string); reader.onerror = reject; reader.readAsDataURL(file); });
      const image = await new Promise<HTMLImageElement>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = data; });
      const surface = document.createElement('canvas');
      surface.width = surface.height = 256;
      const context = surface.getContext('2d');
      if (!context) throw new Error('图片处理不可用');
      const size = Math.min(image.width, image.height);
      context.drawImage(image, (image.width - size) / 2, (image.height - size) / 2, size, size, 0, 0, 256, 256);
      const next = [...photos, { id: crypto.randomUUID(), name: name.trim().slice(0, 8) || '宝宝', data: surface.toDataURL('image/jpeg', 0.85) }];
      if (!saveLocal('photos', next)) { setMessage('浏览器暂时无法保存照片，请检查可用储存空间。'); return; }
      onPhotos(next);
      setMessage('加好啦！这张照片会出现在气球里。');
    } catch { setMessage('这张照片没能打开，换一张试试吧。'); }
    finally { setBusy(false); if (fileInput.current) fileInput.current.value = ''; }
  }
  function removePhoto(id: string) {
    const next = photos.filter(item => item.id !== id);
    if (!saveLocal('photos', next)) { setMessage('照片暂时无法移除，请稍后再试。'); return; }
    onPhotos(next);
    setMessage('照片已从这个浏览器移除。');
  }
  return <dialog ref={dialog} className="settings-dialog" aria-labelledby="settings-title" onCancel={event => { event.preventDefault(); onClose(); }} onClick={event => { if (event.target === dialog.current) onClose(); }}>
    <div className="dialog-header"><span className="dialog-icon"><Settings2 size={23} /></span><div><h2 id="settings-title">家长的小角落</h2><p>把乐园调成宝宝喜欢的样子</p></div><button className="close-button" aria-label="关闭家长设置" onClick={onClose}><X size={21} /></button></div>
    <button className="settings-lock-card" onClick={onLock}><ShieldCheck size={25} /><span><strong>开启儿童锁</strong><small>全屏、按键和触控板防误触 · 家长验证解锁</small></span><span>→</span></button>
    <section className="settings-section"><h3><Volume2 size={17} /> 声音与节奏</h3>
      <div className="setting-row"><div><strong>开心音效</strong><small>气球的啪、泡泡的啵和音乐声</small></div><Toggle checked={settings.sound} label="开心音效" onChange={() => change('sound', !settings.sound)} /></div>
      <div className="setting-row"><div><strong>语音小伙伴</strong><small>动物叫声和中文惊喜提示</small></div><Toggle checked={settings.voice} label="语音小伙伴" onChange={() => change('voice', !settings.voice)} /></div>
      <label className="setting-row volume-row"><strong>音量</strong><input type="range" min="0" max="1" step="0.05" value={settings.volume} aria-label="音量" onChange={event => change('volume', Number(event.target.value))} /><span>{Math.round(settings.volume * 100)}%</span></label>
      <div className="setting-row"><div><strong>气球飘动速度</strong><small>慢一点，给小手更多时间</small></div><div className="speed-options" role="group" aria-label="气球飘动速度"><button className={settings.speed === 'slow' ? 'active' : ''} aria-pressed={settings.speed === 'slow'} onClick={() => change('speed', 'slow')}>慢悠悠</button><button className={settings.speed === 'normal' ? 'active' : ''} aria-pressed={settings.speed === 'normal'} onClick={() => change('speed', 'normal')}>活泼一点</button></div></div>
      <div className="setting-row"><div><strong>安静的动画</strong><small>让气球停住，彩纸少一点</small></div><Toggle checked={settings.reducedMotion} label="安静的动画" onChange={() => change('reducedMotion', !settings.reducedMotion)} /></div>
    </section>
    <section className="settings-section photo-section"><h3><Camera size={18} /> 熟悉的人，也变成气球</h3><p className="section-description">放入宝宝、家人或喜欢的玩偶照片，拍拍就能找到他们。</p>
      {photos.length > 0 && <div className="photo-list">{photos.map(photo => <div className="photo-friend" key={photo.id}><img src={photo.data} alt={photo.name} /><span>{photo.name}</span><button aria-label={`移除${photo.name}的照片`} onClick={() => removePhoto(photo.id)}><Trash2 size={13} /></button></div>)}</div>}
      <div className="add-photo-row"><label>怎么称呼？<input type="text" value={name} maxLength={8} aria-label="照片里的人怎么称呼" placeholder="宝宝、妈妈、爸爸…" onChange={event => setName(event.target.value)} /></label><button className="add-photo-button" disabled={busy || photos.length >= 6} onClick={() => fileInput.current?.click()}><Plus size={17} />{busy ? '正在准备…' : '添加照片'}</button><input ref={fileInput} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,image/gif" aria-label="选择照片" onChange={event => void addPhoto(event.target.files?.[0])} /></div>
      <div className="photo-privacy"><Heart size={13} /> 照片仅保存在此浏览器，最多 6 张，不会上传。</div>
      {message && <p className="settings-message" role="status">{message}</p>}
    </section>
    <button className="continue-button" onClick={onClose}><Check size={19} /> 好啦，继续玩</button>
  </dialog>;
}
