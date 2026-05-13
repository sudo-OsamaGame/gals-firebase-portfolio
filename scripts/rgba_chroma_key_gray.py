#!/usr/bin/env python3
"""Remove solid outer background from a PNG via edge-connected flood fill.

Default mode removes a light gray card (e.g. Zormim sticker).
Use ``--dark`` for a near-black field (e.g. Exponential logo on black).
"""
from __future__ import annotations

import sys
from collections import deque


def rgb_dist(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5


def saturation(rgb: tuple[int, int, int]) -> int:
    r, g, b = rgb
    return max(r, g, b) - min(r, g, b)


def main() -> int:
    argv = sys.argv[1:]
    if not argv:
        print(
            "usage: rgba_chroma_key_gray.py <image.png> [--dark]",
            file=sys.stderr,
        )
        return 2
    path = argv[0]
    dark_mode = len(argv) > 1 and argv[1] in ("--dark", "dark")
    try:
        from PIL import Image
    except ImportError:
        print("Install Pillow: pip install pillow", file=sys.stderr)
        return 1

    img = Image.open(path).convert("RGBA")
    w, h = img.size
    px = img.load()

    edge_samples: list[tuple[int, int, int]] = []
    for x in range(w):
        edge_samples.append(px[x, 0][:3])
        edge_samples.append(px[x, h - 1][:3])
    for y in range(h):
        edge_samples.append(px[0, y][:3])
        edge_samples.append(px[w - 1, y][:3])

    if dark_mode:

        def looks_like_dark_field(c: tuple[int, int, int]) -> bool:
            r, g, b = c
            if max(r, g, b) > 72:
                return False
            if saturation(c) > 52:
                return False
            return True

        seeds = [c for c in edge_samples if looks_like_dark_field(c)]
        if not seeds:
            seeds = [(0, 0, 0)]

        ref = (
            sum(c[0] for c in seeds) // len(seeds),
            sum(c[1] for c in seeds) // len(seeds),
            sum(c[2] for c in seeds) // len(seeds),
        )

        tol = 44
        sat_max = 55
    else:

        def looks_like_gray_card(c: tuple[int, int, int]) -> bool:
            r, g, b = c
            if max(r, g, b) < 120:
                return False
            if saturation(c) > 34:
                return False
            return True

        grays = [c for c in edge_samples if looks_like_gray_card(c)]
        if not grays:
            grays = edge_samples[:8]

        ref = (
            sum(c[0] for c in grays) // len(grays),
            sum(c[1] for c in grays) // len(grays),
            sum(c[2] for c in grays) // len(grays),
        )

        tol = 52
        sat_max = 40
    visited = [[False] * w for _ in range(h)]
    q: deque[tuple[int, int]] = deque()

    def seed(x: int, y: int) -> None:
        if x < 0 or x >= w or y < 0 or y >= h:
            return
        c = px[x, y][:3]
        if rgb_dist(c, ref) <= tol and saturation(c) <= sat_max:
            q.append((x, y))

    for x in range(w):
        seed(x, 0)
        seed(x, h - 1)
    for y in range(h):
        seed(0, y)
        seed(w - 1, y)

    while q:
        x, y = q.popleft()
        if visited[y][x]:
            continue
        r, g, b, a = px[x, y]
        if a < 12:
            visited[y][x] = True
            continue
        c = (r, g, b)
        if rgb_dist(c, ref) > tol or saturation(c) > sat_max:
            continue
        visited[y][x] = True
        px[x, y] = (r, g, b, 0)
        for dx, dy in ((0, 1), (0, -1), (1, 0), (-1, 0)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and not visited[ny][nx]:
                q.append((nx, ny))

    img.save(path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
