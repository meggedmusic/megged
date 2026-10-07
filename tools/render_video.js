// Renders the music visuals to a phone video (video/crispy-pork-skin-phone.mp4).
// Serve the site on :8778, then: node tools/render_video.js master.mp4 171 && re-encode at 540 wide, crf 35.
// Fake clock + seeded random, one screenshot per frame piped to ffmpeg. Args: OUT.mp4 SECONDS [OFFSET_MS] [FPS]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const [out, secs, off = '0', fpsArg = '30'] = process.argv.slice(2);
const FPS = +fpsArg, N = Math.round(+secs * FPS), OFF = +off;
const W = 400, H = 760, DPR = 1.8;
const CLOCK = `(() => {
  let vt = 0, seq = 0; const timers = new Map(); let rafs = [];
  let s = 12345; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const base = 1760000000000;
  performance.now = () => vt; Date.now = () => base + vt;
  window.setTimeout = (fn, d, ...a) => { const id = ++seq; timers.set(id, { t: vt + Math.max(0, +d || 0), fn, a }); return id; };
  window.setInterval = (fn, d, ...a) => { const id = ++seq; timers.set(id, { t: vt + Math.max(1, +d || 0), fn, a, every: Math.max(1, +d || 0) }); return id; };
  window.clearTimeout = window.clearInterval = id => timers.delete(id);
  window.requestAnimationFrame = fn => { rafs.push([++seq, fn]); return seq; };
  window.cancelAnimationFrame = id => { rafs = rafs.filter(r => r[0] !== id); };
  const seen = new WeakMap();
  window.__advance = async (dt) => {
    const target = vt + dt;
    for (;;) {
      let best = null, bid = 0;
      for (const [id, x] of timers) if (x.t <= target && (!best || x.t < best.t)) { best = x; bid = id; }
      if (!best) break;
      vt = best.t;
      if (best.every) best.t += best.every; else timers.delete(bid);
      try { typeof best.fn === 'function' ? best.fn(...best.a) : 0; } catch (e) { console.error(e); }
      await Promise.resolve(); await Promise.resolve();
    }
    vt = target;
    const r = rafs; rafs = [];
    for (const [, fn] of r) { try { fn(vt); } catch (e) { console.error(e); } }
    await Promise.resolve();
    for (const a of document.getAnimations()) {
      if (!seen.has(a)) seen.set(a, vt);
      a.pause(); a.currentTime = vt - seen.get(a);
    }
  };
  window.__vt = () => vt;
})();`;
const MOCK = `(function(){
 var L={},pos=0,paused=true,t0=0;function emit(){(L.playback_update||[]).forEach(function(fn){fn({data:{position:paused?pos:pos+(performance.now()-t0),isPaused:paused,duration:220000}})});}
 var c={addListener:function(n,fn){(L[n]=L[n]||[]).push(fn)},seek:function(s){pos=s*1000+${OFF};t0=performance.now();emit()},play:function(){paused=false;t0=performance.now();window.__played=performance.now();emit()},pause:function(){},togglePlay:function(){}};
 var api={createController:function(el,o,cb){cb(c);setTimeout(function(){(L.ready||[]).forEach(function(f){f({})})},0)}};
 window.onSpotifyIframeApiReady&&window.onSpotifyIframeApiReady(api);
})();`;
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: DPR });
  p.on('pageerror', e => console.error('pageerror', e.message));
  await p.addInitScript(CLOCK);
  await p.route('https://open.spotify.com/embed/iframe-api/v1', r => r.fulfill({ contentType: 'application/javascript', body: MOCK }));
  await p.route(/open\.spotify\.com\/embed\/artist|youtube|google/, r => r.fulfill({ contentType: 'text/html', body: '' }));
  await p.goto('http://127.0.0.1:8778/', { waitUntil: 'load' });
  await p.addStyleTag({ content: '.platforms,nav,#play-btn,.scroll-cue,.sync-panel{visibility:hidden!important} html,body{scrollbar-width:none}' });
  for (let i = 0; i < 30; i++) await p.evaluate(() => __advance(33.3333));   // settle
  await p.evaluate(() => document.getElementById('play-btn').click());
  // let the API script + map load (real time), stepping the fake clock until playback starts
  for (let i = 0; i < 200 && !(await p.evaluate(() => window.__played)); i++) { await p.evaluate(() => __advance(1)); await p.waitForTimeout(20); }
  const cdp = await p.context().newCDPSession(p);
  const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-ss', String(OFF / 1000), '-i', '/home/claude/megged/audio/crispy-pork-skin.mp3',
    '-map', '0:v', '-map', '1:a', '-shortest',
    '-vf', 'scale=720:-2', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    '-c:a', 'aac', '-b:a', '160k', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let k = 0; k < N; k++) {
    await p.evaluate(dt => __advance(dt), 1000 / FPS);
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92 });
    if (!ff.stdin.write(Buffer.from(data, 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
    if (k % 150 === 0) console.log('frame', k, '/', N, ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  await b.close(); console.log('done', ((Date.now() - t0) / 1000).toFixed(0) + 's');
})();
