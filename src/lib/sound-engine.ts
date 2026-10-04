type Recording = { src: string; sourcePage: string; author: string; license: "CC0" | "Public Domain" };

const RAW_AUDIO = "https://raw.githubusercontent.com/twtrubiks/moonseal/main/public/audio";
const RECORDING_SOURCES: Record<string, Recording> = {
  rain: { src: RAW_AUDIO + "/rain.mp3", sourcePage: "https://freesound.org/s/81818/", author: "Silencyo", license: "CC0" },
  roof: { src: RAW_AUDIO + "/rain.mp3", sourcePage: "https://freesound.org/s/81818/", author: "Silencyo", license: "CC0" },
  thunder: { src: RAW_AUDIO + "/thunder.mp3", sourcePage: "https://archive.org/details/1HourThunderstorm", author: "Public Domain source", license: "Public Domain" },
  ocean: { src: RAW_AUDIO + "/ocean.mp3", sourcePage: "https://freesound.org/s/156598/", author: "Rmutt", license: "CC0" },
  river: { src: RAW_AUDIO + "/stream.mp3", sourcePage: "https://archive.org/details/GOLD_TAPE_53_54_Water", author: "archive.org source", license: "CC0" },
  wind: { src: RAW_AUDIO + "/wind.mp3", sourcePage: "https://archive.org/details/GOLD_TAPE_55_56_Weather-Wind", author: "archive.org source", license: "CC0" },
  forest: { src: RAW_AUDIO + "/birds.mp3", sourcePage: "https://freesound.org/s/578523/", author: "SamsterBirdies", license: "CC0" },
  birds: { src: RAW_AUDIO + "/birds.mp3", sourcePage: "https://freesound.org/s/578523/", author: "SamsterBirdies", license: "CC0" },
  fireplace: { src: RAW_AUDIO + "/fireplace.mp3", sourcePage: "https://archive.org/details/Red_Library_Fire", author: "archive.org source", license: "CC0" },
  "forest-night": { src: RAW_AUDIO + "/birds.mp3", sourcePage: "https://freesound.org/s/578523/", author: "SamsterBirdies", license: "CC0" },
  waterfall: { src: RAW_AUDIO + "/stream.mp3", sourcePage: "https://archive.org/details/GOLD_TAPE_53_54_Water", author: "archive.org source", license: "CC0" },
  "storm-rain": { src: RAW_AUDIO + "/thunder.mp3", sourcePage: "https://archive.org/details/1HourThunderstorm", author: "Public Domain source", license: "Public Domain" },
  "mountain-stream": { src: RAW_AUDIO + "/stream.mp3", sourcePage: "https://archive.org/details/GOLD_TAPE_53_54_Water", author: "archive.org source", license: "CC0" },
};

export type SoundDefinition = {
  id: SoundId; label: string; detail: string; icon: "headphones" | "water" | "moon" | "leaf" | "fire" | "coffee" | "tasks" | "spark" | "volume";
  group: "Thiên nhiên" | "Không gian" | "Noise"; recording?: Recording;
};
export type SoundId = "lofi" | "rain" | "roof" | "thunder" | "ocean" | "river" | "wind" | "forest" | "birds" | "fireplace" | "cafe" | "keyboard" | "chimes" | "purr" | "forest-night" | "waterfall" | "storm-rain" | "mountain-stream" | "white" | "pink" | "brown";
function recorded(id: string, page: string): Recording | undefined {
  return RECORDING_SOURCES[id];
}
export const SOUND_CATALOG: SoundDefinition[] = [
  { id: "lofi", label: "Lo-fi piano", detail: "Hợp âm mềm · nhạc tổng hợp", icon: "headphones", group: "Không gian" },
  { id: "rain", label: "Mưa dịu", detail: "Mưa thật dưới mái che", icon: "water", group: "Thiên nhiên", recording: recorded("rain", "rain-under-an-umbrella-s2679.html") },
  { id: "roof", label: "Mưa trên mái", detail: "Giọt mưa trên mái xe", icon: "water", group: "Thiên nhiên", recording: recorded("roof", "rain-on-car-roof-s1293.html") },
  { id: "thunder", label: "Sấm xa", detail: "Sấm thật · đặt nhỏ để nghe nhẹ", icon: "moon", group: "Thiên nhiên", recording: recorded("thunder", "thunder-s2718.html") },
  { id: "ocean", label: "Sóng biển", detail: "Sóng nhỏ vỗ bãi cát", icon: "water", group: "Thiên nhiên", recording: recorded("ocean", "small-waves-and-beach-1-s1446.html") },