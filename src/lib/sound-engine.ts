type Recording = { src: string; sourcePage: string; author: string; license: "CC0" };
export type SoundDefinition = {
  id: SoundId; label: string; detail: string; icon: "headphones" | "water" | "moon" | "leaf" | "fire" | "coffee" | "tasks" | "spark" | "volume";
  group: "Thiên nhiên" | "Không gian" | "Noise"; recording?: Recording;
};
export type SoundId = "lofi" | "rain" | "roof" | "thunder" | "ocean" | "river" | "wind" | "forest" | "birds" | "fireplace" | "cafe" | "keyboard" | "chimes" | "purr" | "forest-night" | "waterfall" | "storm-rain" | "mountain-stream" | "white" | "pink" | "brown";
function recorded(id: string, page: string): Recording { return { src: `/audio/${id}.mp3`, sourcePage: `https://bigsoundbank.com/${page}`, author: "Joseph SARDIN", license: "CC0" }; }
export const SOUND_CATALOG: SoundDefinition[] = [
  { id: "lofi", label: "Lo-fi piano", detail: "Hợp âm mềm · nhạc tổng hợp", icon: "headphones", group: "Không gian" },
  { id: "rain", label: "Mưa dịu", detail: "Mưa thật dưới mái che", icon: "water", group: "Thiên nhiên", recording: recorded("rain", "rain-under-an-umbrella-s2679.html") },
  { id: "roof", label: "Mưa trên mái", detail: "Giọt mưa trên mái xe", icon: "water", group: "Thiên nhiên", recording: recorded("roof", "rain-on-car-roof-s1293.html") },
  { id: "thunder", label: "Sấm xa", detail: "Sấm thật · đặt nhỏ để nghe nhẹ", icon: "moon", group: "Thiên nhiên", recording: recorded("thunder", "thunder-s2718.html") },
  { id: "ocean", label: "Sóng biển", detail: "Sóng nhỏ vỗ bãi cát", icon: "water", group: "Thiên nhiên", recording: recorded("ocean", "small-waves-and-beach-1-s1446.html") },
  { id: "river", label: "Suối chảy", detail: "Dòng suối nhỏ trên núi", icon: "water", group: "Thiên nhiên", recording: recorded("river", "small-stream-4-s1354.html") },
  { id: "wind", label: "Gió nhẹ", detail: "Gió qua một cánh đồng", icon: "leaf", group: "Thiên nhiên", recording: recorded("wind", "wind-in-a-cornfield-s1097.html") },
  { id: "forest", label: "Rừng yên", detail: "Rừng, chim và côn trùng", icon: "leaf", group: "Thiên nhiên", recording: recorded("forest", "forest-s0100.html") },
  { id: "birds", label: "Chim hót", detail: "Tiếng chim lúc chiều xuống", icon: "leaf", group: "Thiên nhiên", recording: recorded("birds", "evening-birds-s1859.html") },
  { id: "fireplace", label: "Lò sưởi", detail: "Củi cháy, than nổ nhẹ", icon: "fire", group: "Không gian", recording: recorded("fireplace", "fireplace-5-s2857.html") },
  { id: "cafe", label: "Quán cà phê", detail: "Bản thu không gian quán ở Brest", icon: "coffee", group: "Không gian", recording: recorded("cafe", "coffee-shop-at-the-capucins-s2561.html") },
  { id: "keyboard", label: "Gõ bàn phím", detail: "Bản thu gõ phím thực tế", icon: "tasks", group: "Không gian", recording: recorded("keyboard", "computer-keyboard-s0229.html") },
  { id: "chimes", label: "Chuông gió", detail: "Âm ngân tổng hợp · thưa và mềm", icon: "spark", group: "Không gian" },
  { id: "purr", label: "Mèo ngủ", detail: "Tiếng mèo rừ rừ ghi âm thật", icon: "moon", group: "Không gian", recording: recorded("purr", "detail-0436-cat-purr.html") },
  { id: "forest-night", label: "Rừng sau mưa", detail: "Rừng đêm, đường xa và côn trùng", icon: "moon", group: "Thiên nhiên", recording: recorded("forest-night", "forest-at-night-after-rain-s0555.html") },
  { id: "waterfall", label: "Thác nước", detail: "Thác nhỏ bên cối xay cũ", icon: "water", group: "Thiên nhiên", recording: recorded("waterfall", "small-cascade-s0507.html") },
  { id: "storm-rain", label: "Mưa giông", detail: "Mưa lớn, sấm và chim", icon: "moon", group: "Thiên nhiên", recording: recorded("storm-rain", "storm-and-rain-3-s2717.html") },
  { id: "mountain-stream", label: "Suối núi", detail: "Dòng torrent trên núi", icon: "water", group: "Thiên nhiên", recording: recorded("mountain-stream", "mountain-stream-7-s3222.html") },
  { id: "white", label: "White noise", detail: "Nền sáng · lọc bớt cao chói", icon: "volume", group: "Noise" },
  { id: "pink", label: "Pink noise", detail: "Nền cân bằng, mềm hơn", icon: "volume", group: "Noise" },
  { id: "brown", label: "Brown noise", detail: "Nền trầm · êm và đều", icon: "volume", group: "Noise" },
];
export type MixerLevels = Record<SoundId, number>;
export const emptyLevels = (): MixerLevels => Object.fromEntries(SOUND_CATALOG.map((sound) => [sound.id, 0])) as MixerLevels;
export const MIX_PRESETS = [
  { id: "rain-desk", label: "Bàn học ngày mưa", detail: "Mưa thật + piano mềm", levels: { rain: 45, lofi: 25 } },
  { id: "forest", label: "Một góc rừng", detail: "Suối + gió + chim", levels: { river: 35, wind: 20, birds: 18 } },
  { id: "warm", label: "Đêm bên lửa", detail: "Lửa + mưa mái + mèo", levels: { fireplace: 40, roof: 20, purr: 18 } },
  { id: "cafe", label: "Quán vắng", detail: "Cà phê + piano", levels: { cafe: 28, lofi: 30 } },
  { id: "deep", label: "Tập trung sâu", detail: "Brown noise + sóng biển", levels: { brown: 40, ocean: 22 } },
] as const;

/** Downsample to a practical memory size and splice a constant-power crossfade at the loop boundary. */
export function prepareLoop(context: AudioContext, input: AudioBuffer): AudioBuffer {
  const rate = 22050;
  const originalLength = Math.floor(Math.min(input.duration, 50) * rate);
  const overlap = Math.min(Math.floor(rate * 1.6), Math.floor(originalLength / 5));
  const length = Math.max(1, originalLength - overlap);
  const result = context.createBuffer(2, length, rate);
  let peak = 0, energy = 0, samples = 0;
  for (let channel = 0; channel < 2; channel++) {
    const source = input.getChannelData(Math.min(channel, input.numberOfChannels - 1));
    const read = (index: number) => {
      const pos = index * input.sampleRate / rate;
      const base = Math.min(source.length - 1, Math.floor(pos));
      const fraction = pos - base;
      return source[base] * (1 - fraction) + source[Math.min(source.length - 1, base + 1)] * fraction;
    };
    const out = result.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      if (i < overlap) {
        const angle = i / Math.max(1, overlap - 1) * Math.PI / 2;
        out[i] = read(length + i) * Math.cos(angle) + read(i) * Math.sin(angle);
      } else out[i] = read(i);
      peak = Math.max(peak, Math.abs(out[i]));
      energy += out[i] * out[i]; samples++;
    }
  }
  // Conservative loudness matching. Limit peaks before layering multiple channels.
  const rms = Math.sqrt(energy / Math.max(1, samples));
  const gain = Math.min(4, 0.085 / Math.max(0.001, rms), 0.6 / Math.max(0.001, peak));
  for (let channel = 0; channel < 2; channel++) {
    const out = result.getChannelData(channel); for (let i = 0; i < out.length; i++) out[i] *= gain;
  }
  return result;
}

/** Only music, chimes and noise are synthesized; natural/place sounds load recordings. */
export function synthesizeSound(context: AudioContext, id: SoundId): AudioBuffer {
  if (SOUND_CATALOG.find((sound) => sound.id === id)?.recording) throw new Error("Âm thanh này cần bản thu, không dùng tiếng giả thay thế.");
  const rate = 22050;
  const seconds = id === "lofi" ? 32 : 24;
  const buffer = context.createBuffer(2, rate * seconds, rate);
  const chords = [[48, 55, 60, 64, 71], [45, 52, 57, 60, 67], [41, 48, 53, 57, 64], [43, 50, 55, 59, 65]];
  for (let channel = 0; channel < 2; channel++) {
    const out = buffer.getChannelData(channel);
    let brown = 0, smooth = 0, b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < out.length; i++) {
      const time = i / rate;
      const white = Math.random() * 2 - 1;
      brown = (brown + white * 0.02) / 1.02;
      smooth += (white - smooth) * 0.23;
      b0 = 0.99765 * b0 + white * 0.099046; b1 = 0.963 * b1 + white * 0.2965164; b2 = 0.57 * b2 + white * 1.0526913;
      if (id === "white") out[i] = smooth * 0.55;
      else if (id === "pink") out[i] = (b0 + b1 + b2 + white * 0.1848) * 0.055;
      else if (id === "brown") out[i] = brown * 0.9;
      else if (id === "chimes") {
        const local = time % 8;
        for (const [index, note] of [523.25, 659.25, 783.99].entries()) {
          const age = local - index * 1.45;
          if (age > 0) out[i] += Math.sin(2 * Math.PI * note * age + channel * 0.12) * Math.exp(-age * 1.6) * Math.min(1, age * 12) * 0.08;
        }
      } else {
        const chordIndex = Math.floor(time / 8);
        for (let delay = 0; delay < 2; delay++) {
          const index = (chordIndex - delay + 4) % 4;
          for (const [noteIndex, midi] of chords[index].entries()) {
            const age = time - (chordIndex - delay) * 8 - noteIndex * 0.52;
            if (age < 0) continue;
            const frequency = 440 * Math.pow(2, (midi - 69) / 12) * (1 + channel * 0.0003);
            const envelope = (1 - Math.exp(-age * 14)) * Math.exp(-age * 0.6);
            const amplitude = 0.04 * (noteIndex < 2 ? 0.8 : 1);
            out[i] += (Math.sin(2 * Math.PI * frequency * age) + 0.12 * Math.sin(4 * Math.PI * frequency * age)) * envelope * amplitude;
          }
        }
      }
    }
  }
  return prepareLoop(context, buffer);
}
