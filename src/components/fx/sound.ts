/**
 * 効果音（Web Audio でその場で合成。音声ファイル不要）とバイブ。
 * ブラウザの制約で、ユーザーが一度タップした後にだけ鳴る。オン/オフは端末ごとに保存。
 */
const KEY = "mq-sound";
let ctx: AudioContext | null = null;

export function isSoundOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundOn(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* 保存できない環境でも動作は続ける */
  }
}

function ac(): AudioContext | null {
  if (typeof window === "undefined" || !isSoundOn()) return null;
  try {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx ??= new C();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, opts: { type?: OscillatorType; gain?: number; slideTo?: number } = {}) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + start;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = opts.type ?? "square";
  o.frequency.setValueAtTime(freq, t);
  if (opts.slideTo) o.frequency.exponentialRampToValueAtTime(opts.slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.12, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(start: number, dur: number, gain = 0.25) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + start;
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource();
  const g = a.createGain();
  const f = a.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 1800;
  src.buffer = buf;
  g.gain.value = gain;
  src.connect(f).connect(g).connect(a.destination);
  src.start(t);
}

export function vibrate(pattern: number | number[]) {
  try {
    if (isSoundOn()) navigator.vibrate?.(pattern);
  } catch {
    /* 非対応端末は無視 */
  }
}

export const sfx = {
  /** XPカウントアップの「チッ」 */
  tick(i = 0) {
    tone(880 + (i % 8) * 60, 0, 0.04, { type: "square", gain: 0.04 });
  },
  /** 獲得 */
  coin() {
    tone(988, 0, 0.08, { type: "square", gain: 0.08 });
    tone(1319, 0.07, 0.22, { type: "square", gain: 0.08 });
  },
  /** 会心 */
  crit() {
    noise(0, 0.18, 0.35);
    tone(220, 0, 0.25, { type: "sawtooth", gain: 0.12, slideTo: 880 });
    tone(1760, 0.18, 0.25, { type: "triangle", gain: 0.1 });
    vibrate([40, 30, 80]);
  },
  /** 自己ベスト */
  pr() {
    [784, 988, 1175, 1568].forEach((f, i) => tone(f, i * 0.07, 0.18, { type: "triangle", gain: 0.11 }));
    vibrate([30, 40, 30]);
  },
  /** レベルアップのファンファーレ */
  levelUp() {
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    notes.forEach((f, i) => tone(f, i * 0.09, i === notes.length - 1 ? 0.6 : 0.12, { type: "square", gain: 0.1 }));
    tone(131, 0, 0.9, { type: "triangle", gain: 0.15 });
    vibrate([60, 40, 60, 40, 160]);
  },
  /** 打撃 */
  hit(power = 1, crit = false) {
    noise(0, 0.08 + 0.05 * power, 0.25 + 0.15 * power);
    tone(crit ? 180 : 140, 0, 0.12, { type: "sawtooth", gain: 0.12, slideTo: 50 });
    if (crit) tone(1400, 0.02, 0.15, { type: "triangle", gain: 0.1 });
    vibrate(crit ? [50, 20, 50] : 25);
  },
  /** 攻撃が効かない */
  block() {
    tone(300, 0, 0.12, { type: "square", gain: 0.06, slideTo: 200 });
  },
  /** ボス撃破 */
  victory() {
    noise(0, 0.5, 0.4);
    const notes = [392, 523, 659, 784, 659, 784, 1047];
    notes.forEach((f, i) => tone(f, 0.25 + i * 0.1, i === notes.length - 1 ? 0.8 : 0.14, { type: "square", gain: 0.1 }));
    vibrate([100, 50, 100, 50, 300]);
  },
  /** 宝箱 */
  chest() {
    tone(220, 0, 0.1, { type: "square", gain: 0.08 });
    tone(330, 0.1, 0.1, { type: "square", gain: 0.08 });
    [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.25 + i * 0.06, 0.3, { type: "triangle", gain: 0.09 }));
    vibrate([30, 30, 30, 30, 120]);
  },
  /** ボタンの軽い音 */
  tap() {
    tone(1200, 0, 0.03, { type: "triangle", gain: 0.05 });
  },
};
