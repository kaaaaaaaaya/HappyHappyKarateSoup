import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCollectionsByUser, type CollectionItem } from '../api/collectionApi';
import BrandedConnectionBackground from '../components/BrandedConnectionBackground';

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd} ${hh}:${min}`;
};

export default function SoupHistory() {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [gridTemplateColumns, setGridTemplateColumns] = useState('repeat(4, minmax(0, 1fr))');

  const mockCollections = useMemo<CollectionItem[]>(
    () => [
      {
        id: 1,
        imageUrl: '/images/miso.png',
        totalScore: 4235,
        rank: 'C',
        comment: '本日のスープはバランス型。優しいうまみとコクが広がる一杯です。',
        ingredients: [],
        flavor: { sweet: 2, sour: 1, salty: 3, bitter: 1, umami: 4, spicy: 1 },
        createdAt: '2026-03-20T22:06:00+09:00',
      },
      {
        id: 2,
        imageUrl: '/images/malatang.png',
        totalScore: 5235,
        rank: 'B',
        comment: '刺激と香りが立ち上がる、熱い気合いの一杯に仕上がりました。',
        ingredients: [],
        flavor: { sweet: 1, sour: 2, salty: 2, bitter: 1, umami: 3, spicy: 5 },
        createdAt: '2026-03-22T13:24:00+09:00',
      },
      {
        id: 3,
        imageUrl: '/images/tomato.png',
        totalScore: 6450,
        rank: 'A',
        comment: '酸味とうまみのキレが鋭い、爽やかな攻めのスープです。',
        ingredients: [],
        flavor: { sweet: 2, sour: 4, salty: 2, bitter: 1, umami: 4, spicy: 1 },
        createdAt: '2026-03-25T19:40:00+09:00',
      },
    ],
    []
  );

  useEffect(() => {
    const authUserRaw = sessionStorage.getItem('authUser');
    if (!authUserRaw) {
      setCollections(mockCollections);
      setErrorMessage('ログイン情報がないためモック履歴を表示しています。');
      return;
    }

    try {
      const authUser = JSON.parse(authUserRaw) as { userId?: number };
      if (!authUser.userId) {
        setCollections(mockCollections);
        setErrorMessage('userIdが取得できないためモック履歴を表示しています。');
        return;
      }

      setIsLoading(true);
      fetchCollectionsByUser(authUser.userId)
        .then((items) => {
          setCollections(items);
        })
        .catch(() => {
          setCollections(mockCollections);
          setErrorMessage('履歴データ取得に失敗したためモック履歴を表示しています。');
        })
        .finally(() => setIsLoading(false));
    } catch {
      setCollections(mockCollections);
      setErrorMessage('ユーザー情報の解析に失敗したためモック履歴を表示しています。');
    }
  }, [mockCollections]);

  useEffect(() => {
    const resolveGridTemplate = () => {
      const width = window.innerWidth;
      if (width >= 1080) return 'repeat(4, minmax(0, 1fr))';
      if (width >= 820) return 'repeat(3, minmax(0, 1fr))';
      if (width >= 640) return 'repeat(2, minmax(0, 1fr))';
      return 'repeat(1, minmax(0, 1fr))';
    };

    const applyGridTemplate = () => {
      setGridTemplateColumns(resolveGridTemplate());
    };

    applyGridTemplate();
    window.addEventListener('resize', applyGridTemplate);
    return () => window.removeEventListener('resize', applyGridTemplate);
  }, []);

  return (
    <BrandedConnectionBackground>
      <main
        style={{
          width: '100%',
          boxSizing: 'border-box',
          fontFamily: "'DotGothic16', sans-serif",
          display: 'flex',
          justifyContent: 'center',
          padding: '1.6rem 0',
        }}
      >
        <div
          style={{
            width: 'min(1320px, 98vw)',
            borderRadius: 26,
            background: 'rgba(239, 239, 239, 0.78)',
            border: '4px solid #181818',
            boxShadow: '0 14px 28px rgba(0, 0, 0, 0.3)',
            padding: '1rem 1.5rem 1.5rem',
            boxSizing: 'border-box',
          }}
        >
          <header
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '0.5rem',
            }}
          >
            <h1 style={{ margin: 0, fontSize: 'clamp(1.2rem, 2.5vw, 3rem)', color: '#121212' }}>SOUP HISTORY</h1>
            <button
              type="button"
              onClick={() => navigate('/profile')}
              style={{
                border: '3px solid #1c1c1c',
                borderRadius: 8,
                background: '#fff',
                boxShadow: '4px 4px 0 0 #000',
                cursor: 'pointer',
                fontSize: '1.6rem',
                width: 56,
                height: 56,
                lineHeight: 1,
              }}
              aria-label="プロフィールに戻る"
            >
              ↩
            </button>
          </header>

          <div
            style={{
              maxHeight: 'calc(100vh - 240px)',
              overflowY: 'auto',
              display: 'grid',
              gridTemplateColumns,
              gap: '1.2rem',
              paddingRight: '0.8rem',
            }}
          >
            {isLoading ? (
              <p style={{ margin: 0 }}>履歴を読み込み中...</p>
            ) : collections.length > 0 ? (
              collections
                .slice()
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((item) => (
                  <article
                    key={item.id}
                    style={{
                      width: '100%',
                      background: '#f8f8f8',
                      border: '3px solid #111',
                      borderRadius: 22,
                      padding: '1.2rem 1.2rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.7rem',
                      minHeight: 400,
                    }}
                  >
                    <div style={{ textAlign: 'right', fontSize: '0.78rem', color: '#222' }}>{formatDateTime(item.createdAt)}</div>
                    <div
                      style={{
                        border: '3px solid #111',
                        borderRadius: 16,
                        overflow: 'hidden',
                        background: '#fff',
                        boxShadow: '4px 4px 0 0 #000',
                        height: 220,
                      }}
                    >
                      <img
                        src={item.imageUrl}
                        alt={`Soup #${item.id}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem', lineHeight: 1.1, margin: '0.35rem 0 0.5rem' }}>
                      <span>RANK: {item.rank}</span>
                      <span>SCORE: {item.totalScore}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.45, color: '#111' }}>
                      {item.comment || 'コメントはありません。'}
                    </p>
                  </article>
                ))
            ) : (
              <p style={{ margin: 0 }}>まだスープ履歴がありません。</p>
            )}
          </div>

          {errorMessage && <p style={{ margin: '1rem 0 0', color: '#8a3f1f' }}>{errorMessage}</p>}
        </div>
      </main>
    </BrandedConnectionBackground>
  );
}
