import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import WeeklyCaloriesChart, { type WeeklyCaloriesPoint } from '../components/WeeklyCaloriesChart';
import BrandedConnectionBackground from '../components/BrandedConnectionBackground';
import { fetchProfileMartialData } from '../api/profileApi';

type ProfileViewData = {
  email: string;
  beltRankLevel: number;
  beltColor: string;
  totalSoupCount: number;
  todayGeneratedSoupCount: number;
  todayUsedEnergyKcal: number;
  todayPunchCount: number;
  todayChopCount: number;
  weeklyGeneratedSoupCount: number;
  weeklyUsedEnergyKcal: number;
  weeklyDailyEnergyTrend: WeeklyCaloriesPoint[];
};

export default function Profile() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [viewData, setViewData] = useState<ProfileViewData | null>(null);

  const mockData = useMemo<ProfileViewData>(
    () => ({
      email: 'example@gmail.com',
      beltRankLevel: 1,
      beltColor: '紫',
      totalSoupCount: 34,
      todayGeneratedSoupCount: 8,
      todayUsedEnergyKcal: 100.2,
      todayPunchCount: 112,
      todayChopCount: 80,
      weeklyGeneratedSoupCount: 34,
      weeklyUsedEnergyKcal: 843.6,
      weeklyDailyEnergyTrend: [
        { date: '03/25', usedEnergyKcal: 118.1 },
        { date: '03/26', usedEnergyKcal: 126.7 },
        { date: '03/27', usedEnergyKcal: 133.4 },
        { date: '03/28', usedEnergyKcal: 129.2 },
        { date: '03/29', usedEnergyKcal: 141.5 },
        { date: '03/30', usedEnergyKcal: 149.0 },
        { date: '03/31', usedEnergyKcal: 145.7 },
      ],
    }),
    []
  );

  useEffect(() => {
    const authUserRaw = sessionStorage.getItem('authUser');
    if (!authUserRaw) {
      setViewData(mockData);
      setErrorMessage('ログイン情報がないためモックを表示しています。');
      setIsLoading(false);
      return;
    }

    try {
      const authUser = JSON.parse(authUserRaw) as { userId?: number; email?: string };
      const userId = authUser.userId;
      const email = authUser.email ?? mockData.email;
      if (!userId) {
        setViewData(mockData);
        setErrorMessage('userIdが取得できないためモックを表示しています。');
        setIsLoading(false);
        return;
      }

      fetchProfileMartialData(userId, 7)
        .then((data) => {
          setErrorMessage('');
          setViewData({
            email,
            beltRankLevel: data.beltRankLevel,
            beltColor: data.beltColor,
            totalSoupCount: data.totalSoupCount,
            todayGeneratedSoupCount: data.todayGeneratedSoupCount,
            todayUsedEnergyKcal: data.todayUsedEnergyKcal,
            todayPunchCount: data.todayPunchCount,
            todayChopCount: data.todayChopCount,
            weeklyGeneratedSoupCount: data.weeklyGeneratedSoupCount,
            weeklyUsedEnergyKcal: data.weeklyUsedEnergyKcal,
            weeklyDailyEnergyTrend: data.weeklyDailyEnergyTrend,
          });
        })
        .catch(() => {
          setViewData(mockData);
          setErrorMessage('プロフィールデータ取得に失敗したためモックを表示しています。');
        })
        .finally(() => setIsLoading(false));
    } catch {
      setViewData(mockData);
      setErrorMessage('ユーザー情報の解析に失敗したためモックを表示しています。');
      setIsLoading(false);
    }

  }, [mockData]);

  const data = viewData ?? mockData;
  const avatarByBeltColor: Record<string, string> = {
    白: '/images/avatars/avatar_white.png',
    紫: '/images/avatars/avatar_purple.png',
    緑: '/images/avatars/avatar_green.png',
    黄: '/images/avatars/avatar_yellow.png',
    赤: '/images/avatars/avatar_red.png',
    茶: '/images/avatars/avatar_brown.png',
    黒: '/images/avatars/avatar_black.png',
  };
  const avatarSrc = avatarByBeltColor[data.beltColor] ?? '/images/avatars/avatar_white.png';

  return (
    <BrandedConnectionBackground>
      <main
        style={{
          width: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@600;700&family=Press+Start+2P&display=swap" rel="stylesheet" />
        <div
          style={{
            width: 'min(1060px, 94vw)',
            margin: '0 auto',
            borderRadius: 28,
            background: '#fbfbfb',
            border: '4px solid #181818',
            boxShadow: '0 18px 38px rgba(0, 0, 0, 0.35)',
            padding: '1.8rem 2.5rem 1.9rem',
            fontFamily: "'DotGothic16', sans-serif",
            color: '#121212',
          }}
        >
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <h1
              style={{
                margin: 0,
                fontSize: 'clamp(1.7rem, 2.2vw, 2.8rem)',
                fontFamily: "'Press Start 2P', monospace",
              }}
            >
              User Profile
            </h1>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ textAlign: 'right', fontSize: '0.92rem' }}>
                <div>login acount:</div>
                <div>{data.email}</div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/home-logged-in')}
                style={{
                  border: '3px solid #1c1c1c',
                  width: 48,
                  height: 48,
                  borderRadius: 6,
                  background: '#f9f9f9',
                  boxShadow: '3px 3px 0 0 #000',
                  cursor: 'pointer',
                  fontSize: '1.5rem',
                }}
              >
                ↩
              </button>
            </div>
          </header>

          <section style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: '1.2rem', alignItems: 'start' }}>
            <div>
              <div
                style={{
                  border: '3px solid #181818',
                  borderRadius: 24,
                  padding: '0.9rem 1.4rem',
                  display: 'grid',
                  gridTemplateColumns: '160px 1fr',
                  alignItems: 'center',
                  background: '#f5f5f5',
                  boxShadow: '2px 2px 0 0 #000',
                  width: '100%',
                  maxWidth: 500,
                  height: 210,
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'grid',
                    placeItems: 'center',
                    margin: '0 auto',
                  }}
                >
                  <img
                    src={avatarSrc}
                    alt="Karate Boy Avatar"
                    style={{
                      width: 'auto',
                      height: '65%',
                      maxWidth: '100%',
                      objectFit: 'contain',
                      imageRendering: 'pixelated',
                      transform: 'translateY(-50px)',
                    }}
                  />
                </div>
                <div style={{ textAlign: 'right', transform: 'translateY(-40px)' }}>
                  <div style={{ fontSize: '1.65rem', marginBottom: '0.2rem' }}>KARATE SOUP RANK: {data.beltRankLevel}</div>
                  <div
                    style={{
                      fontSize: '2rem',
                      marginBottom: '0.2rem',
                      textAlign: 'right',
                      fontFamily: "'Noto Serif JP', serif",
                      fontWeight: 700,
                    }}
                  >
                    <span style={{ fontFamily: "'DotGothic16', sans-serif", marginRight: '0.3rem', fontSize: '1.6rem' }}>OBI:</span>
                    <span style={{ fontSize: '2.9rem' }}>{data.beltColor}帯</span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1.3rem', display: 'grid', gridTemplateColumns: 'max-content minmax(0, 1fr)', gap: '0.55rem', alignItems: 'end' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '1.55rem' }}>In latest 7 days...</p>
                  <p style={{ margin: '0.8rem 0 0.2rem', fontSize: '1.35rem' }}>generated:</p>
                  <p style={{ margin: 0, fontSize: '2.6rem', whiteSpace: 'nowrap' }}>
                    {data.weeklyGeneratedSoupCount} <span style={{ fontSize: '1.55rem' }}>soups</span>
                  </p>
                  <p style={{ margin: '0.8rem 0 0.2rem', fontSize: '1.35rem' }}>used energy:</p>
                  <p style={{ margin: 0, fontSize: '2.6rem', whiteSpace: 'nowrap' }}>
                    {data.weeklyUsedEnergyKcal.toFixed(1)} <span style={{ fontSize: '1.55rem' }}>kcal.</span>
                  </p>
                </div>
                <div
                  style={{
                    border: '2px solid #888',
                    background: '#fff',
                    padding: '0.35rem 0.45rem',
                    width: 'min(340px, 100%)',
                    justifySelf: 'start',
                    marginLeft: '-0.9rem',
                  }}
                >
                  <WeeklyCaloriesChart points={data.weeklyDailyEnergyTrend} />
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                marginTop: '1rem',
                alignSelf: 'stretch',
                padding: '1.6rem 1.2rem 0.8rem 1.6rem',
                boxSizing: 'border-box',
              }}
            >
              <div>
                <h2 style={{ margin: '1.1rem 0 1.3rem', fontSize: '2.2rem' }}>TODAY&apos;S TOTAL RESULT</h2>
                <p style={{ margin: '0.3rem 0', fontSize: '1.4rem' }}>Today you generated... <span style={{ color: '#ff8d00' }}>{data.todayGeneratedSoupCount}</span> soups!</p>
                <p style={{ margin: '0.8rem 0 0.2rem', fontSize: '1.5rem' }}>And you used...</p>
                <p style={{ margin: 0, fontSize: '3.5rem', color: '#ff8d00', lineHeight: 1.1 }}>
                  {data.todayUsedEnergyKcal.toFixed(1)} <span style={{ fontSize: '1.7rem', color: '#111' }}>kcal.</span>
                </p>
                <p style={{ margin: '1.7rem 0 0.4rem', fontSize: '1.65rem', textAlign: 'right' }}>Your Action; Punch: {data.todayPunchCount}</p>
                <p style={{ margin: 0, fontSize: '1.65rem', textAlign: 'right' }}>Chop: {data.todayChopCount}</p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/soup-history')}
                style={{
                  marginTop: 'auto',
                  border: '2px solid #1c1c1c',
                  borderRadius: 24,
                  background: '#fff',
                  boxShadow: '4px 4px 0 0 #000',
                  fontSize: '1.4rem',
                  padding: '1rem 1.2rem',
                  cursor: 'pointer',
                }}
              >
                Show All of Your Soup &gt;&gt;
              </button>
            </div>
          </section>

          {!isLoading && errorMessage && (
            <p style={{ marginTop: '0.9rem', color: '#8a3f1f' }}>{errorMessage}</p>
          )}
        </div>
      </main>
    </BrandedConnectionBackground>
  );
}
