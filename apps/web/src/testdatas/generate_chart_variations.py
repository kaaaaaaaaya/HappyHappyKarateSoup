#!/usr/bin/env python3
"""
Generate chart JSON variations for HappyHappyKarateSoup.

Output format (same shape as charData-demo.json):
[
  [timeMs, "punch"|"chop", ingredientIndex(0-2), laneX(-100..100)],
  ... 100 notes ...
]

Rules:
- 100 notes per file
- final note time is exactly 120000 ms
- minimum interval between adjacent notes is 1000 ms
"""

from __future__ import annotations

import json
import random
from pathlib import Path

NOTE_COUNT = 10
FINAL_TIME_MS = 10_000
MIN_GAP_MS = 500
VARIATION_COUNT = 10
ACTIONS = ["punch", "chop"]
INGREDIENT_INDEXES = [0, 1, 2]
LANE_MIN = -100
LANE_MAX = 100


def generate_intervals(
    note_count: int,
    final_time_ms: int,
    min_gap_ms: int,
    rng: random.Random,
) -> list[int]:
    """Generate `note_count` intervals that sum to `final_time_ms` with each >= min_gap_ms."""
    minimum_total = note_count * min_gap_ms
    if minimum_total > final_time_ms:
        raise ValueError(
            f"Impossible constraints: note_count*min_gap_ms={minimum_total} > {final_time_ms}"
        )

    extra = final_time_ms - minimum_total

    # Randomly split `extra` into `note_count` buckets using cut points.
    cut_points = sorted(rng.randint(0, extra) for _ in range(note_count - 1))
    extras: list[int] = []
    previous = 0
    for point in cut_points:
        extras.append(point - previous)
        previous = point
    extras.append(extra - previous)

    return [min_gap_ms + v for v in extras]


def build_chart(rng: random.Random) -> list[list[int | str]]:
    intervals = generate_intervals(
        note_count=NOTE_COUNT,
        final_time_ms=FINAL_TIME_MS,
        min_gap_ms=MIN_GAP_MS,
        rng=rng,
    )

    chart: list[list[int | str]] = []
    current_time = 0
    for gap in intervals:
        current_time += gap
        action = rng.choice(ACTIONS)
        ingredient_index = rng.choice(INGREDIENT_INDEXES)
        lane_x = rng.randint(LANE_MIN, LANE_MAX)
        chart.append([current_time, action, ingredient_index, lane_x])

    return chart


def validate_chart(chart: list[list[int | str]]) -> None:
    if len(chart) != NOTE_COUNT:
        raise ValueError(f"Invalid note count: {len(chart)}")

    last_time = chart[-1][0]
    if last_time != FINAL_TIME_MS:
        raise ValueError(f"Invalid final time: {last_time} (expected {FINAL_TIME_MS})")

    for i in range(1, len(chart)):
        gap = int(chart[i][0]) - int(chart[i - 1][0])
        if gap < MIN_GAP_MS:
            raise ValueError(f"Gap too small at index {i}: {gap} ms")


def main() -> None:
    script_dir = Path(__file__).resolve().parent

    for i in range(1, VARIATION_COUNT + 1):
        rng = random.Random()  # different random stream per file
        chart = build_chart(rng)
        validate_chart(chart)

        output_path = script_dir / f"charData-random-{i:02}.json"
        output_path.write_text(
            json.dumps(chart, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"generated: {output_path.name}")


if __name__ == "__main__":
    main()
