#!/usr/bin/env python3
"""
Generate chart JSON files for HappyHappyKarateSoup.

Output format:
[
    [timeMs, "punch"|"chop", ingredientIndex(0-2), laneX(-100..100)],
    ...
]

Targets:
- test: 15s chart x 1
- demo: 60s chart x 1
- play/easy:   90s chart x 10
- play/normal: 90s chart x 10
- play/hard:   90s chart x 10
"""

from __future__ import annotations

import json
import random
from pathlib import Path

ACTIONS = ["punch", "chop"]
INGREDIENT_INDEXES = [0, 1, 2]
LANE_MIN = -100
LANE_MAX = 100

# Game-side spawn timing:
# note appears when elapsed >= (targetTime - animationDuration)
# animationDuration is currently 2000ms in useGameLogic.ts.
SPAWN_ANIMATION_DURATION_MS = 2_000
FIRST_NOTE_SAFETY_MARGIN_MS = 300
DEFAULT_FIRST_NOTE_MIN_MS = SPAWN_ANIMATION_DURATION_MS + FIRST_NOTE_SAFETY_MARGIN_MS


CHART_PROFILES = [
    {
        "name": "test",
        "output_dir": "test",
        "file_prefix": "charData-test-15s",
        "count": 1,
        "note_count": 15,
        "final_time_ms": 15_000,
        "min_gap_ms": 800,
    },
    {
        "name": "demo",
        "output_dir": "demo",
        "file_prefix": "charData-demo-60s",
        "count": 1,
        "note_count": 60,
        "final_time_ms": 60_000,
        "min_gap_ms": 800,
    },
    {
        "name": "demo",
        "output_dir": "demo",
        "file_prefix": "charData-demo-30s",
        "count": 1,
        "note_count": 30,
        "final_time_ms": 30_000,
        "min_gap_ms": 800,
    },
    {
        "name": "demo",
        "output_dir": "demo",
        "file_prefix": "charData-demo-20s",
        "count": 1,
        "note_count": 20,
        "final_time_ms": 20_000,
        "min_gap_ms": 800,
    },
    {
        "name": "play-easy",
        "output_dir": "play/easy",
        "file_prefix": "charData-play-easy-90s",
        "count": 10,
        "note_count": 60,
        "final_time_ms": 90_000,
        "min_gap_ms": 800,
        "first_note_exact_ms": 3_000,
    },
    {
        "name": "play-normal",
        "output_dir": "play/normal",
        "file_prefix": "charData-play-normal-90s",
        "count": 10,
        "note_count": 75,
        "final_time_ms": 90_000,
        "min_gap_ms": 600,
        "first_note_exact_ms": 3_000,
    },
    {
        "name": "play-hard",
        "output_dir": "play/hard",
        "file_prefix": "charData-play-hard-90s",
        "count": 10,
        "note_count": 113,
        "final_time_ms": 90_000,
        "min_gap_ms": 450,
        "first_note_exact_ms": 3_000,
    },
]


def generate_intervals(
    note_count: int,
    final_time_ms: int,
    min_gap_ms: int,
    first_note_min_ms: int,
    first_note_exact_ms: int | None,
    rng: random.Random,
) -> list[int]:
    """Generate `note_count` intervals that sum to `final_time_ms` with each >= min_gap_ms."""
    first_gap_min = max(min_gap_ms, first_note_min_ms)
    first_gap = first_gap_min
    if first_note_exact_ms is not None:
        if first_note_exact_ms < first_gap_min:
            raise ValueError(
                f"first_note_exact_ms({first_note_exact_ms}) must be >= {first_gap_min}"
            )
        first_gap = first_note_exact_ms
    base_intervals = [min_gap_ms] * note_count
    base_intervals[0] = first_gap

    minimum_total = sum(base_intervals)
    if minimum_total > final_time_ms:
        raise ValueError(
            "Impossible constraints: "
            f"first_gap_min + (note_count-1)*min_gap_ms={minimum_total} > {final_time_ms}"
        )

    extra = final_time_ms - minimum_total

    # Randomly split `extra` into buckets.
    # If first note is fixed, do not add extra to index 0.
    if first_note_exact_ms is not None:
        if note_count <= 1:
            extras = [0]
        else:
            cut_points = sorted(rng.randint(0, extra) for _ in range(note_count - 2))
            tail_extras: list[int] = []
            previous = 0
            for point in cut_points:
                tail_extras.append(point - previous)
                previous = point
            tail_extras.append(extra - previous)
            extras = [0, *tail_extras]
    else:
        cut_points = sorted(rng.randint(0, extra) for _ in range(note_count - 1))
        extras = []
        previous = 0
        for point in cut_points:
            extras.append(point - previous)
            previous = point
        extras.append(extra - previous)

    return [base + v for base, v in zip(base_intervals, extras)]


def build_chart(
    rng: random.Random,
    *,
    note_count: int,
    final_time_ms: int,
    min_gap_ms: int,
    first_note_min_ms: int = DEFAULT_FIRST_NOTE_MIN_MS,
    first_note_exact_ms: int | None = None,
) -> list[list[int | str]]:
    intervals = generate_intervals(
        note_count=note_count,
        final_time_ms=final_time_ms,
        min_gap_ms=min_gap_ms,
        first_note_min_ms=first_note_min_ms,
        first_note_exact_ms=first_note_exact_ms,
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


def validate_chart(
    chart: list[list[int | str]],
    *,
    expected_note_count: int,
    expected_final_time_ms: int,
    expected_min_gap_ms: int,
    expected_first_note_min_ms: int,
    expected_first_note_exact_ms: int | None = None,
) -> None:
    if len(chart) != expected_note_count:
        raise ValueError(f"Invalid note count: {len(chart)}")

    last_time = chart[-1][0]
    if last_time != expected_final_time_ms:
        raise ValueError(
            f"Invalid final time: {last_time} (expected {expected_final_time_ms})"
        )

    first_time = int(chart[0][0])
    if first_time < expected_first_note_min_ms:
        raise ValueError(
            f"First note too early: {first_time} (expected >= {expected_first_note_min_ms})"
        )
    if expected_first_note_exact_ms is not None and first_time != expected_first_note_exact_ms:
        raise ValueError(
            f"First note mismatch: {first_time} (expected {expected_first_note_exact_ms})"
        )

    for i in range(1, len(chart)):
        gap = int(chart[i][0]) - int(chart[i - 1][0])
        if gap < expected_min_gap_ms:
            raise ValueError(f"Gap too small at index {i}: {gap} ms")


def main() -> None:
    script_dir = Path(__file__).resolve().parent

    for profile in CHART_PROFILES:
        output_dir = script_dir / profile["output_dir"]
        output_dir.mkdir(parents=True, exist_ok=True)

        for i in range(1, profile["count"] + 1):
            rng = random.Random()  # different random stream per file
            first_note_min_ms = int(
                profile.get("first_note_min_ms", DEFAULT_FIRST_NOTE_MIN_MS)
            )
            first_note_exact_ms = profile.get("first_note_exact_ms")
            chart = build_chart(
                rng,
                note_count=profile["note_count"],
                final_time_ms=profile["final_time_ms"],
                min_gap_ms=profile["min_gap_ms"],
                first_note_min_ms=first_note_min_ms,
                first_note_exact_ms=first_note_exact_ms,
            )

            validate_chart(
                chart,
                expected_note_count=profile["note_count"],
                expected_final_time_ms=profile["final_time_ms"],
                expected_min_gap_ms=profile["min_gap_ms"],
                expected_first_note_min_ms=first_note_min_ms,
                expected_first_note_exact_ms=first_note_exact_ms,
            )

            output_path = output_dir / f"{profile['file_prefix']}-{i:02}.json"
            output_path.write_text(
                json.dumps(chart, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            print(f"generated: {output_path}")


if __name__ == "__main__":
    main()
