import { useCallback, useEffect, useRef, useState } from 'react';
import type { FaceDetector, ImageSegmenter } from '@mediapipe/tasks-vision';
import { Camera, CameraOff, MoveHorizontal, ScanFace, PersonStanding, PawPrint } from 'lucide-react';
import ShadowAnimal, { shadowAnimals } from './ShadowAnimal';
import type { ShadowAnimalId } from './ShadowAnimal';
import { shadowFromFace } from './shadowMath';
import { paintPersonMask } from './personShadow';
import { speak, wakeAudio } from './audio';

type CameraStatus = 'off' | 'loading' | 'on' | 'error';
type ShadowMode = 'animal' | 'person';
type Props = { paused: boolean; reducedMotion: boolean; onReady: (action: () => void) => void };
export default function ShadowPlay({ paused, reducedMotion, onReady }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const personCanvas = useRef<HTMLCanvasElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const detector = useRef<FaceDetector | null>(null);
  const segmenter = useRef<ImageSegmenter | null>(null);
  const frame = useRef(0);
  const generation = useRef(0);
  const active = useRef(false);
  const baseline = useRef(.22);
  const faceRatio = useRef(0);
  const [cameraSession, setCameraSession] = useState<{ id: number; surface: HTMLVideoElement } | null>(null);
  const [shadowMode, setShadowMode] = useState<ShadowMode>('animal');
  const [animal, setAnimal] = useState<ShadowAnimalId>('rabbit');
  const [status, setStatus] = useState<CameraStatus>('off');
  const [error, setError] = useState('');
  const [tracking, setTracking] = useState(false);
  const [demo, setDemo] = useState(false);
  const [demoSize, setDemoSize] = useState(1);
  const [pose, setPose] = useState({ scale: 1, x: 0 });
  const clearPerson = useCallback(() => {
    const canvas = personCanvas.current;
    if (canvas) {
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
      canvas.dataset.foreground = '0';
    }
  }, []);
  const release = useCallback(() => {
    generation.current++;
    active.current = false;
    cancelAnimationFrame(frame.current);
    stream.current?.getTracks().forEach(track => track.stop()); stream.current = null;
    detector.current?.close(); detector.current = null;
    segmenter.current?.close(); segmenter.current = null;
    if (video.current) video.current.srcObject = null;
    faceRatio.current = 0;
    clearPerson();
  }, [clearPerson]);
  const stop = useCallback(() => { release(); setCameraSession(null); setStatus('off'); setTracking(false); }, [release]);
  useEffect(() => {
    onReady(() => {});
    window.addEventListener('pagehide', stop);
    return () => { window.removeEventListener('pagehide', stop); release(); };
  }, [onReady, release, stop]);
  useEffect(() => { if (paused) stop(); }, [paused, stop]);

  // Camera lifetime is independent of the selected recognition model. Switching
  // modes closes the previous model while preserving the user's camera stream.
  useEffect(() => {
    if (!cameraSession) return;
    const { id: request, surface } = cameraSession;
    let cancelled = false;
    let animationFrame = 0;
    let faceModel: FaceDetector | null = null;
    let personModel: ImageSegmenter | null = null;
    const valid = () => !cancelled && request === generation.current;
    setStatus('loading'); setTracking(false); setError('');
    clearPerson();
    const initialize = async () => {
      try {
        const { FaceDetector, ImageSegmenter, FilesetResolver } = await import('@mediapipe/tasks-vision');
        const assets = new URL(`${import.meta.env.BASE_URL}vision/`, document.baseURI).href;
        const files = await FilesetResolver.forVisionTasks(`${assets}wasm`);
        if (!valid()) return;
        if (shadowMode === 'person') {
          const model = await ImageSegmenter.createFromOptions(files, {
            baseOptions: { modelAssetPath: `${assets}selfie_segmenter.tflite`, delegate: 'CPU' },
            runningMode: 'VIDEO', outputCategoryMask: false, outputConfidenceMasks: true,
          });
          if (!valid()) { model.close(); return; }
          personModel = model; segmenter.current = model;
        } else {
          const model = await FaceDetector.createFromOptions(files, {
            baseOptions: { modelAssetPath: `${assets}blaze_face_short_range.tflite`, delegate: 'CPU' },
            runningMode: 'VIDEO', minDetectionConfidence: .55,
          });
          if (!valid()) { model.close(); return; }
          faceModel = model; detector.current = model;
        }
        setStatus('on');
        speak(shadowMode === 'person' ? '挥挥手，动一动，看看你的影子！' : '向前走，影子变大。向后走，影子变小！');
        const input = document.createElement('canvas');
        input.width = 320;
        input.height = Math.round(320 * surface.videoHeight / surface.videoWidth);
        const inputContext = input.getContext('2d');
        let image: ImageData | null = null;
        let lastDetection = 0;
        let lastVideoTime = -1;
        const detect = (now: number) => {
          if (!valid()) return;
          // Smaller input frames and bounded inference rates keep play responsive.
          const interval = shadowMode === 'person' ? 66 : 125;
          if (now - lastDetection >= interval && surface.readyState >= 2 && surface.currentTime !== lastVideoTime) {
            lastDetection = now; lastVideoTime = surface.currentTime;
            try {
              if (personModel) {
                const canvas = personCanvas.current;
                const context = canvas?.getContext('2d');
                if (!canvas || !context || !inputContext) throw new Error('Canvas unavailable');
                inputContext.drawImage(surface, 0, 0, input.width, input.height);
                personModel.segmentForVideo(input, now, result => {
                  const mask = result.confidenceMasks?.[0];
                  if (!mask) throw new Error('Person mask unavailable');
                  if (!image || image.width !== mask.width || image.height !== mask.height) {
                    canvas.width = mask.width; canvas.height = mask.height;
                    image = context.createImageData(mask.width, mask.height);
                  }
                  const foreground = paintPersonMask(mask.getAsFloat32Array(), image.data);
                  const found = foreground > .002;
                  if (found) context.putImageData(image, 0, 0);
                  else context.clearRect(0, 0, canvas.width, canvas.height);
                  canvas.dataset.foreground = found ? foreground.toFixed(4) : '0';
                  canvas.dataset.frame = String(now);
                  setTracking(found);
                  // The callback owns the masks; nothing is retained after it returns.
                });
              } else if (faceModel) {
                const faces = faceModel.detectForVideo(surface, now).detections;
                const box = faces.map(face => face.boundingBox).filter(box => box !== undefined).sort((a, b) => b.width - a.width)[0];
                setTracking(!!box);
                if (box) {
                  const next = shadowFromFace(box, surface.videoWidth, baseline.current);
                  faceRatio.current = next.ratio;
                  setPose(previous => ({ scale: previous.scale + (next.scale - previous.scale) * .25, x: previous.x + (next.x - previous.x) * .25 }));
                } else faceRatio.current = 0;
              }
            } catch {
              stop(); setError('识别暂时中断，请重新开启摄像头。'); setStatus('error'); return;
            }
          }
          animationFrame = requestAnimationFrame(detect);
          frame.current = animationFrame;
        };
        animationFrame = requestAnimationFrame(detect);
        frame.current = animationFrame;
      } catch {
        if (!valid()) return;
        stop(); setError('识别模型未能启动，请检查连接后重新开启摄像头。'); setStatus('error');
      }
    };
    void initialize();
    return () => {
      cancelled = true;
      cancelAnimationFrame(animationFrame);
      if (faceModel && detector.current === faceModel) { faceModel.close(); detector.current = null; }
      if (personModel && segmenter.current === personModel) { personModel.close(); segmenter.current = null; }
      clearPerson();
    };
  }, [cameraSession, shadowMode, clearPerson, stop]);

  async function start() {
    if (paused || active.current) return;
    release();
    active.current = true;
    const request = generation.current;
    setDemo(false); setError(''); setStatus('loading'); setTracking(false);
    baseline.current = .22;
    setPose({ scale: 1, x: 0 });
    wakeAudio();
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('请使用 HTTPS 网站或本机 localhost 打开，再开启摄像头。');
      const camera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false });
      if (request !== generation.current) { camera.getTracks().forEach(track => track.stop()); return; }
      stream.current = camera;
      camera.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (request === generation.current) { stop(); setError('摄像头已断开，请重新开启。'); setStatus('error'); }
      }, { once: true });
      const surface = video.current;
      if (!surface) { stop(); return; }
      surface.srcObject = camera;
      await surface.play();
      if (request !== generation.current) return;
      setCameraSession({ id: request, surface });
    } catch (cause) {
      if (request !== generation.current) return;
      stop(); setStatus('error');
      const name = cause instanceof Error ? cause.name : '';
      setError(name === 'NotAllowedError' ? '摄像头未获允许。请在浏览器地址栏允许摄像头后重试。' : name === 'NotFoundError' ? '没有找到摄像头，连接摄像头后重试。' : name === 'NotReadableError' ? '摄像头可能正被其他应用使用，请关闭其他摄像头应用后重试。' : cause instanceof Error && cause.message.startsWith('请使用') ? cause.message : '摄像头未能启动，请检查连接后重试。');
    }
  }
  const changeMode = (next: ShadowMode) => {
    if (paused || shadowMode === next) return;
    wakeAudio(); setDemo(false); setTracking(false); setShadowMode(next); setError('');
    if (!active.current) setStatus('off');
  };
  const person = shadowMode === 'person';
  const currentAnimal = shadowAnimals.find(item => item.id === animal)!;
  const shown = demo ? { scale: demoSize, x: 0 } : pose;
  const busy = status === 'loading';
  return <div className={`shadow-game ${person ? 'shadow-person-mode' : ''} ${reducedMotion ? 'shadow-still' : ''}`}>
    <div className="shadow-mode-switch" role="group" aria-label="选择影子模式">
      <button disabled={paused} aria-pressed={!person} onClick={() => changeMode('animal')}><PawPrint size={18} />小动物影子</button>
      <button disabled={paused} aria-pressed={person} onClick={() => changeMode('person')}><PersonStanding size={18} />真人影子</button>
    </div>
    <div className="shadow-theater">
      <div className="shadow-light" />
      <div className="shadow-size-hint"><span>← 退后，小小的</span><span>靠近，大大的 →</span></div>
      {person ? <>
        <canvas ref={personCanvas} className="person-shadow-canvas" width="320" height="240" role="img" aria-label="摄像头前人物的实时镜像轮廓影子" data-foreground="0" />
        {!tracking && <div className="person-shadow-placeholder"><PersonStanding size={58} /><span>{busy ? '正在准备你的影子…' : status === 'on' ? '站到镜头前，让影子找到你' : '开启摄像头，看看自己的影子'}</span></div>}
      </> : <div className="shadow-animal-wrap" data-scale={shown.scale.toFixed(3)} data-animal={animal} style={{ transform: `translateX(${shown.x}%) scale(${shown.scale})` }}><ShadowAnimal animal={animal} /></div>}
      <div className="shadow-floor" />
      <p className="shadow-caption" role="status">{person ? status === 'on' ? tracking ? '挥挥手、转转身，影子跟着你一起动' : '让身体进入画面，光线亮一点更清楚' : busy ? '正在准备摄像头和你的影子…' : '你的动作，就是影子的动作' : demo ? '大小体验 · 开启摄像头，就能跟着你变化' : status === 'on' ? tracking ? `你动一动，${currentAnimal.name}也动一动` : '面向摄像头，让小动物找到你呀' : busy ? '正在准备摄像头和小动物…' : '和小动物一起，玩大大和小小'}</p>
    </div>
    <div className="shadow-panel">
      <div className="shadow-camera-preview"><video ref={video} autoPlay playsInline muted aria-label="本地摄像头镜像画面" /><span>{status === 'on' ? <><i /> 摄像头已开启</> : busy ? '请允许摄像头 · 正在准备' : <><Camera size={28} />{person ? '让影子看见你' : '让小动物看见你'}</>}</span></div>
      <button className={`camera-button ${status === 'on' || busy ? 'camera-stop' : ''}`} disabled={paused} onClick={() => status === 'on' || busy ? stop() : void start()}>{status === 'on' || busy ? <CameraOff size={19} /> : <Camera size={19} />}{status === 'on' ? '关闭摄像头' : busy ? '取消开启' : '开启摄像头'}</button>
      {status === 'error' && <p className="camera-error" role="alert">{error}</p>}
      <p className="camera-instructions">{person ? <>让身体和双手进入画面。<br />挥挥手，影子也挥挥手！</> : <>脸朝向镜头，慢慢靠近或退后。<br />请家长陪同，留出活动空间。</>}</p>
      {!person && <>
        <button className="calibrate-button" disabled={paused || status !== 'on' || !tracking} onClick={() => { if (faceRatio.current > 0) { baseline.current = faceRatio.current; setPose(previous => ({ ...previous, scale: 1 })); } }}><ScanFace size={17} /> 把现在的距离设为中等</button>
        <button className="demo-toggle" disabled={paused} aria-pressed={demo} onClick={() => { stop(); setDemo(value => !value); }}><MoveHorizontal size={17} /> {demo ? '结束大小体验' : '先体验大小'}</button>
        {demo && <label className="shadow-demo-slider">远一点<input aria-label="体验影子大小" type="range" min="0.45" max="1.7" step="0.01" value={demoSize} disabled={paused} onChange={event => setDemoSize(Number(event.target.value))} />近一点</label>}
      </>}
      <small className="camera-privacy">画面仅在本机处理，不拍照、不保存、不上传。离开场景或暂停时关闭摄像头。</small>
    </div>
    {person ? <div className="person-shadow-tip"><PersonStanding size={20} />真实轮廓，像镜子一样跟着你 · 请家长陪同，留出活动空间</div> : <div className="shadow-animal-picker" role="group" aria-label="选择影子小动物">{shadowAnimals.map(item => <button key={item.id} aria-pressed={animal === item.id} disabled={paused} onClick={() => { wakeAudio(); setAnimal(item.id); speak(`${item.name}来啦！`); }}><span>{item.emoji}</span>{item.name}</button>)}</div>}
  </div>;
}
