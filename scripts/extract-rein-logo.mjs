import path from "node:path";

import sharp from "sharp";

const [inputPath, outputPath] = process.argv.slice(2);

if (!inputPath || !outputPath) {
  throw new Error("Usage: node scripts/extract-rein-logo.mjs <input.png> <output.png>");
}

const { data, info } = await sharp(inputPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

let removedPixels = 0;
let left = info.width;
let top = info.height;
let right = -1;
let bottom = -1;

for (let y = 0; y < info.height; y += 1) {
  for (let x = 0; x < info.width; x += 1) {
    const offset = (y * info.width + x) * 4;
    const red = data[offset];
    const green = data[offset + 1];
    const blue = data[offset + 2];
    const darkest = Math.min(red, green, blue);
    const chroma = Math.max(red, green, blue) - darkest;

    // The supplied checkerboard consists exclusively of bright near-neutral pixels.
    // Foreground cream, cyan, orange and magenta pixels remain byte-for-byte unchanged.
    if (darkest >= 185 && chroma <= 6) {
      data[offset + 3] = 0;
      removedPixels += 1;
      continue;
    }

    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }
}

if (right < left || bottom < top || removedPixels < info.width * info.height * 0.4) {
  throw new Error("Background classification failed its safety check.");
}

const padding = 12;
const crop = {
  left: Math.max(0, left - padding),
  top: Math.max(0, top - padding),
  width: Math.min(info.width, right + padding + 1) - Math.max(0, left - padding),
  height: Math.min(info.height, bottom + padding + 1) - Math.max(0, top - padding),
};

await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .extract(crop)
  .png({ compressionLevel: 9, palette: false })
  .toFile(outputPath);

console.log(
  JSON.stringify({
    input: path.resolve(inputPath),
    output: path.resolve(outputPath),
    original: { width: info.width, height: info.height },
    crop,
    removedPixels,
  }),
);
