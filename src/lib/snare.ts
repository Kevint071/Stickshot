import type { SoundKit } from "@/db/schema";
import type { Dynamic, Stroke } from "@/lib/pattern";

/*
 * Caja sintetizada con Web Audio. Cada golpe mezcla el cuerpo del parche
 * (senoidales que bajan de tono), el bordonero (ruido filtrado) y, en el
 * acento, el chasquido del aro. La fuerza cambia volumen y timbre: el oído
 * distingue mejor brillo y duración que pequeñas diferencias de volumen.
 */

type Hit = (time: number, level: number, bright: number, pan: number) => void;

/** Nivel del acento y del golpe normal; la ghost la decide el usuario. */
const LEVEL: Record<Exclude<Dynamic, "ghost">, number> = {
  accent: 1,
  normal: 0.55,
};
/** Nivel mínimo de las notas de gracia de flam y drag. */
const GRACE_MIN = 0.2;
const FLAM_GAP = 0.025;
const DRAG_GAPS = [0.045, 0.022];
const BUZZ_BOUNCES = 6;
/** Separación de manos en el estéreo, muy leve. */
const PAN = 0.15;

export type SnareOptions = {
  kit: SoundKit;
  /** Volumen de la ghost en % del acento. */
  ghostVolume: number;
  /** Duración del paso en segundos, para repartir el buzz. */
  stepSeconds: number;
};

export class SnareVoice {
  private readonly master: DynamicsCompressorNode;
  private readonly room: ConvolverNode;
  private readonly noise: AudioBuffer;
  private readonly kits: Record<SoundKit, Hit>;

  constructor(
    private readonly ctx: AudioContext,
    destination: AudioNode = ctx.destination,
  ) {
    this.master = ctx.createDynamicsCompressor();
    this.master.threshold.value = -10;
    this.master.ratio.value = 4;
    this.master.knee.value = 6;
    const out = ctx.createGain();
    out.gain.value = 0.9;
    this.master.connect(out).connect(destination);

    this.noise = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;

    // Sala corta: un impulso de ruido que decae quita el sonido "de plástico".
    this.room = ctx.createConvolver();
    const length = ctx.sampleRate * 0.5;
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let c = 0; c < 2; c += 1) {
      const channel = impulse.getChannelData(c);
      for (let i = 0; i < length; i += 1)
        channel[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3.5;
    }
    this.room.buffer = impulse;
    this.room.connect(this.master);

    this.kits = {
      // Madera y parche, bordonero suelto y algo de sala.
      acoustic: (t, v, bright, pan) => {
        this.mode(t, pan, {
          freq: 190,
          level: 0.55 * v,
          decay: 0.09 + 0.05 * v,
          room: 0.25,
        });
        this.mode(t, pan, {
          freq: 330,
          level: 0.3 * v,
          decay: 0.06 + 0.03 * v,
          room: 0.25,
        });
        this.burst(t, pan, {
          level: 0.6 * v,
          decay: 0.1 + 0.14 * v,
          bp: 4500,
          q: 0.6,
          hp: 1500,
          room: 0.35,
        });
        if (bright > 0)
          this.burst(t, pan, {
            level: 0.5 * v * bright,
            decay: 0.008,
            hp: 5000,
          });
      },
      // Goma seca, sin bordonero ni eco.
      pad: (t, v, bright, pan) => {
        this.burst(t, pan, {
          level: 0.9 * v,
          decay: 0.035 + 0.015 * v,
          bp: 1400,
          q: 1.2,
        });
        this.mode(t, pan, {
          freq: 520,
          drop: 0.7,
          level: 0.35 * v,
          decay: 0.03,
        });
        if (bright > 0)
          this.burst(t, pan, {
            level: 0.35 * v * bright,
            decay: 0.006,
            hp: 3500,
          });
      },
      // Afinación alta y tensa, golpe seco y cortante.
      marching: (t, v, bright, pan) => {
        this.mode(t, pan, {
          freq: 340,
          level: 0.45 * v,
          decay: 0.05 + 0.02 * v,
          room: 0.1,
        });
        this.mode(t, pan, {
          freq: 560,
          level: 0.25 * v,
          decay: 0.035,
          room: 0.1,
        });
        this.burst(t, pan, {
          level: 0.7 * v,
          decay: 0.06 + 0.06 * v,
          bp: 6000,
          q: 0.7,
          hp: 2500,
          room: 0.15,
        });
        if (bright > 0) {
          this.burst(t, pan, {
            level: 0.8 * v * bright,
            decay: 0.01,
            hp: 4500,
          });
          this.mode(t, pan, {
            freq: 2100,
            drop: 0.9,
            level: 0.15 * bright,
            decay: 0.02,
            type: "square",
          });
        }
      },
      // Afinación baja, más cuerpo y menos agudos.
      deep: (t, v, bright, pan) => {
        this.mode(t, pan, {
          freq: 150,
          drop: 0.8,
          level: 0.75 * v,
          decay: 0.14 + 0.06 * v,
          room: 0.3,
        });
        this.mode(t, pan, {
          freq: 245,
          level: 0.3 * v,
          decay: 0.08,
          room: 0.3,
        });
        this.burst(t, pan, {
          level: 0.45 * v,
          decay: 0.12 + 0.12 * v,
          bp: 3200,
          q: 0.5,
          hp: 900,
          lp: 7000,
          room: 0.35,
        });
        if (bright > 0)
          this.burst(t, pan, {
            level: 0.3 * v * bright,
            decay: 0.01,
            hp: 3000,
            lp: 9000,
          });
      },
    };
  }

  /**
   * Programa un golpe en `time` (reloj del AudioContext). El golpe principal
   * cae siempre en su sitio; las notas de gracia de flam y drag van antes.
   */
  hit(time: number, stroke: Stroke, options: SnareOptions) {
    const ghost = options.ghostVolume / 100;
    const level = stroke.dynamic === "ghost" ? ghost : LEVEL[stroke.dynamic];
    const bright = stroke.dynamic === "accent" ? 1 : 0;
    const pan = stroke.hand === "R" ? PAN : -PAN;
    const play = this.kits[options.kit];
    // Nunca antes de "ahora": el primer golpe de una serie puede llevar gracia.
    const at = (t: number) => Math.max(this.ctx.currentTime, t);
    const grace = Math.max(GRACE_MIN, ghost);

    if (stroke.ornament === "flam") play(at(time - FLAM_GAP), grace, 0, -pan);
    if (stroke.ornament === "drag")
      for (const gap of DRAG_GAPS) play(at(time - gap), grace, 0, -pan);

    if (stroke.ornament === "buzz") {
      // Rebotes que decaen, repartidos en casi todo el paso (máx. 250 ms).
      const span = Math.min(0.25, options.stepSeconds * 0.9);
      for (let i = 0; i < BUZZ_BOUNCES; i += 1)
        play(
          time + (span * i) / BUZZ_BOUNCES,
          level * 0.8 ** i,
          i === 0 ? bright : 0,
          pan,
        );
      return;
    }
    play(time, level, bright, pan);
  }

  private output(
    node: AudioNode,
    t: number,
    peak: number,
    decay: number,
    pan: number,
    room = 0,
  ) {
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.001 + decay);
    const panner = this.ctx.createStereoPanner();
    panner.pan.value = pan;
    node.connect(gain).connect(panner).connect(this.master);
    if (room) {
      const send = this.ctx.createGain();
      send.gain.value = room;
      panner.connect(send).connect(this.room);
    }
  }

  /** Ruido filtrado: bordonero y chasquido. */
  private burst(
    t: number,
    pan: number,
    o: {
      level: number;
      decay: number;
      hp?: number;
      lp?: number;
      bp?: number;
      q?: number;
      room?: number;
    },
  ) {
    const source = this.ctx.createBufferSource();
    source.buffer = this.noise;
    let node: AudioNode = source;
    const filter = (type: BiquadFilterType, frequency: number, q?: number) => {
      const f = this.ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = frequency;
      if (q !== undefined) f.Q.value = q;
      node = node.connect(f);
    };
    if (o.hp) filter("highpass", o.hp);
    if (o.lp) filter("lowpass", o.lp);
    if (o.bp) filter("bandpass", o.bp, o.q ?? 0.8);
    this.output(node, t, o.level, o.decay, pan, o.room);
    source.start(t);
    source.stop(t + o.decay + 0.05);
  }

  /** Modo del parche: un tono que cae ligeramente. */
  private mode(
    t: number,
    pan: number,
    o: {
      freq: number;
      drop?: number;
      level: number;
      decay: number;
      type?: OscillatorType;
      room?: number;
    },
  ) {
    const osc = this.ctx.createOscillator();
    osc.type = o.type ?? "sine";
    osc.frequency.setValueAtTime(o.freq, t);
    osc.frequency.exponentialRampToValueAtTime(
      o.freq * (o.drop ?? 0.85),
      t + o.decay,
    );
    this.output(osc, t, o.level, o.decay, pan, o.room);
    osc.start(t);
    osc.stop(t + o.decay + 0.05);
  }
}
