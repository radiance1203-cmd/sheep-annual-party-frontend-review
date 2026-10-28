import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { strict as assert } from 'node:assert';
const folder = 'art-source/r3/a-window-props-20261028';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1024, height: 512 }, deviceScaleFactor: 1 });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block}</style>${await readFile(`${folder}/props-materials-a.svg`, 'utf8')}`);
  await page.screenshot({ path: `${folder}/props-materials-a.png`, omitBackground: true });
  const png = await readFile(`${folder}/props-materials-a.png`);
  assert.equal(png.readUInt32BE(16), 1024); assert.equal(png.readUInt32BE(20), 512);
  await writeFile(`${folder}/rasterization.json`, JSON.stringify({ method: 'native browser SVG rasterization, no post-editing', browser: browser.version(), pngSha256: createHash('sha256').update(png).digest('hex'), sourceSha256: createHash('sha256').update(await readFile(`${folder}/props-materials-a.svg`)).digest('hex'), size: [1024, 512], sampleArtAccepted: false, productionArtAccepted: false }, null, 2));
} finally { await browser.close(); }
