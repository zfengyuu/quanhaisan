# Pixel Art asset inventory

Everything inside `public/assets/pixel/` is original art generated for **Quán Hải Sản – Chuyện Bến Nhỏ**, not extracted from any third-party game. The hand-drawn-at-low-resolution palette and mechanics are a preliminary MVP asset pass; professional game-ready production art may later replace each file without changing the interface IDs.

| Folder | Count | Purpose |
|---|---:|---|
| seafood | 7 | 48 × 48 pixel inventory item art, exported as 144 × 144 transparent PNG |
| characters | 6 | 4 directions × 4 frames sheets. Native cell 32 × 48, export cell 64 × 96; order: facing front, left, right, back |
| props | 10 | 64 × 64 pixel objects exported as 128 × 128 transparent PNG |
| story | 5 | 320 × 176 pixel chapter plates, exported 640 × 352 |
| story portraits | 2 | Extracted from original sheets for story dialogue |

There are **30 original PNG images** plus `catalog.json` containing stable paths. `public/assets/harbor-map.webp` and `public/assets/concept-preview.webp` are existing art made for this project in earlier steps.

The `public/assets/audio/` folder contains 6 original synthetic WAV cue files, exported at 22,050 Hz mono.

## Regenerate

```bash
python3 -m pip install Pillow
python3 tools/generate_assets.py
python3 tools/generate_audio.py
```

## How frames are mapped

In Phaser, load spritesheets with `{frameWidth:64, frameHeight:96}`. Row 0 → frames 0–3 front; row 1 → frames 4–7 left; row 2 → frames 8–11 right; row 3 → frames 12–15 back. Image scaling is nearest neighbor. Each sprite is a logical 32 × 48 px unit at authored size.

## Asset acceptance checklist

- Character movement direction consistent across variants
- Pixel scaling integer or near-neighbor without blurring
- Transparent background for inventory items, characters, and movable objects
- No text baked into HUD sprites
- QR image is user-provided and not generated or stored in source until added
- Map concept is still a single painted scene: production collision/tile extraction remains future work

### Dàn nhân vật được duyệt – bản cập nhật

- `/assets/pixel/characters/ngu-choi.png` — Nhân vật chính, áo kem, quần xanh, túi vải
- `/assets/pixel/characters/chu-tam.png` — Chú Tám, nón rơm, râu bạc
- `/assets/pixel/characters/co-sau.png` — Cô Sáu, khăn tím, tạp dề xanh
- `/assets/pixel/characters/dau-bep.png` — Đầu bếp Lành, khăn trắng, tạp dề xanh
- `/assets/pixel/characters/phuc-vu.png` — Phục vụ Mai, tạp dề đỏ, nơ tóc
- `/assets/pixel/characters/khach-nam.png` — Khách nam, áo xanh
- `/assets/pixel/characters/khach-nu.png` — Khách nữ, áo hồng

Mỗi sheet `256×384`, chia `4×4`, frame `64×96`. Chân dung ở `assets/pixel/portraits/*.webp`. Không sao chép asset từ Ốc Đêm.
