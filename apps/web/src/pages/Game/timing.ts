// Game timing constants shared by render animation and judgment logic.
export const NOTE_ANIMATION_MS = 2000;

// Judge lane is visually around y=80% on the game field.
export const JUDGE_LANE_RATIO = 0.8;

// Spawn this many ms before target timing so note reaches judge lane at target.
export const NOTE_SPAWN_LEAD_MS = Math.round(NOTE_ANIMATION_MS * JUDGE_LANE_RATIO);
