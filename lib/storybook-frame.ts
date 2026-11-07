import type { AvatarCustomization } from './avatar-customization';
import type { StorybookBounds, StorybookLandmarks } from './storybook-avatar';

export const STORYBOOK_WIDTH = 288;
export const STORYBOOK_HEIGHT = 344;

type Palette = {
  hair: readonly [string, string];
  skin: readonly [string, string];
  clothing: readonly [string, string];
  fabric: AvatarCustomization['clothing'];
};
type Frame = { href: string; landmarks?: StorybookLandmarks };
type Pixels = { art: ImageData; mask: ImageData; landmarks: StorybookLandmarks };
type RGB = [number, number, number];
type FaceRegions = readonly [face: StorybookBounds, eyes: StorybookBounds[], mouth?: StorybookBounds];

// These rectangles are measured on the fixed 288 × 344 roster art. Each pose
// has different facial placement, and hair shadows can be as dark as the eyes.
const rosterFaces: Partial<Record<string, FaceRegions>> = {
  'waves-idle': [[100, 80, 210, 165], [[154, 119, 166, 140], [192, 112, 203, 132]], [168, 138, 194, 158]],
  'waves-step': [[113, 83, 219, 177], [[165, 120, 177, 141], [202, 112, 212, 132]], [180, 138, 205, 158]],
  'waves-seated': [[66, 93, 133, 189], [[78, 127, 91, 152]]],
  'crop-idle': [[86, 66, 202, 153], [[143, 104, 155, 126], [184, 97, 194, 118]], [158, 125, 185, 145]],
  'crop-step': [[99, 65, 213, 166], [[155, 105, 168, 127], [194, 97, 205, 118]], [170, 124, 197, 145]],
  'crop-seated': [[69, 66, 145, 175], [[82, 102, 97, 130]]],
  'spiky-idle': [[94, 66, 207, 156], [[148, 106, 161, 127], [188, 98, 198, 119]], [163, 126, 190, 146]],
  'spiky-step': [[106, 72, 216, 170], [[160, 108, 172, 129], [197, 99, 208, 120]], [175, 128, 199, 148]],
  'spiky-seated': [[64, 84, 138, 181], [[78, 111, 92, 138]]],
  'bob-idle': [[94, 64, 213, 171], [[151, 102, 165, 125], [194, 94, 204, 117]], [168, 124, 195, 145]],
  'bob-step': [[109, 67, 222, 171], [[163, 105, 176, 128], [203, 97, 214, 119]], [180, 126, 205, 147]],
  'bob-seated': [[57, 78, 127, 174], [[71, 104, 85, 131]]],
  'bun-idle': [[95, 68, 207, 177], [[147, 113, 159, 135], [188, 106, 198, 127]], [163, 134, 188, 154]],
  'bun-step': [[104, 71, 216, 177], [[158, 115, 171, 137], [197, 107, 207, 128]], [174, 136, 200, 155]],
  'bun-seated': [[60, 64, 141, 174], [[75, 100, 89, 129]]],
  'curls-idle': [[98, 67, 208, 159], [[148, 108, 161, 130], [188, 101, 199, 122]], [165, 129, 189, 148]],
  'curls-step': [[111, 71, 219, 175], [[161, 113, 174, 135], [199, 104, 209, 125]], [177, 132, 202, 152]],
  'curls-seated': [[52, 77, 127, 178], [[67, 108, 80, 134]]],
  'part-idle': [[92, 72, 202, 176], [[145, 117, 156, 139], [184, 110, 194, 131]], [159, 138, 184, 157]],
  'part-step': [[106, 72, 214, 177], [[159, 118, 170, 139], [196, 110, 206, 132]], [173, 139, 197, 158]],
  'part-seated': [[67, 82, 137, 182], [[81, 121, 93, 147]]],
  'long-idle': [[97, 52, 211, 164], [[151, 101, 163, 123], [193, 94, 203, 116]], [166, 123, 192, 143]],
  'long-step': [[115, 52, 226, 166], [[170, 101, 182, 123], [209, 94, 218, 115]], [185, 124, 210, 144]],
  'long-seated': [[66, 124, 134, 191], [[79, 124, 91, 150]]],
};

const sources = new Map<string, Promise<Pixels>>();
const frames = new Map<string, Promise<Frame>>();
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

function measure(
  left: number, top: number, right: number, bottom: number,
  includes: (index: number, x: number, y: number) => boolean
): StorybookBounds | undefined {
  let bounds: StorybookBounds | undefined;
  for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) {
    if (!includes((y * STORYBOOK_WIDTH + x) * 4, x, y)) continue;
    if (!bounds) bounds = [x, y, x + 1, y + 1];
    else {
      bounds[0] = Math.min(x, bounds[0]);
      bounds[2] = Math.max(x + 1, bounds[2]);
      bounds[3] = y + 1;
    }
  }
  return bounds;
}

function faceLandmarks(url: string, art: Uint8ClampedArray, mask: Uint8ClampedArray): StorybookLandmarks {
  const head = measure(0, 0, STORYBOOK_WIDTH, 214, index => art[index + 3] > 150 && mask[index] > 135)
    ?? [56, 16, 230, 177];
  const regions = rosterFaces[url.slice(url.lastIndexOf('/') + 1, -'.webp'.length)];
  const [face, eyes, mouth] = regions ?? [[head[0] + 38, head[1] + 53, head[2] - 6, head[3]], []];
  return { head, face, eyes, mouth };
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
    return { art, mask, landmarks: faceLandmarks(url, art.data, mask.data) };
  }).catch(error => { sources.delete(url); throw error; });
  sources.set(url, result);
  return result;
}

function recolor(context: CanvasRenderingContext2D, pixels: Pixels, palette: Palette) {
  const output = new ImageData(new Uint8ClampedArray(pixels.art.data), STORYBOOK_WIDTH, STORYBOOK_HEIGHT);
  const colors = [palette.hair, palette.skin, palette.clothing].map(pair => pair.map(rgb));
  const source = pixels.art.data;
  const mask = pixels.mask.data;
  for (let index = 0; index < source.length; index += 4) {
    if (!source[index + 3]) continue;
    const zone = mask[index] >= mask[index + 1] && mask[index] >= mask[index + 2] ? 0 : mask[index + 1] >= mask[index + 2] ? 1 : 2;
    const weight = mask[index + zone] / 255;
    if (!weight) continue;
    const [light, dark] = colors[zone];
    const luminance = source[index] * .25 + source[index + 1] * .61 + source[index + 2] * .14;
    let tone = zone === 1 ? clamp((luminance - 113) / 119) : clamp((luminance - 43) / 130);
    if (zone === 2 && palette.fabric === 'plain') tone = .24 + tone * .57;
    if (zone === 2 && palette.fabric === 'puffer') {
      const row = Math.floor(index / 4 / STORYBOOK_WIDTH);
      tone = clamp(.15 + tone * .72 + .17 * Math.sin(row / 6.5));
    }
    for (let channel = 0; channel < 3; channel++) {
      const shaded = dark[channel] + (light[channel] - dark[channel]) * tone;
      const blush = zone === 1 && channel === 0 ? Math.max(0, source[index] - source[index + 1] - 35) * .17 : 0;
      output.data[index + channel] = source[index + channel] * (1 - weight) + (shaded + blush) * weight;
    }
  }
  context.putImageData(output, 0, 0);
}

export function storybookFrame(url: string, maskUrl?: string, palette?: Palette): Promise<Frame> {
  const key = JSON.stringify([url, palette]);
  const cached = frames.get(key);
  if (cached) return cached;
  const result = (async () => {
    const context = canvasContext();
    if (!maskUrl || !palette) {
      context.drawImage(await loadImage(url), 0, 0, STORYBOOK_WIDTH, STORYBOOK_HEIGHT);
      return { href: context.canvas.toDataURL('image/webp', .95) };
    }
    const pixels = await loadPixels(url, maskUrl);
    recolor(context, pixels, palette);
    return { href: context.canvas.toDataURL('image/webp', .94), landmarks: pixels.landmarks };
  })().catch(error => { frames.delete(key); throw error; });
  // Busy rooms may see many personalized combinations during a class.
  if (frames.size >= 180) frames.delete(frames.keys().next().value!);
  frames.set(key, result);
  return result;
}
