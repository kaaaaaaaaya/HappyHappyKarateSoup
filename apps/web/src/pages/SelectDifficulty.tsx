import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BrandedConnectionBackground from '../components/BrandedConnectionBackground';
import type { Difficulty } from '../api/chartApi';
import { fetchControllerRoomStatus } from '../api/controllerRoomApi';

type DifficultyOption = {
  key: Difficulty;
  soupName: string;
  buttonLabel: string;
  imagePath: string;
  cardColor: string;
  spicyLevel: number;
};

const OPTIONS: DifficultyOption[] = [
  {
    key: 'easy',
    soupName: 'Miso',
    buttonLabel: 'use Miso',
    imagePath: '/images/miso.png',
    cardColor: '#d6b689',
    spicyLevel: 1,
  },
  {
    key: 'normal',
    soupName: 'Tomato',
    buttonLabel: 'use Tomato',
    imagePath: '/images/tomato.png',
    cardColor: '#da846f',
    spicyLevel: 2,
  },
  {
    key: 'hard',
    soupName: 'Mala',
    buttonLabel: 'use Mala',
    imagePath: '/images/malatang.png',
    cardColor: '#b84d3a',
    spicyLevel: 3,
  },
];

export default function SelectDifficulty() {
  const navigate = useNavigate();
  const [focusedIndex, setFocusedIndex] = useState(0);
  const focusedIndexRef = useRef(0);
  const connectedRoomId = sessionStorage.getItem('connectedRoomId');
  const lastSequenceRef = useRef(0);
  const isSequenceInitializedRef = useRef(false);
  const pageEnteredAtRef = useRef(Date.now());

  const handleSelect = (difficulty: Difficulty) => {
    sessionStorage.setItem('selectedDifficulty', difficulty);
    sessionStorage.removeItem('referenceImageDataUrl');
    navigate('/select');
  };

  useEffect(() => {
    focusedIndexRef.current = focusedIndex;
  }, [focusedIndex]);

  useEffect(() => {
    pageEnteredAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!connectedRoomId) {
      return;
    }

    const maxIndex = OPTIONS.length - 1;
    const timerId = window.setInterval(async () => {
      try {
        const status = await fetchControllerRoomStatus(connectedRoomId, {
          since: lastSequenceRef.current,
        });
        const currentSequence = status.commandSequence ?? 0;
        const incrementalCommands = status.commands ?? [];

        if (!isSequenceInitializedRef.current) {
          lastSequenceRef.current = currentSequence;
          isSequenceInitializedRef.current = true;
          return;
        }

        const commandEntries = incrementalCommands.length > 0
          ? incrementalCommands
          : [];

        for (const entry of commandEntries) {
          const cmd = (entry.command ?? '').toLowerCase().trim();
          if (cmd === 'left' || cmd === 'up') {
            setFocusedIndex((prev) => Math.max(0, prev - 1));
          } else if (cmd === 'right' || cmd === 'down') {
            setFocusedIndex((prev) => Math.min(maxIndex, prev + 1));
          } else if (cmd === 'confirm' || cmd === 'punch' || cmd === 'chop') {
            // 画面遷移直後の押しっぱなし/残留コマンドによる誤選択を防止
            if (Date.now() - pageEnteredAtRef.current < 700) {
              continue;
            }
            handleSelect(OPTIONS[Math.max(0, Math.min(maxIndex, focusedIndexRef.current))].key);
          }
        }

        if (currentSequence > lastSequenceRef.current) {
          lastSequenceRef.current = currentSequence;
        }
      } catch (error) {
        console.error('Failed to poll controller command on difficulty page:', error);
      }
    }, 120);

    return () => {
      window.clearInterval(timerId);
    };
  }, [connectedRoomId]);

  return (
    <BrandedConnectionBackground>
      <div
        style={{
          width: 'min(clamp(780px, 72vw, 1200px), 92vw)',
          minHeight: 'clamp(400px, 70dvh, 1000px)',
          backgroundColor: '#efefef',
          border: '4px solid #121212',
          borderRadius: 'clamp(16px, 1.8vw, 24px)',
          padding: '0 clamp(14px, 1.8vw, 24px) clamp(16px, 2vw, 28px)',
          boxSizing: 'border-box',
          boxShadow: '0 10px 28px rgba(0,0,0,0.25)',
          overflow: 'visible',
        }}
      >
        <h1
          style={{
            margin: 0,
            marginTop: '5px',
            marginBottom: 0,
            padding: 0,
            textAlign: 'left',
            fontFamily: 'VT323',
            fontSize: 'clamp(36px, 5.0vw, 112px)',
            lineHeight: 0.9,
            letterSpacing: '1px',
            color: '#111',
          }}
        >
          Select Soup-base!
        </h1>
        <p
          style={{
            margin: 0,
            marginTop: '0px',
            marginBottom: '3px',
            textAlign: 'left',
            fontFamily: 'VT323',
            fontSize: 'clamp(12px, 2vw, 32px)',
            color: '#111',
          }}
        >
          spicy level = game level
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 'clamp(10px, 1.5vw, 40px)',
            alignItems: 'stretch',
          }}
        >
          {OPTIONS.map((option, index) => (
            <div
              key={option.key}
              style={{
                width: '100%',
                minWidth: 0,
                minHeight: 'clamp(320px, 25vw, 500px)',
                marginTop: 'clamp(5px, 1.0vw, 20px)',
                backgroundColor: option.cardColor,
                border: focusedIndex === index ? '4px solid #ffffff' : '3px solid #141414',
                borderRadius: 'clamp(14px, 1.6vw, 20px)',
                boxSizing: 'border-box',
                padding: 'clamp(12px, 1.2vw, 20px) clamp(10px, 1.0vw, 16px) 0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                overflow: 'visible',
                boxShadow: focusedIndex === index ? '0 0 0 3px #111, 2px 2px 0 0 #000' : '2px 2px 0 0 #000',
              }}
            >
              <div style={{ width: '100%' }}>
                <h3
                  style={{
                    margin: 0,
                    textAlign: 'center',
                    color: '#fff',
                    fontFamily: 'VT323',
                    fontSize: 'clamp(20px, 5.2vw, 120px)',
                    lineHeight: 1.05,
                  }}
                >
                  {option.soupName}
                </h3>
                <p
                  style={{
                    margin: 0,
                    textAlign: 'left',
                    color: '#fff',
                    fontFamily: 'VT323',
                    fontSize: 'clamp(12px, 2.5vw, 30px)',
                    lineHeight: 1,
                  }}
                >
                  spicy level:
                </p>
                <div
                  style={{
                    marginTop: '5px',
                    display: 'flex',
                    justifyContent: 'center',
                    minHeight: '34px',
                  }}
                >
                  {Array.from({ length: option.spicyLevel }).map((_, idx) => (
                    <img
                      key={`${option.key}-pepper-${idx}`}
                      src="/images/pepper.png"
                      alt="pepper"
                      style={{ width: 'clamp(30px, 4.4vw, 72px)', height: 'clamp(30px, 5.2vw, 72px)', objectFit: 'contain' }}
                    />
                  ))}
                </div>
              </div>

              <div
                style={{
                  width: '100%',
                  marginTop: 'clamp(-52px, -4.2vw, -24px)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  position: 'relative',
                }}
              >
                {/* スープ画像：大きくしてボタンに被せる */}
                <img
                  src={option.imagePath}
                  alt={option.soupName}
                  style={{
                    width: '126%',
                    height: 'clamp(170px, 22vw, 300px)',
                    objectFit: 'contain',
                    imageRendering: 'pixelated',
                    filter: 'drop-shadow(0 8px 12px rgba(0,0,0,0.30))',
                    marginTop: '0',
                    marginBottom: 'clamp(-74px, -5.8vw, -44px)',
                    position: 'relative',
                    zIndex: 1,
                    pointerEvents: 'none',
                  }}
                />

                <button
                  onClick={() => handleSelect(option.key)}
                  style={{
                    width: '92%',
                    borderRadius: 'clamp(12px, 1.4vw, 18px)',
                    border: '3px solid #202020',
                    backgroundColor: focusedIndex === index ? '#ffde00' : '#efefef',
                    color: '#101010',
                    fontFamily: 'VT323',
                    fontSize: 'clamp(16px, 3vw, 40px)',
                    fontStyle: 'normal',
                    fontWeight: 400,
                    lineHeight: '28px',
                    minHeight: 'clamp(56px, 7dvh, 76px)',
                    padding: 'clamp(12px, 1.9vw, 20px) clamp(10px, 1.2vw, 14px)',
                    cursor: 'pointer',
                    position: 'relative',
                    top: 'clamp(-24px, -2.2vw, -12px)',
                    zIndex: 2,
                  }}
                >
                  {option.buttonLabel}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </BrandedConnectionBackground>
  );
}
