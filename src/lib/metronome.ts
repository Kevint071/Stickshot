import type { PracticeSound, SoundKit } from "@/db/schema";
import { type Step, type Stroke, stepAt } from "@/lib/pattern";
import { SnareVoice } from "@/lib/snare";

/**
 * Metrónomo con Web Audio. Los clics se programan con antelación sobre el reloj
 * del audio (no con setInterval directo), así el pulso no se desfasa aunque el
 * hilo principal esté ocupado. Solo funciona en el navegador.
 *
 * Con un patrón, el mismo reloj toca también la caja: cada nota de la
 * subdivisión es un paso del patrón. Un solo planificador evita desfases.
 */

export type Tick = {
  /** Nota desde que arrancó (0, 1, 2…): con un patrón, su paso es index % largo. */
  index: number;
  /** Momento del clic en el reloj de AudioContext (segundos). */
  time: number;
  /** Pulso total desde que arrancó (0, 1, 2…). */
  beat: number;
  /** Posición dentro del compás (0 = acento). */
  beatInBar: number;
  /** Nota dentro del pulso (0 = el propio pulso). */
  sub: number;
};

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_S = 0.12;

export class Metronome {
  bpm = 120;
  notesPerBeat = 4;
  beatsPerBar = 4;
  subdivisionAudible = true;
  volume = 0.9;
  /** Pasos del patrón, ya en espejo según la mano inicial. */
  pattern: Step[] | undefined;
  /** Qué suena: el clic, la caja con el patrón o ambos. Sin patrón, siempre el clic. */
  sound: PracticeSound = "click";
  kit: SoundKit = "acoustic";
  /** Volumen de la ghost note en % del acento. */
  ghostVolume = 20;

  private ctx: AudioContext | undefined;
  private snare: SnareVoice | undefined;
  private timer: ReturnType<typeof setInterval> | undefined;
  private nextTime = 0;
  private tick = 0;
  private startedAt = 0;
  private queue: Tick[] = [];

  get playing() {
    return this.timer !== undefined;
  }

  /** Reloj del audio, o 0 si aún no se ha creado. */
  now() {
    return this.ctx?.currentTime ?? 0;
  }

  /** Segundos desde que arrancó la serie actual. */
  elapsed() {
    return this.playing ? Math.max(0, this.now() - this.startedAt) : 0;
  }

  private async audio() {
    this.ctx ??= new AudioContext({ latencyHint: "interactive" });
    if (this.ctx.state === "suspended") await this.ctx.resume();
    this.snare ??= new SnareVoice(this.ctx);
    return this.ctx;
  }

  async start() {
    if (this.playing) return;
    await this.audio();
    if (!this.ctx) return;
    this.tick = 0;
    this.queue = [];
    this.nextTime = this.ctx.currentTime + 0.08;
    this.startedAt = this.nextTime;
    this.schedule();
    this.timer = setInterval(() => this.schedule(), LOOKAHEAD_MS);
  }

  /** Para y devuelve los segundos que duró la serie. */
  stop() {
    const seconds = this.elapsed();
    clearInterval(this.timer);
    this.timer = undefined;
    this.queue = [];
    return seconds;
  }

  /** Último clic que ya ha sonado (para sincronizar la parte visual). */
  current(): Tick | undefined {
    const now = this.now();
    while (this.queue.length > 1 && this.queue[1].time <= now) {
      this.queue.shift();
    }
    const head = this.queue[0];
    return head && head.time <= now ? head : undefined;
  }

  /** Toca un golpe suelto ahora (y otro detrás) para oír cómo suena. */
  async preview(stroke: Stroke) {
    const ctx = await this.audio();
    const t = ctx.currentTime + 0.03;
    for (const at of [t, t + 0.3])
      this.snare?.hit(at, stroke, this.snareOptions());
  }

  close() {
    this.stop();
    void this.ctx?.close();
    this.ctx = undefined;
    this.snare = undefined;
  }

  private snareOptions() {
    return {
      kit: this.kit,
      ghostVolume: this.ghostVolume,
      stepSeconds: 60 / this.bpm / Math.max(1, this.notesPerBeat),
    };
  }

  private schedule() {
    const ctx = this.ctx;
    if (!ctx) return;
    while (this.nextTime < ctx.currentTime + SCHEDULE_AHEAD_S) {
      const notes = Math.max(1, this.notesPerBeat);
      const sub = this.tick % notes;
      const beat = Math.floor(this.tick / notes);
      const tick: Tick = {
        index: this.tick,
        time: this.nextTime,
        beat,
        beatInBar: beat % this.beatsPerBar,
        sub,
      };
      const pattern = this.pattern?.length ? this.pattern : undefined;
      const clicks = !pattern || this.sound !== "pattern";
      if (clicks && (sub === 0 || this.subdivisionAudible))
        this.click(ctx, tick);
      if (pattern && this.sound !== "click") {
        const step = pattern[stepAt(this.tick, pattern.length)];
        if (step) this.snare?.hit(tick.time, step, this.snareOptions());
      }
      this.queue.push(tick);
      this.nextTime += 60 / this.bpm / notes;
      this.tick += 1;
    }
  }

  private click(ctx: AudioContext, { time, beatInBar, sub }: Tick) {
    const accent = sub === 0 && beatInBar === 0;
    const onBeat = sub === 0;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = onBeat ? "square" : "sine";
    osc.frequency.value = accent ? 1760 : onBeat ? 1320 : 990;
    const peak = this.volume * (accent ? 0.5 : onBeat ? 0.32 : 0.14);
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(peak, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);
    osc.connect(gain).connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.06);
  }
}

/** Tempo a partir de los últimos toques (media de hasta 4 intervalos). */
export function tapTempo(taps: number[]) {
  const recent = taps.slice(-5);
  if (recent.length < 2) return undefined;
  const intervals = recent.slice(1).map((t, i) => t - recent[i]);
  const average = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  return Math.round(60000 / average);
}
