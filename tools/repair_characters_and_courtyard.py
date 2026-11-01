"""Produce independent, transparent 4x4 walk sprites from original approved cast
and an empty courtyard where furniture is placed at runtime.
This transforms user-approved project artwork, not assets from other games.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import cv2
import numpy as np
import random

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'tools/reference/approved-character-sheet.webp'
if not ART.exists():
    raise SystemExit('Original approved character contact sheet missing. Use the repo sprite assets as fallback.')
src = Image.open(ART).convert('RGB')

# Calibrated centroids for each character's 4 walk frames
cols = {
    'ngu-choi': [123, 172, 220, 269],
    'chu-tam':  [347, 391, 436, 481],
    'co-sau':   [558, 603, 648, 692],
    'dau-bep':  [767, 813, 858, 904],
    'phuc-vu':  [977, 1021, 1065, 1109],
    'khach-nam':[1180, 1222, 1264, 1306],
    'khach-nu': [1373, 1415, 1457, 1500],
}
# Source is rows down / left / right / up, four successive walking frames each
rows = [(193, 264), (262, 330), (330, 399), (398, 473)]
folder = ROOT / 'public/assets/pixel/characters'
folder.mkdir(parents=True, exist_ok=True)
half_w = 19

for name, xs in cols.items():
    sheet = Image.new('RGBA', (256, 384), (0, 0, 0, 0))
    for direction, (y0, y1) in enumerate(rows):
        for frame, x in enumerate(xs):
            crop = src.crop((x - half_w, y0, x + half_w, y1))
            rgb = np.array(crop).astype(np.int16)
            r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
            # The backdrop is a fairly uniform plum color; only discard these pixels.
            mask = (b > r + 6) & (b > g + 18) & (r >= 48) & (r < 137) & (g >= 30) & (g < 105)
            alpha = np.where(mask, 0, 255).astype('uint8')
            n, labels, stats, centroids = cv2.connectedComponentsWithStats((alpha > 0).astype('uint8'), 8)
            good = np.zeros_like(alpha)
            
            # Isolate ONLY the single primary character at center, stripping any adjacent character intrusions
            if n > 1:
                valid = []
                for j in range(1, n):
                    area = stats[j, cv2.CC_STAT_AREA]
                    if area < 6: continue
                    cx = centroids[j][0]
                    is_edge = (stats[j, cv2.CC_STAT_LEFT] == 0 or (stats[j, cv2.CC_STAT_LEFT] + stats[j, cv2.CC_STAT_WIDTH] >= half_w * 2))
                    dist = abs(cx - half_w)
                    valid.append((j, area, dist, is_edge))
                if valid:
                    # Score by area while penalizing distance from crop center
                    primary = max(valid, key=lambda c: c[1] - c[2] * 25)
                    prim_j = primary[0]
                    prim_cx = centroids[prim_j][0]
                    for j, area, dist, is_edge in valid:
                        # Include only components belonging to the primary character
                        if abs(centroids[j][0] - prim_cx) <= 13:
                            if not (is_edge and area < 250 and dist > 9):
                                good[labels == j] = 255

            rgba = np.concatenate([rgb.clip(0, 255).astype('uint8'), good[:, :, None]], axis=2)
            pic = Image.fromarray(rgba, 'RGBA')
            bbox = pic.getbbox()
            if not bbox: continue
            pic = pic.crop(bbox)
            pic.thumbnail((56, 80), Image.Resampling.LANCZOS)
            # Correct: EVERY frame is at its own x/y atlas position with exactly 1 character
            px = frame * 64 + (64 - pic.width) // 2
            py = direction * 96 + 96 - pic.height - 4
            sheet.paste(pic, (px, py))
    sheet.save(folder / f'{name}.png', optimize=True)

# Generate fallback aliases so any legacy references also have clean single-character frames
for src_name, dst_name in [('khach-nam', 'khach-xanh'), ('khach-nu', 'khach-tim'), ('khach-nam', 'khach-vang'), ('chu-tam', 'ngu-dan'), ('phuc-vu', 'nhan-vien')]:
    src_file = folder / f'{src_name}.png'
    dst_file = folder / f'{dst_name}.png'
    if src_file.exists():
        dst_file.write_bytes(src_file.read_bytes())

print('Successfully exported all clean 1-character-per-frame sprite sheets!')
