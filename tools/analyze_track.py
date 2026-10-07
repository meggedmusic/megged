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
        last = -1
        top = np.percentile(flux[peaks], 95) if peaks.any() else 1
        for i in np.flatnonzero(peaks):
            t = i * dt
            if t - last < gap: continue
            last = t
            hits.append([int(round(t * 1000)), name[0], round(float(min(1, flux[i] / top)), 2)])
        e = uniform_filter1d(band, 4)
        e = (e - np.percentile(e, 5)) / (np.percentile(e, 98) - np.percentile(e, 5) + 1e-9)
        energy[name[0]] = [int(v) for v in np.clip(e[::2] * 99, 0, 99)]  # every ~46 ms
    hits.sort()
    data = {"hop_ms": round(2 * dt * 1000, 3), "hits": hits, "energy": energy}
    json.dump(data, open(out, "w"), separators=(",", ":"))
    for k in "ksh": print(k, sum(1 for h in hits if h[1] == k), "hits")
    print("duration", round(len(x) / SR, 1), "s ->", out)

if __name__ == "__main__":
    main(*sys.argv[1:])
