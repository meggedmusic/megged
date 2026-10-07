"""Build data/track-map.json from an audio file so the site can react to the music.

    python3 tools/analyze_track.py track.wav

Finds kicks (low band), snares (mid band) and hats (high band) as timed hits,
plus a smoothed energy curve per band. Only this map goes on the site, never the audio.
"""
import json, subprocess, sys
import numpy as np
from scipy.ndimage import maximum_filter1d, uniform_filter1d

SR, HOP, N = 22050, 512, 2048
BANDS = {"kick": (30, 150), "snare": (150, 2500), "hat": (5000, 11000)}

def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32)

def main(path, out="data/track-map.json"):
    x = load(path)
    win = np.hanning(N).astype(np.float32)
    frames = np.lib.stride_tricks.sliding_window_view(np.pad(x, (N // 2, N // 2)), N)[::HOP] * win
    mag = np.abs(np.fft.rfft(frames, axis=1))
    freqs = np.fft.rfftfreq(N, 1 / SR)
    dt = HOP / SR
    hits, energy = [], {}
    for name, (lo, hi) in BANDS.items():
        band = np.log1p(mag[:, (freqs >= lo) & (freqs < hi)]).sum(axis=1)
        flux = np.maximum(np.diff(band, prepend=band[0]), 0)            # rising energy = transient
        thr = uniform_filter1d(flux, 43) * 1.6 + flux.std() * 0.3      # adaptive threshold (~1s)
        peaks = (flux == maximum_filter1d(flux, 7)) & (flux > thr)
        gap = {"kick": 0.12, "snare": 0.12, "hat": 0.06}[name]
        cand = np.flatnonzero(peaks)
        top = np.percentile(flux[cand], 95) if len(cand) else 1
        win = int(3 / dt)                        # loudness of nearby hits (±3 s), so quiet
        last = -1                                # sections still get strong flashes
        for i in cand:
            t = i * dt
            if t - last < gap: continue
            last = t
            near = flux[cand[(cand > i - win) & (cand < i + win)]]
            local = np.percentile(near, 90) if len(near) else top
            st = 0.6 * min(1, flux[i] / local) + 0.4 * min(1, flux[i] / top)
            hits.append([int(round(t * 1000)), name[0], round(float(st), 2)])
        e = uniform_filter1d(band, 4)
        e = (e - np.percentile(e, 5)) / (np.percentile(e, 98) - np.percentile(e, 5) + 1e-9)
        energy[name[0]] = [int(v) for v in np.clip(e[::2] * 99, 0, 99)]  # every ~46 ms
    hits.sort()
    # quiet / atmospheric parts: little low end for a while (no beat)
    hop = 2 * dt
    low = uniform_filter1d(np.array(energy["k"], float), int(3 / hop))
    quiet, start = [], None
    for i, v in enumerate(np.append(low, 99)):
        if v < 50 and start is None: start = i
        elif v >= 50 and start is not None:
            if quiet and start * hop - quiet[-1][1] / 1000 < 3: quiet[-1][1] = int(i * hop * 1000)
            else: quiet.append([int(start * hop * 1000), int(i * hop * 1000)])
            start = None
    quiet = [q for q in quiet if q[1] - q[0] >= 6000]
    data = {"hop_ms": round(hop * 1000, 3), "hits": hits, "energy": energy, "quiet": quiet}
    json.dump(data, open(out, "w"), separators=(",", ":"))
    for k in "ksh": print(k, sum(1 for h in hits if h[1] == k), "hits")
    print("quiet parts (s):", [(q[0] / 1000, q[1] / 1000) for q in quiet])
    print("duration", round(len(x) / SR, 1), "s ->", out)

if __name__ == "__main__":
    main(*sys.argv[1:])
