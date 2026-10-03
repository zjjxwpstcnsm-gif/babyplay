import { useEffect, useRef } from 'react';
import { modes } from './data';
import type { Mode } from './data';

type ModelContext = { registerTool: (tool: { name: string; title: string; description: string; inputSchema: object; annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }; execute: (input: unknown) => unknown }, options: { signal: AbortSignal }) => void | Promise<void> };
type PlaygroundState = { mode: Mode; collected: string[]; pops: number; paused: boolean; childLocked: boolean };
export default function usePlaygroundTools(state: PlaygroundState, navigate: (mode: Mode) => void, pop: () => void) {
  const latest = useRef({ state, navigate, pop });
  latest.current = { state, navigate, pop };
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: Parameters<ModelContext['registerTool']>[0]) => {
      try { void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch { /* Unsupported tool registries do not affect play. */ }
    };
    register({ name: 'get_playground_state', title: '查看乐园状态', description: 'Read the current scene, pop count, and collected animal IDs. Does not return personal photos.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute: () => ({ ...latest.current.state }) });
    register({ name: 'switch_playground_scene', title: '切换乐园场景', description: 'Navigate to the home, balloons, bubbles, animals, house, peppa, learning, or shadow scene using the visible scene controls.', inputSchema: { type: 'object', properties: { scene: { type: 'string', enum: ['home', ...modes.map(item => item.id)] } }, required: ['scene'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: async (input: unknown) => {
      const scene = (input as { scene?: Mode } | null)?.scene;
      if (!scene || !['home', ...modes.map(item => item.id)].includes(scene)) throw new Error('请选择有效场景。');
      if (latest.current.state.paused) throw new Error('请先关闭家长弹窗，或恢复全屏游戏。');
      if (latest.current.state.childLocked && scene === 'home') throw new Error('儿童锁开启时，请在游乐场景之间切换。');
      latest.current.navigate(scene);
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      return { scene: latest.current.state.mode };
    } });
    register({ name: 'tap_playground_balloons', title: '拍拍气球', description: 'Tap visible balloons or bubbles 1 to 10 times using the same action as the keyboard. Giant balloons need multiple taps.', inputSchema: { type: 'object', properties: { taps: { type: 'integer', minimum: 1, maximum: 10 } }, required: ['taps'], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: async (input: unknown) => {
      const taps = (input as { taps?: number } | null)?.taps;
      if (!Number.isInteger(taps) || taps! < 1 || taps! > 10) throw new Error('拍击次数应为 1 到 10 的整数。');
      if (latest.current.state.paused || !['home', 'balloons', 'bubbles'].includes(latest.current.state.mode)) throw new Error('请先进入气球或泡泡场景。');
      const before = latest.current.state.pops;
      for (let i = 0; i < taps!; i++) { latest.current.pop(); await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); }
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      return { taps, popped: latest.current.state.pops - before, scene: latest.current.state.mode };
    } });
    return () => lifecycle.abort();
  }, []);
}
