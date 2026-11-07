export const STORYBOOK_WIDTH = 288;
export const STORYBOOK_HEIGHT = 344;

type ColorPair = readonly [light: string, dark: string];
export type StorybookPalette = {
  hair?: ColorPair;
  skin?: ColorPair;
  clothing?: ColorPair;
};

type RGB = [number, number, number];
type Pixels = { art: ImageData; mask: ImageData };
const sources = new Map<string, Promise<Pixels>>();
const frames = new Map<string, Promise<string>>();
const clamp = (value: number) => Math.min(1, Math.max(0, value));
const rgb = (hex: string): RGB => [
  parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)
];

async function loadImage(url: string) {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}

function canvasContext() {
  const canvas = document.createElement('canvas');
  canvas.width = STORYBOOK_WIDTH;
  canvas.height = STORYBOOK_HEIGHT;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('No canvas for avatar art');
  return context;
}

function loadPixels(url: string, maskUrl: string): Promise<Pixels> {
  const cached = sources.get(url);
  if (cached) return cached;
  const result = Promise.all([loadImage(url), loadImage(maskUrl)]).then(([image, zones]) => {
    const context = canvasContext();
    const { width, height } = context.canvas;
    context.drawImage(image, 0, 0, width, height);
    const art = context.getImageData(0, 0, width, height);
    context.clearRect(0, 0, width, height);
    context.drawImage(zones, 0, 0, width, height);
    const mask = context.getImageData(0, 0, width, height);
    return { art, mask };
  }).catch(error => { sources.delete(url); throw error; });
  sources.set(url, result);
  return result;
}

function recolor(context: CanvasRenderingContext2D, pixels: Pixels, palette: StorybookPalette) {
  const output = new ImageData(new Uint8ClampedArray(pixels.art.data), STORYBOOK_WIDTH, STORYBOOK_HEIGHT);
  const colors = [palette.hair, palette.skin, palette.clothing].map(pair => pair?.map(rgb));
  const source = pixels.art.data;
  const mask = pixels.mask.data;
  for (let index = 0; index < source.length; index += 4) {
    if (!source[index + 3]) continue;
    const zone = mask[index] >= mask[index + 1] && mask[index] >= mask[index + 2] ? 0 : mask[index + 1] >= mask[index + 2] ? 1 : 2;
    const weight = mask[index + zone] / 255;
    const tint = colors[zone];
    if (!weight || !tint) continue;
    const [light, dark] = tint;
    const luminance = source[index] * .25 + source[index + 1] * .61 + source[index + 2] * .14;
    const tone = zone === 1 ? clamp((luminance - 113) / 119) : clamp((luminance - 43) / 130);
    for (let channel = 0; channel < 3; channel++) {
      const shaded = dark[channel] + (light[channel] - dark[channel]) * tone;
      const blush = zone === 1 && channel === 0 ? Math.max(0, source[index] - source[index + 1] - 35) * .17 : 0;
      output.data[index + channel] = source[index + channel] * (1 - weight) + (shaded + blush) * weight;
    }
  }
  context.putImageData(output, 0, 0);
}

export function storybookFrame(url: string, maskUrl?: string, palette?: StorybookPalette): Promise<string> {
  const key = JSON.stringify([url, palette]);
  const cached = frames.get(key);
  if (cached) return cached;
  const result = (async () => {
    const context = canvasContext();
    if (!maskUrl || !palette) {
      context.drawImage(await loadImage(url), 0, 0, STORYBOOK_WIDTH, STORYBOOK_HEIGHT);
    } else {
      recolor(context, await loadPixels(url, maskUrl), palette);
    }
    // Embed the same transparent art in downloadable classroom photos.
    return context.canvas.toDataURL('image/webp', .94);
  })().catch(error => { frames.delete(key); throw error; });
  if (frames.size >= 200) frames.delete(frames.keys().next().value!);
  frames.set(key, result);
  return result;
}
