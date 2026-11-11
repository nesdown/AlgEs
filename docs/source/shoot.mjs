// Saves PNG screenshots of pages through Chrome's debugging protocol.
// node docs/source/shoot.mjs shots.json
// A shot with "frames" saves a numbered sequence instead: it runs `frames.step` with i = 0, 1, 2 ... before each capture.
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const shots = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const work = mkdtempSync(path.join(tmpdir(), 'shoot-'));
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${work}/profile`, '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try {
    target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page');
  } catch {}
}
if (!target) throw new Error('Chrome did not start');
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const waiting = new Map();
ws.addEventListener('message', (e) => {
  const msg = JSON.parse(e.data);
  if (msg.id && waiting.has(msg.id)) {
    waiting.get(msg.id)(msg);
    waiting.delete(msg.id);
  }
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const n = ++id;
  waiting.set(n, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
  ws.send(JSON.stringify({ id: n, method, params }));
});
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
};

try {
  await send('Page.enable');
  for (const shot of shots) {
    const { width = 1440, height = 900, scale = 2 } = shot;
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: !!shot.mobile });
    await send('Page.navigate', { url: shot.url });
    await sleep(shot.load ?? 1500);
    await evaluate('document.fonts.ready.then(() => true)');
    if (shot.run) {
      const said = await evaluate(`(async () => { ${shot.run} })()`);
      if (said !== undefined) console.log(`${shot.out}: ${JSON.stringify(said)}`);
    }
    await sleep(shot.settle ?? 900);
    if (shot.frames) {
      let i = 0;
      for (; i < shot.frames.count; i++) {
        const more = await evaluate(`((i) => { ${shot.frames.step} })(${i})`);
        await sleep(shot.frames.wait ?? 60);
        const { data } = await send('Page.captureScreenshot', { format: 'png' });
        writeFileSync(path.join(shot.out, `frame-${String(i).padStart(4, '0')}.png`), Buffer.from(data, 'base64'));
        if (more === false) break;
      }
      console.log(`saved ${i + 1} frames to ${shot.out}`);
      continue;
    }
    const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    writeFileSync(shot.out, Buffer.from(data, 'base64'));
    console.log(`saved ${shot.out}`);
  }
} finally {
  ws.close();
  chrome.kill();
  await sleep(300);
  rmSync(work, { recursive: true, force: true });
}
