type Recording = {
  src: string;
  sourcePage: string;
  author: string;
  license: "CC0" | "Public Domain";
};

const RAW_AUDIO = "https://raw.githubusercontent.com/euuuuuuan/todak-public/main/assets/ambience";

/**
 * The 7 external recordings are taken from the CC0 / Public Domain asset set documented
 * by the upstream project. The runtime also has a procedural fallback for every sound,
 * so a blocked CDN/CORS request never leaves a channel silent.
 */
const RECORDING_SOURCES: Record<string, Recording> = {
  rain: { src: RAW_AUDIO + "/rain_soft.ogg", sourcePage: "https://github.com/euuuuuuan/todak-public/blob/main/CREDITS.md", author: "joedeshon (re-rendered by Todak)", license: "CC0" },
  thunder: { src: RAW_AUDIO + "/storm_far.ogg", sourcePage: "https://github.com/euuuuuuan/todak-public/blob/main/CREDITS.md", author: "nickmaysoundmusic (re-rendered by Todak)", license: "CC0" },
  ocean: { src: RAW_AUDIO + "/waves_calm.ogg", sourcePage: "https://github.com/euuuuuuan/todak-public/blob/main/CREDITS.md", author: "profispiesser (re-rendered by Todak)", license: "CC0" },
  river: { src: RAW_AUDIO + "/stream_brook.ogg", sourcePage: "https://github.com/euuuuuuan/todak-public/blob/main/CREDITS.md", author: "cher1101 (re-rendered by Todak)", license: "CC0" },
  birds: { src: RAW_AUDIO + "/birds_dawn.ogg", sourcePage: "https://github.com/euuuuuuan/todak-public/blob/main/CREDITS.md", author: "resaural (re-rendered by Todak)", license: "CC0" },
  fireplace: { src: RAW_AUDIO + "/fire_hearth.ogg", sourcePage: "https://github.com/euuuuuuan/todak-public/blob/main/CREDITS.md", author: "uniuniversal (re-rendered by Todak)", license: "CC0" },
  cafe: { src: RAW_AUDIO + "/cafe.ogg", sourcePage: "https://github.com/euuuuuuan/todak-public/blob/main/CREDITS.md", author: "arpeggio1980 (re-rendered by Todak)", license: "CC0" },
  forest: { src: RAW_AUDIO + "/birds_forest.ogg", sourcePage: "https://github.com/euuuuuuan/todak-public/blob/main/CREDITS.md", author: "Todak project-authored", license: "Public Domain" },
  "forest-night": { src: RAW_AUDIO + "/crickets.ogg", sourcePage: "https://github.com/euuuuuuan/todak-public/blob/main/CREDITS.md", author: "felixblume (re-rendered by Todak)", license: "CC0" },
  waterfall: { src: RAW_AUDIO + "/stream_brook.ogg", sourcePage: "https://github.com/euuuuuuan/todak-public/blob/main/CREDITS.md", author: "cher1101 (re-rendered by Todak)", license: "CC0" },
  "storm-rain": { src: RAW_AUDIO + "/storm_far.ogg", sourcePage: "https://github.com/euuuuuuan/todak-public/blob/main/CREDITS.md", author: "nickmaysoundmusic (re-rendered by Todak)", license: "CC0" },
  "mountain-stream": { src: RAW_AUDIO + "/stream_brook.ogg", sourcePage: "https://github.com/euuuuuuan/todak-public/blob/main/CREDITS.md", author: "cher1101 (re-rendered by Todak)", license: "CC0" },
};

function recorded(id: string): Recording | undefined {
  return RECORDING_SOURCES[id];
}

export type SoundId =
  | "lofi" | "rain" | "roof" | "thunder" | "ocean" | "river" | "wind" | "forest" | "birds"
  | "fireplace" | "cafe" | "keyboard" | "chimes" | "purr" | "forest-night" | "waterfall"
  | "storm-rain" | "mountain-stream" | "white" | "pink" | "brown";

export type SoundDefinition = {
  id: SoundId;
  label: string;
  detail: string;
  icon: "headphones" | "water" | "moon" | "leaf" | "fire" | "coffee" | "tasks" | "spark" | "volume";
  group: "Thiên nhiên" | "Không gian" | "Noise";
  recording?: Recording;
};

export const SOUND_CATALOG: SoundDefinition[] = [
  { id: "lofi", label: "Lo-fi piano", detail: "Hợp âm piano mềm · không lời", icon: "headphones", group: "Không gian" },
  { id: "rain", label: "Mưa dịu", detail: "Mưa thật trong phòng · vòng lặp mượt", icon: "water", group: "Thiên nhiên", recording: recorded("rain") },
  { id: "roof", label: "Mưa trên mái", detail: "Giọt mưa dày · nhịp rõ hơn", icon: "water", group: "Thiên nhiên" },
  { id: "thunder", label: "Sấm xa", detail: "Sấm thật · để âm lượng thấp", icon: "moon", group: "Thiên nhiên", recording: recorded("thunder") },
  { id: "ocean", label: "Sóng biển", detail: "Sóng Point Reyes · nền rộng", icon: "water", group: "Thiên nhiên", recording: recorded("ocean") },
  { id: "river", label: "Suối chảy", detail: "Dòng nước thật · đều và sáng", icon: "water", group: "Thiên nhiên", recording: recorded("river") },
  { id: "wind", label: "Gió nhẹ", detail: "Gió thật · nền trầm", icon: "leaf", group: "Thiên nhiên", recording: recorded("wind") },
  { id: "forest", label: "Rừng yên", detail: "Gió + nước + chim · âm tạo", icon: "leaf", group: "Thiên nhiên" },
  { id: "birds", label: "Chim hót", detail: "Chim thật · bình minh", icon: "leaf", group: "Thiên nhiên", recording: recorded("birds") },
  { id: "fireplace", label: "Lò sưởi", detail: "Củi cháy thật · nổ lách tách", icon: "fire", group: "Không gian", recording: recorded("fireplace") },
  { id: "cafe", label: "Quán cà phê", detail: "Room tone + ly tách · âm tạo", icon: "coffee", group: "Không gian" },
  { id: "keyboard", label: "Gõ bàn phím", detail: "Nhịp phím nhẹ · âm tạo", icon: "tasks", group: "Không gian" },
  { id: "chimes", label: "Chuông gió", detail: "Âm ngân thưa · âm tạo", icon: "spark", group: "Không gian" },
  { id: "purr", label: "Mèo ngủ", detail: "Rừ rừ rất nhẹ · âm tạo", icon: "moon", group: "Không gian" },
  { id: "forest-night", label: "Rừng sau mưa", detail: "Gió đêm + côn trùng · âm tạo", icon: "moon", group: "Thiên nhiên" },
  { id: "waterfall", label: "Thác nước", detail: "Nước dày + bọt · âm tạo", icon: "water", group: "Thiên nhiên" },
  { id: "storm-rain", label: "Mưa giông", detail: "Mưa lớn + sấm · âm tạo", icon: "moon", group: "Thiên nhiên" },
  { id: "mountain-stream", label: "Suối núi", detail: "Nước nhanh + không khí · âm tạo", icon: "water", group: "Thiên nhiên" },
  { id: "white", label: "White noise", detail: "Nền sáng · đều", icon: "volume", group: "Noise" },
  { id: "pink", label: "Pink noise", detail: "Nền cân bằng · mềm", icon: "volume", group: "Noise" },
  { id: "brown", label: "Brown noise", detail: "Nền trầm · êm và ổn định", icon: "volume", group: "Noise" },
];

export type MixerLevels = Record<SoundId, number>;
export const emptyLevels = (): MixerLevels => Object.fromEntries(SOUND_CATALOG.map((sound) => [sound.id, 0])) as MixerLevels;

export const MIX_PRESETS = [
  { id: "rain-desk", label: "Bàn học ngày mưa", detail: "Mưa dịu + piano", levels: { rain: 45, lofi: 22 } },
  { id: "forest", label: "Một góc rừng", detail: "Suối + gió + chim", levels: { river: 32, wind: 16, birds: 17 } },
  { id: "warm", label: "Đêm bên lửa", detail: "Lửa + mưa mái", levels: { fireplace: 40, roof: 19 } },
  { id: "cafe", label: "Quán vắng", detail: "Cà phê + piano", levels: { cafe: 26, lofi: 28 } },
  { id: "deep", label: "Tập trung sâu", detail: "Brown noise + biển", levels: { brown: 38, ocean: 18 } },
  { id: "storm", label: "Mưa giông", detail: "Mưa lớn + sấm xa", levels: { "storm-rain": 28, thunder: 12 } },
] as const;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFor(id: string) {
  let seed = 2166136261;
  for (let i = 0; i < id.length; i++) {
    seed ^= id.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  return seed >>> 0;
}

function writeStereo(buffer: AudioBuffer, generator: (channel: number, time: number, random: () => number) => number) {
  const length = buffer.length;
  const rate = buffer.sampleRate;
  const seeds = [seedFor("left" + buffer.sampleRate + length), seedFor("right" + buffer.sampleRate + length)];
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const out = buffer.getChannelData(channel);
    const random = mulberry32(seeds[channel] ?? seeds[0]);
    for (let i = 0; i < length; i++) out[i] = generator(channel, i / rate, random);
  }
}

function onePole(value: number, previous: number, coefficient: number) {
  return previous + coefficient * (value - previous);
}

/** Downsample and create a constant-power self-loop. */
export function prepareLoop(context: AudioContext, input: AudioBuffer): AudioBuffer {
  const rate = 22050;
  const duration = Math.max(1, Math.min(input.duration, 70));
  const originalLength = Math.max(1, Math.floor(duration * rate));
  const overlap = Math.min(Math.floor(rate * 1.8), Math.floor(originalLength / 5));
  const length = Math.max(1, originalLength - overlap);
  const result = context.createBuffer(2, length, rate);

  let peak = 0;
  let energy = 0;
  let samples = 0;

  for (let channel = 0; channel < 2; channel++) {
    const source = input.getChannelData(Math.min(channel, input.numberOfChannels - 1));
    const out = result.getChannelData(channel);
    const read = (index: number) => {
      const position = clamp(index * input.sampleRate / rate, 0, source.length - 1);
      const base = Math.floor(position);
      const frac = position - base;
      const a = source[base] ?? 0;
      const b = source[Math.min(source.length - 1, base + 1)] ?? a;
      return a + (b - a) * frac;
    };
    for (let i = 0; i < length; i++) {
      if (i < overlap) {
        const angle = i / Math.max(1, overlap - 1) * Math.PI / 2;
        out[i] = read(i) * Math.sin(angle) + read(length + i) * Math.cos(angle);
      } else out[i] = read(i);
      const sample = out[i];
      peak = Math.max(peak, Math.abs(sample));
      energy += sample * sample;
      samples++;
    }
  }

  const rms = Math.sqrt(energy / Math.max(1, samples));
  const gain = Math.min(1.15, 0.075 / Math.max(0.003, rms), 0.72 / Math.max(0.003, peak));
  for (let channel = 0; channel < 2; channel++) {
    const out = result.getChannelData(channel);
    for (let i = 0; i < out.length; i++) out[i] *= gain;
  }
  return result;
}

/**
 * Procedural fallback engine. It is intentionally deterministic per sound, so every
 * browser gets the same character and the loop is seamless even when network audio fails.
 */
export function synthesizeSound(context: AudioContext, id: SoundId): AudioBuffer {
  const rate = 22050;
  const seconds = id === "lofi" ? 32 : 26;
  const buffer = context.createBuffer(2, Math.floor(rate * seconds), rate);
  const random = mulberry32(seedFor(id));
  let lowL = 0, lowR = 0;
  let pinkL = [0, 0, 0, 0, 0, 0, 0];
  let pinkR = [0, 0, 0, 0, 0, 0, 0];

  const birdEvents = Array.from({ length: 13 }, () => ({
    at: 1 + random() * 24,
    length: 0.18 + random() * 0.32,
    base: 1800 + random() * 2300,
    sweep: 500 + random() * 1600,
  })).sort((a, b) => a.at - b.at);

  const thunderEvents = [4.3, 10.8, 17.7, 24.0].map((at, index) => ({
    at,
    length: 1.6 + (index % 2) * .5,
    base: 48 + index * 5,
  }));

  const pianoChords = [
    [45, 52, 57, 60, 64],
    [42, 49, 54, 57, 61],
    [40, 47, 52, 55, 59],
    [43, 50, 55, 59, 62],
  ];

  const notesToFrequency = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);
  const noiseWhite = (channel: number, rnd: () => number) => (rnd() * 2 - 1) * (channel ? .98 : 1);
  const pinkNoise = (channel: number, rnd: () => number) => {
    const state = channel ? pinkR : pinkL;
    const white = rnd() * 2 - 1;
    state[0] = .99886 * state[0] + white * .0555179;
    state[1] = .99332 * state[1] + white * .0750759;
    state[2] = .96900 * state[2] + white * .1538520;
    state[3] = .86650 * state[3] + white * .3104856;
    state[4] = .55000 * state[4] + white * .5329522;
    state[5] = -.7616 * state[5] - white * .0168980;
    state[6] = white * .5362;
    return state[0] + state[1] + state[2] + state[3] + state[4] + state[5] + state[6] + white * .115926;
  };

  writeStereo(buffer, (channel, time, rnd) => {
    const white = noiseWhite(channel, rnd);
    const pink = pinkNoise(channel, rnd) * .11;
    const prevLow = channel ? lowR : lowL;
    let low = onePole(white, prevLow, .018);
    if (channel) lowR = low; else lowL = low;

    let out = 0;

    if (id === "white") out = white * .12;
    else if (id === "pink") out = pink * .78;
    else if (id === "brown") out = low * 2.6;
    else if (id === "rain" || id === "roof" || id === "storm-rain") {
      const density = id === "roof" ? .045 : .032;
      let drops = 0;
      if (rnd() < density) drops += (rnd() * 2 - 1) * (id === "roof" ? .28 : .20);
      const texture = onePole(white, 0, .055);
      out = texture * (id === "roof" ? .42 : .32) + drops;
      if (id === "storm-rain") {
        const tail = thunderEvents.reduce((sum, event) => {
          const age = time - event.at;
          if (age < 0 || age > event.length) return sum;
          const env = Math.exp(-age * 2.2) * (1 - Math.exp(-age * 22));
          const rumble = Math.sin(2 * Math.PI * event.base * age) + .42 * Math.sin(2 * Math.PI * (event.base * 1.7) * age);
          return sum + rumble * env * .055;
        }, 0);
        out += tail;
      }
    } else if (id === "thunder") {
      out = low * .7;
      for (const event of thunderEvents) {
        const age = time - event.at;
        if (age >= 0 && age < event.length) {
          const env = Math.exp(-age * 1.55) * (1 - Math.exp(-age * 9));
          out += (Math.sin(2 * Math.PI * event.base * age) + .25 * Math.sin(2 * Math.PI * 97 * age)) * env * .16;
        }
      }
    } else if (id === "ocean") {
      const swell = .35 + .65 * Math.pow(Math.max(0, Math.sin(2 * Math.PI * time / 8.6)), 2);
      out = onePole(white, low, .02) * .14 * swell + Math.sin(2 * Math.PI * .16 * time) * .010 * swell;
    } else if (id === "river" || id === "mountain-stream" || id === "waterfall") {
      const fast = id === "waterfall" ? .055 : id === "mountain-stream" ? .040 : .028;
      const flow = onePole(white, low, fast);
      out = flow * (id === "waterfall" ? .46 : .34);
      if (id !== "river") out += pink * (id === "mountain-stream" ? .45 : .7);
      if (rnd() < (id === "waterfall" ? .0028 : .0015)) out += (rnd() * 2 - 1) * .3;
    } else if (id === "wind") {
      const gust = .32 + .58 * Math.pow(Math.max(0, (Math.sin(2 * Math.PI * time / 9.6) + 1) / 2), 2);
      out = low * .62 * gust + pink * .18;
    } else if (id === "forest-night") {
      out = pink * .18;
    } else if (id === "forest" || id === "birds") {
      out = low * .30 + pink * .33;
      for (const event of birdEvents) {
        const age = time - event.at;
        if (age >= 0 && age < event.length) {
          const progress = age / event.length;
          const envelope = Math.sin(Math.PI * progress);
          const frequency = event.base + event.sweep * Math.sin(progress * Math.PI * 1.15);
          out += Math.sin(2 * Math.PI * frequency * age) * envelope * .06;
        }
      }
      if (id === "forest") out += onePole(white, low, .025) * .14;
    } else if (id === "fireplace") {
      out = pink * .34 + low * .28;
      if (rnd() < .0019) {
        const crack = (rnd() * 2 - 1) * .42;
        out += crack;
      }
    } else if (id === "cafe") {
      out = pink * .28 + low * .08;
      const cycle = time % 7.2;
      const age = cycle - 4.8;
      if (age >= 0 && age < .28) out += Math.sin(2 * Math.PI * (1200 - age * 1200) * age) * Math.exp(-age * 16) * .045;
      if (rnd() < .00035) out += (rnd() * 2 - 1) * .07;
    } else if (id === "keyboard") {
      const cycle = time % 1.55;
      const taps = [0.15, 0.42, 0.72, 0.98, 1.24];
      let click = 0;
      taps.forEach((tap, index) => {
        const age = cycle - tap;
        if (age >= 0 && age < .05) {
          const envelope = Math.exp(-age * 120);
          click += (Math.sin(2 * Math.PI * (700 + index * 110) * age) + white * .8) * envelope * .065;
        }
      });
      out = click;
    } else if (id === "chimes") {
      const cycle = time % 8.5;
      const bells = [0, 1.8, 4.5];
      bells.forEach((start, index) => {
        const age = cycle - start;
        if (age >= 0 && age < 2.1) {
          const envelope = Math.exp(-age * (1.15 + index * .1)) * Math.sin(Math.min(1, age * 10) * Math.PI / 2);
          const freq = [523.25, 659.25, 783.99][index];
          out += (Math.sin(2 * Math.PI * freq * age) + .18 * Math.sin(2 * Math.PI * freq * 2 * age)) * envelope * .055;
        }
      });
    } else if (id === "purr") {
      const modulation = .58 + .42 * Math.sin(2 * Math.PI * 26 * time);
      out = (low * .5 + Math.sin(2 * Math.PI * 72 * time) * .08 + Math.sin(2 * Math.PI * 118 * time) * .025) * modulation;
    } else if (id === "lofi") {
      const chordIndex = Math.floor(time / 8) % pianoChords.length;
      const notePhase = time % 8;
      pianoChords[chordIndex].forEach((midi, noteIndex) => {
        const onset = noteIndex * .47;
        const age = notePhase - onset;
        if (age >= 0 && age < 4.8) {
          const freq = notesToFrequency(midi) * (channel ? 1.0004 : 1);
          const attack = 1 - Math.exp(-age * 9);
          const release = Math.exp(-age * .52);
          // Warm, rounded harmonics: avoid the glassy high-frequency character that
          // made the previous procedural piano tiring when layered with ambience.
          const tone = Math.sin(2 * Math.PI * freq * age)
            + .08 * Math.sin(2 * Math.PI * freq * 2 * age)
            + .018 * Math.sin(2 * Math.PI * freq * 3 * age);
          out += tone * attack * release * (noteIndex < 2 ? .018 : .024);
        }
      });
      out += pink * .045;
    }

    const stereoSpread = channel === 0 ? .995 : 1.005;
    return clamp(out * stereoSpread, -0.85, 0.85);
  });

  return prepareLoop(context, buffer);
}

export function recordingCredits() {
  return Object.entries(RECORDING_SOURCES).map(([id, source]) => ({ id, ...source }));
}
