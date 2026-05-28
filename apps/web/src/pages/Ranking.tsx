import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BrandedConnectionBackground from '../components/BrandedConnectionBackground';
import {
  fetchWeeklyCaloriesRanking,
  fetchWeeklyScoreRanking,
  type WeeklyCaloriesRankingEntry,
  type WeeklyScoreRankingEntry,
} from '../api/rankingApi';
import { fetchControllerRoomStatus } from '../api/controllerRoomApi';

type Tab = 'score' | 'calories';
type Difficulty = 'easy' | 'normal' | 'hard';

const DIFFICULTIES: Array<{ key: Difficulty; label: string }> = [
  { key: 'easy', label: 'EASY' },
  { key: 'normal', label: 'NORMAL' },
  { key: 'hard', label: 'HARD' },
];

const DEFAULT_ICON = '/images/logo_small.png';
const DEBUG_VIEWER_USER_ID = 1;

const isMockModeEnabled = (): { enabled: boolean; count: number } => {
  const params = new URLSearchParams(window.location.search);
  const enabled = params.get('mock') === '1'
    && (import.meta.env.DEV || ['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname));
  const countRaw = Number.parseInt(params.get('count') ?? '80', 10);
  const count = Number.isFinite(countRaw) ? Math.max(1, Math.min(500, countRaw)) : 80;
  return { enabled, count };
};

const pickBelt = (soupCount: number): string => {
  if (soupCount >= 100) return '黒';
  if (soupCount >= 80) return '茶';
  if (soupCount >= 60) return '赤';
  if (soupCount >= 40) return '黄';
  if (soupCount >= 25) return '緑';
  if (soupCount >= 10) return '紫';
  return '白';
};

// [EN] UI color mapping for belt labels (name text only).
// [JA] 帯ラベルに対応する表示色（名前文字色のみ）。
const BELT_STYLE_MAP: Record<string, { text: string }> = {
  黒: { text: '#111' },
  茶: { text: '#5d3a1a' },
  赤: { text: '#b71c1c' },
  黄: { text: '#9a6a00' },
  緑: { text: '#1b5e20' },
  紫: { text: '#4a148c' },
  白: { text: '#444' },
};

// [EN] Resolve belt color styles with a safe fallback.
// [JA] 帯色スタイルを解決し、未定義はデフォルトにフォールバック。
const resolveBeltStyle = (beltColor?: string | null): { text: string } => {
  return BELT_STYLE_MAP[beltColor ?? ''] ?? { text: '#333' };
};

const generateMockScoreEntries = (args: { userId: number; difficulty: Difficulty; count: number }): WeeklyScoreRankingEntry[] => {
  const entries: WeeklyScoreRankingEntry[] = [];
  const base = args.difficulty === 'easy' ? 6500 : args.difficulty === 'hard' ? 12500 : 9500;

  for (let i = 0; i < args.count; i++) {
    const id = i + 1;
    const score = Math.max(0, Math.round(base - i * 37 + (i % 7) * 13));
    entries.push({
      userId: id,
      username: `Player_${String(id).padStart(3, '0')}`,
      soupIconUrl: null,
      beltColor: pickBelt((id * 7) % 120),
      rank: 0,
      difficulty: args.difficulty,
      weeklyBestScore: score,
    });
  }

  // Ensure viewer exists and has a mid-pack score so pinned layout is obvious.
  const viewerScore = Math.max(0, Math.round(base - Math.floor(args.count / 2) * 37));
  const viewerIndex = entries.findIndex((e) => e.userId === args.userId);
  if (viewerIndex >= 0) {
    entries[viewerIndex] = { ...entries[viewerIndex], weeklyBestScore: viewerScore, username: 'You', beltColor: '黒' };
  } else {
    entries.push({
      userId: args.userId,
      username: 'You',
      soupIconUrl: null,
      beltColor: '黒',
      rank: 0,
      difficulty: args.difficulty,
      weeklyBestScore: viewerScore,
    });
  }

  const sorted = [...entries].sort((a, b) => {
    if (b.weeklyBestScore !== a.weeklyBestScore) return b.weeklyBestScore - a.weeklyBestScore;
    return a.username.localeCompare(b.username);
  });

  // Dense rank
  let rank = 0;
  let prev: number | null = null;
  for (const e of sorted) {
    if (prev === null || e.weeklyBestScore !== prev) {
      rank += 1;
      prev = e.weeklyBestScore;
    }
    e.rank = rank;
  }

  // Pin viewer first
  const viewer = sorted.find((e) => e.userId === args.userId) ?? null;
  return viewer ? [viewer, ...sorted.filter((e) => e.userId !== args.userId)] : sorted;
};

const generateMockCalorieEntries = (args: { userId: number; count: number }): WeeklyCaloriesRankingEntry[] => {
  const entries: WeeklyCaloriesRankingEntry[] = [];
  for (let i = 0; i < args.count; i++) {
    const id = i + 1;
    const kcal = Math.max(0, Math.round((2200 - i * 19 + (i % 9) * 7) * 10) / 10);
    entries.push({
      userId: id,
      username: `Player_${String(id).padStart(3, '0')}`,
      soupIconUrl: null,
      beltColor: pickBelt((id * 5) % 120),
      rank: 0,
      weeklyUsedEnergyKcal: kcal,
    });
  }

  const viewerKcal = Math.round((entries[Math.floor(args.count / 2)]?.weeklyUsedEnergyKcal ?? 900) * 10) / 10;
  const viewerIndex = entries.findIndex((e) => e.userId === args.userId);
  if (viewerIndex >= 0) {
    entries[viewerIndex] = { ...entries[viewerIndex], weeklyUsedEnergyKcal: viewerKcal, username: 'You', beltColor: '黒' };
  } else {
    entries.push({
      userId: args.userId,
      username: 'You',
      soupIconUrl: null,
      beltColor: '黒',
      rank: 0,
      weeklyUsedEnergyKcal: viewerKcal,
    });
  }

  const sorted = [...entries].sort((a, b) => {
    if (b.weeklyUsedEnergyKcal !== a.weeklyUsedEnergyKcal) return b.weeklyUsedEnergyKcal - a.weeklyUsedEnergyKcal;
    return a.username.localeCompare(b.username);
  });

  let rank = 0;
  let prev: number | null = null;
  for (const e of sorted) {
    if (prev === null || e.weeklyUsedEnergyKcal !== prev) {
      rank += 1;
      prev = e.weeklyUsedEnergyKcal;
    }
    e.rank = rank;
  }

  const viewer = sorted.find((e) => e.userId === args.userId) ?? null;
  return viewer ? [viewer, ...sorted.filter((e) => e.userId !== args.userId)] : sorted;
};

export default function Ranking() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('score');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [userId, setUserId] = useState<number | null>(null);
  const [focusedSection, setFocusedSection] = useState<'back' | 'tabs' | 'difficulty'>('tabs');
  const [focusedTabIndex, setFocusedTabIndex] = useState(0);
  const [focusedDiffIndex, setFocusedDiffIndex] = useState(1);
  const connectedRoomId = sessionStorage.getItem('connectedRoomId') ?? '';
  const lastCommandSequenceRef = useRef(0);
  const isSequenceInitializedRef = useRef(false);

  const [scoreEntries, setScoreEntries] = useState<WeeklyScoreRankingEntry[]>([]);
  const [calorieEntries, setCalorieEntries] = useState<WeeklyCaloriesRankingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const authUserRaw = sessionStorage.getItem('authUser');
    if (!authUserRaw) {
      setUserId(DEBUG_VIEWER_USER_ID);
      return;
    }
    try {
      const parsed = JSON.parse(authUserRaw) as { userId?: number };
      setUserId(parsed.userId ?? DEBUG_VIEWER_USER_ID);
    } catch {
      setUserId(DEBUG_VIEWER_USER_ID);
    }
  }, []);

  useEffect(() => {
    setFocusedTabIndex(tab === 'score' ? 0 : 1);
    if (tab !== 'score' && focusedSection === 'difficulty') {
      setFocusedSection('tabs');
    }
  }, [tab]);

  useEffect(() => {
    const index = DIFFICULTIES.findIndex((d) => d.key === difficulty);
    if (index >= 0) {
      setFocusedDiffIndex(index);
    }
  }, [difficulty]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    void (async () => {
      try {
        const mock = isMockModeEnabled();
        if (mock.enabled) {
          if (tab === 'score') {
            const entries = generateMockScoreEntries({ userId, difficulty, count: mock.count });
            if (!cancelled) setScoreEntries(entries);
          } else {
            const entries = generateMockCalorieEntries({ userId, count: mock.count });
            if (!cancelled) setCalorieEntries(entries);
          }
          return;
        }

        if (tab === 'score') {
          const entries = await fetchWeeklyScoreRanking({ userId, difficulty });
          if (!cancelled) setScoreEntries(entries);
        } else {
          const entries = await fetchWeeklyCaloriesRanking({ userId });
          if (!cancelled) setCalorieEntries(entries);
        }
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to load ranking';
        if (!cancelled) setError(message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, tab, difficulty]);

  useEffect(() => {
    if (!connectedRoomId) return;
    const timerId = window.setInterval(async () => {
      try {
        const status = await fetchControllerRoomStatus(connectedRoomId, {
          since: lastCommandSequenceRef.current,
        });
        const currentSequence = status.commandSequence ?? 0;
        const incrementalCommands = status.commands ?? [];
        const commandEntries = incrementalCommands.length > 0
          ? incrementalCommands
          : currentSequence > lastCommandSequenceRef.current && status.latestCommand
            ? [{ sequence: currentSequence, command: status.latestCommand }]
            : [];

        if (!isSequenceInitializedRef.current) {
          lastCommandSequenceRef.current = currentSequence;
          isSequenceInitializedRef.current = true;
          return;
        }

        if (currentSequence > lastCommandSequenceRef.current) {
          lastCommandSequenceRef.current = currentSequence;

          for (const entry of commandEntries) {
            const cmd = (entry.command ?? '').toLowerCase().trim();

            if (cmd === 'up') {
              if (focusedSection === 'difficulty') {
                setFocusedSection('tabs');
              } else if (focusedSection === 'tabs') {
                setFocusedSection('back');
              }
            } else if (cmd === 'down') {
              if (focusedSection === 'back') {
                setFocusedSection('tabs');
              } else if (focusedSection === 'tabs' && tab === 'score') {
                setFocusedSection('difficulty');
              }
            } else if (cmd === 'left') {
              if (focusedSection === 'back') {
                setFocusedSection('tabs');
                setTab('calories');
              } else if (focusedSection === 'tabs') {
                setTab('score');
              } else if (focusedSection === 'difficulty') {
                const nextIndex = Math.max(0, focusedDiffIndex - 1);
                setDifficulty(DIFFICULTIES[nextIndex].key);
              }
            } else if (cmd === 'right') {
              if (focusedSection === 'tabs') {
                if (tab === 'calories') {
                  setFocusedSection('back');
                } else {
                  setTab('calories');
                }
              } else if (focusedSection === 'difficulty') {
                if (focusedDiffIndex >= DIFFICULTIES.length - 1) {
                  setFocusedSection('back');
                } else {
                  const nextIndex = Math.min(DIFFICULTIES.length - 1, focusedDiffIndex + 1);
                  setDifficulty(DIFFICULTIES[nextIndex].key);
                }
              }
            } else if (cmd === 'confirm') {
              if (focusedSection === 'back') {
                navigate('/home-logged-in');
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to poll controller command on ranking page:', error);
      }
    }, 250);

    return () => window.clearInterval(timerId);
  }, [connectedRoomId, focusedSection, focusedDiffIndex, navigate, tab]);

  const pinnedEntry = useMemo(() => {
    if (!userId) return null;
    const entries = tab === 'score' ? scoreEntries : calorieEntries;
    return entries.find((e) => e.userId === userId) ?? null;
  }, [tab, scoreEntries, calorieEntries, userId]);

  const listEntries = useMemo(() => {
    if (!userId) return tab === 'score' ? scoreEntries : calorieEntries;
    const entries = tab === 'score' ? scoreEntries : calorieEntries;
    return entries.filter((e) => e.userId !== userId);
  }, [tab, scoreEntries, calorieEntries, userId]);

  const styles = {
    container: {
      width: 'min(1100px, 96vw)',
      margin: '0 auto',
      padding: '0px 18px 32px',
      fontFamily: "'DotGothic16', sans-serif",
      boxSizing: 'border-box' as const,
    },
    panel: {
      borderRadius: 26,
      background: 'rgba(239, 239, 239, 0.78)',
      border: '4px solid #181818',
      boxShadow: '0 14px 28px rgba(0, 0, 0, 0.3)',
      padding: '2rem 2rem 3rem',
      boxSizing: 'border-box' as const,
    },
    headerRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '10px',
      marginBottom: '30px',
    },
    title: {
      margin: 0,
      fontSize: '60px',
      fontWeight: 900,
      lineHeight: 1.0,
      color: '#000000',
      textShadow: '1px 1px 0 #d5a703',
    },
    backButton: (focused: boolean) => ({
      border: '3px solid #111',
      borderRadius: '12px',
      padding: '10px 14px',
      background: focused ? '#ffde00' : '#fff',
      cursor: 'pointer',
      fontWeight: 800,
      boxShadow: focused ? '4px 4px 0 #000' : '2px 2px 0 #000',
    }),
    tabs: { display: 'flex', gap: '10px', marginBottom: '12px' },
    tab: (active: boolean, focused: boolean) => ({
      border: '2px solid #111',
      borderRadius: '14px',
      padding: '10px 14px',
      background: active ? '#fff2a6' : '#fff',
      outline: focused ? '1px solid #111' : 'none',
      boxShadow: focused ? '2px 2px 0 #000' : 'none',
      cursor: 'pointer',
      fontWeight: 900,
    }),
    difficultyRow: { display: 'flex', gap: '8px', marginBottom: '14px' },
    diff: (active: boolean, focused: boolean) => ({
      border: '2px solid #111',
      borderRadius: '999px',
      padding: '8px 12px',
      background: active ? '#111' : '#fff',
      color: active ? '#fff' : '#111',
      outline: focused ? '3px solid #111' : 'none',
      boxShadow: focused ? '3px 3px 0 #000' : 'none',
      cursor: 'pointer',
      fontWeight: 800,
    }),
    card: {
      background: '#fff',
      border: '4px solid #111',
      borderRadius: '18px',
      boxShadow: '4px 4px 0 #000',
      padding: '18px',
    },
    pinned: {
      marginBottom: '12px',
      background: '#fff9c4',
      border: '2px solid #111',
      borderRadius: '18px',
      boxShadow: '2px 2px 0 #000',
      padding: '18px',
    },
    row: {
      display: 'grid',
      gridTemplateColumns: '80px 1fr 160px',
      alignItems: 'center',
      gap: '14px',
      padding: '12px 0',
      borderBottom: '1px dashed #999',
    },
    rank: { fontSize: '34px', fontWeight: 900, textAlign: 'center' as const },
    userCol: { display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 },
    icon: {
      width: '64px',
      height: '64px',
      borderRadius: '12px',
      border: '2px solid #111',
      objectFit: 'cover' as const,
      background: '#eee',
      flexShrink: 0,
    },
    nameRow: { display: 'flex', alignItems: 'center', minWidth: 0 },
    name: {
      fontSize: '30px',
      fontWeight: 950,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
      minWidth: 0,
      flex: '1 1 auto',
    },
    value: { fontSize: '20px', fontWeight: 900, textAlign: 'right' as const },
    helper: { margin: '8px 0 0', color: '#333' },
    empty: { padding: '18px 0', textAlign: 'center' as const, color: '#555' },
    error: { color: '#b00020', fontWeight: 800, marginBottom: '10px' },
  };

  const renderValue = (entry: WeeklyScoreRankingEntry | WeeklyCaloriesRankingEntry) => {
    if ('weeklyBestScore' in entry) {
      return `${entry.weeklyBestScore.toLocaleString()} pt`;
    }
    return `${entry.weeklyUsedEnergyKcal.toLocaleString()} kcal`;
  };

  const renderRow = (entry: WeeklyScoreRankingEntry | WeeklyCaloriesRankingEntry) => {
    const beltStyle = resolveBeltStyle(entry.beltColor);
    return (
      <div key={`${entry.userId}-${entry.rank}`} style={styles.row}>
        <div style={styles.rank}>{entry.rank}</div>
        <div style={styles.userCol}>
          <img
            src={entry.soupIconUrl || DEFAULT_ICON}
            alt="soup"
            style={styles.icon}
            onError={(ev) => {
              (ev.currentTarget as HTMLImageElement).src = DEFAULT_ICON;
            }}
          />
          <div style={styles.nameRow}>
            <span style={{ ...styles.name, color: beltStyle.text }}>{entry.username}</span>
          </div>
        </div>
        <div style={styles.value}>{renderValue(entry)}</div>
      </div>
    );
  };

  return (
    <BrandedConnectionBackground>
      <div style={styles.container}>
        <div style={styles.panel}>
          <div style={styles.headerRow}>
            <h1 style={styles.title}>Ranking</h1>
            <button
              style={styles.backButton(focusedSection === 'back')}
              onClick={() => navigate('/home-logged-in')}
              onFocus={() => setFocusedSection('back')}
            >
              ホーム画面へ
            </button>
          </div>

          <div style={styles.tabs}>
            <button
              style={styles.tab(tab === 'score', focusedSection === 'tabs' && focusedTabIndex === 0)}
              onClick={() => setTab('score')}
              onFocus={() => setFocusedSection('tabs')}
            >
              Weekly Best Score
            </button>
            <button
              style={styles.tab(tab === 'calories', focusedSection === 'tabs' && focusedTabIndex === 1)}
              onClick={() => setTab('calories')}
              onFocus={() => setFocusedSection('tabs')}
            >
              Weekly Calories
            </button>
          </div>

          {tab === 'score' && (
            <div style={styles.difficultyRow}>
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.key}
                  style={styles.diff(difficulty === d.key, focusedSection === 'difficulty' && focusedDiffIndex === DIFFICULTIES.indexOf(d))}
                  onClick={() => setDifficulty(d.key)}
                  onFocus={() => setFocusedSection('difficulty')}
                >
                  {d.label}
                </button>
              ))}
            </div>
          )}

          {error && <div style={styles.error}>{error}</div>}
          {isLoading && <div style={styles.helper}>Loading...</div>}

          {pinnedEntry && (
            <div style={styles.pinned}>
              <div style={{ fontWeight: 900, marginBottom: '6px' }}>You</div>
              {renderRow(pinnedEntry)}
            </div>
          )}

          <div style={styles.card}>
            {listEntries.length === 0 && !isLoading ? (
              <div style={styles.empty}>No data</div>
            ) : (
              <>
                <div style={{ ...styles.helper, margin: 0, marginBottom: '6px', fontWeight: 900 }}>
                  {listEntries.length > 0 ? `全員表示: ${listEntries.length}人` : ''}
                </div>
                {listEntries.map(renderRow)}
              </>
            )}
          </div>
        </div>
      </div>
    </BrandedConnectionBackground>
  );
}
