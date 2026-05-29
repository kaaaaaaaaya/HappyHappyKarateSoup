
import { useState, useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelectIngredient } from './useSelectIngredient';
import { useIngredientController } from './useIngredientController';
import { FOOD_EMOJIS } from './emojis';
import { Button } from '../../components/Button';
import bgConnection from '../../assets/backgrounds/bg_connection.png';
import { postControllerRoomCommand } from '../../api/controllerRoomApi';

// [JA] 食材の絵文字リストをカテゴリ（野菜、肉・魚、その他）ごとに分割して定義します。
const CATEGORIES = {
  VEGETABLE: FOOD_EMOJIS.slice(0, 18),
  MEAT_FISH: FOOD_EMOJIS.slice(18, 30),
  OTHERS: FOOD_EMOJIS.slice(30)
};

export default function SelectIngredient() {
  // [JA] 画面遷移用のフックと、選択された難易度の取得
  const navigate = useNavigate();
  const selectedDifficulty = sessionStorage.getItem('selectedDifficulty') ?? 'normal';

  const [activeTab, setActiveTab] = useState<'VEGETABLE' | 'MEAT_FISH' | 'OTHERS'>('VEGETABLE');
  const [showCart, setShowCart] = useState(false);
  const [gridColumns, setGridColumns] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const selectedCountRef = useRef(0);

  const {
    selectedChar,
    toggleSelection,
    isReady
  } = useSelectIngredient();

  const connectedRoomId = sessionStorage.getItem('connectedRoomId');

  // [JA] 具材選択完了時の処理。選択した具材をセッションに保存し、ゲーム画面へ遷移します。
  // [JA] また、コントローラーが連携されている場合は、ゲーム開始のコマンドを送信します。
  const handleComplete = useCallback(() => {
    sessionStorage.setItem('selectedIngredientEmojis', JSON.stringify(selectedChar));
    navigate('/game', { state: { selectedIngredientEmojis: selectedChar } });

    if (connectedRoomId) {
      void postControllerRoomCommand(connectedRoomId, 'start_game').catch((error) => {
        console.error('Failed to notify controller room start_game:', error);
      });
    }
  }, [navigate, selectedChar, connectedRoomId]);

  const currentItems = CATEGORIES[activeTab];

  // [JA] コントローラーから決定ボタンが押されたときの処理
  // [JA] カーソルのインデックスに応じて、カートの開閉、調理開始、または具材の選択/解除を行います。
  const handleControllerConfirm = useCallback((idx: number) => {
    if (idx === currentItems.length) { // カートボタン
      setShowCart((prev) => !prev);
    } else if (idx === currentItems.length + 1) { // 調理ボタン
      if (isReady) {
        handleComplete();
      }
    } else if (idx >= 0 && idx < currentItems.length) {
      const item = currentItems[idx];
      const isSelected = selectedChar.includes(item.emoji);
      if (!isSelected && selectedChar.length >= 3) return;
      toggleSelection(item.emoji);
    }
  }, [currentItems, isReady, handleComplete, selectedChar, toggleSelection]);

  // [JA] フォーカス可能な最大インデックス（準備完了時は「調理する」ボタンも含まれる）
  const maxIdx = isReady ? currentItems.length + 1 : currentItems.length;
  const remainingCount = Math.max(0, 3 - selectedChar.length);

  const TABS = ['VEGETABLE', 'MEAT_FISH', 'OTHERS'] as const;
  
  // [JA] コントローラーの左右入力などでタブを切り替える処理
  const handleTabChange = (direction: 'left' | 'right') => {
    setActiveTab(prev => {
      const idx = TABS.indexOf(prev);
      if (direction === 'left') {
        return TABS[Math.max(0, idx - 1)];
      } else {
        return TABS[Math.min(TABS.length - 1, idx + 1)];
      }
    });
  };

  // [JA] コントローラーの入力を監視し、カーソル位置や決定操作を管理するカスタムフック
  const { cursorIndex, setCursorIndex } = useIngredientController(
    connectedRoomId,
    maxIdx,
    handleControllerConfirm,
    handleTabChange,
    gridColumns
  );

  // [JA] スクロール制御のために、表示されている各具材要素の参照を保持します。
  //const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // [JA] タブ切り替えなどで maxIdx が変わった際、カーソル位置が範囲外にならないよう補正します。
  useEffect(() => {
    if (cursorIndex > maxIdx) {
      setCursorIndex(maxIdx);
    }
  }, [maxIdx, cursorIndex, setCursorIndex]);

  // [EN] Track the current grid columns so controller navigation follows the layout.
  // [JA] レイアウトに合わせてコントローラーの移動量を更新します。
  useLayoutEffect(() => {
    if (!gridRef.current) return;
    const grid = gridRef.current;
    const minColumnWidth = 120;
    const gap = 16;

    const computeColumns = () => {
      const gridWidth = grid.clientWidth;
      const columns = Math.max(1, Math.floor((gridWidth + gap) / (minColumnWidth + gap)));
      setGridColumns(columns);
    };

    computeColumns();
    const observer = new ResizeObserver(() => computeColumns());
    observer.observe(grid);
    return () => observer.disconnect();
  }, []);

  // [EN] Scroll just enough to keep the focused card within a safe viewport margin.
  // [JA] 選択中カードが画面端に近づいたら、最小限+αだけスクロールします。
  useEffect(() => {
    if (cursorIndex < 0 || cursorIndex >= currentItems.length) return;
    const container = scrollContainerRef.current;
    const target = itemRefs.current[cursorIndex];
    if (!container || !target) return;

    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const margin = 24;
    const extra = 16;
    const minScroll = containerRect.height / 3;
    const topThreshold = containerRect.top + margin;
    const bottomThreshold = containerRect.bottom - margin;

    if (targetRect.top < topThreshold) {
      const delta = topThreshold - targetRect.top + extra;
      const scrollAmount = Math.max(delta, minScroll);
      container.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
    } else if (targetRect.bottom > bottomThreshold) {
      const delta = targetRect.bottom - bottomThreshold + extra;
      const scrollAmount = Math.max(delta, minScroll);
      container.scrollBy({ top: scrollAmount, behavior: 'smooth' });
    }
  }, [cursorIndex, currentItems.length, activeTab]);

  // [EN] When three items are selected, move focus to the cook button.
  // [JA] 3つ選択したタイミングで「調理する」にフォーカスを移動します。
  useEffect(() => {
    const previousCount = selectedCountRef.current;
    selectedCountRef.current = selectedChar.length;
    if (previousCount < 3 && selectedChar.length === 3) {
      setCursorIndex(currentItems.length + 1);
    }
  }, [selectedChar.length, currentItems.length, setCursorIndex]);

  useEffect(() => {
    if (!sessionStorage.getItem('selectedDifficulty')) {
      sessionStorage.setItem('selectedDifficulty', 'normal');
    }
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: 'var(--c-brown)',
      backgroundImage: `url(${bgConnection})`,
      backgroundSize: 'cover',
      fontFamily: 'var(--f-dotgothic)',
      color: 'var(--c-slate-900)'
    }}>
      {/* Header */}
      <div style={{ padding: '20px', backgroundColor: 'rgba(255,255,255,0.9)', borderBottom: '4px solid var(--c-slate-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--f-pixel)', fontSize: '24px' }}>SELECT INGREDIENTS</h2>
        <div style={{
          padding: '12px 18px',
          backgroundColor: '#ffde00',
          border: '3px solid var(--c-slate-900)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '4px 4px 0 rgba(0,0,0,0.25)',
          textAlign: 'center',
          fontWeight: 'bold',
          lineHeight: 1.15,
        }}>
          <div style={{ fontSize: '22px', fontFamily: 'var(--f-pixel)' }}>具材を3つ選んでね！</div>
          <div style={{ marginTop: '6px', fontSize: '16px' }}>
            {remainingCount > 0 ? `あと ${remainingCount} 個` : '3つそろったよ！'}
          </div>
        </div>
        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
          難易度: {selectedDifficulty.toUpperCase()}
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Main Content Area */}
        <div ref={scrollContainerRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto' }}>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            {(['VEGETABLE', 'MEAT_FISH', 'OTHERS'] as const).map((tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? 'primary' : 'secondary'}
                onClick={() => {
                  setActiveTab(tab);
                  setCursorIndex(-1); // Automatically focus tab area when clicked
                }}
                style={{
                  padding: '10px 20px',
                  fontSize: '18px',
                  boxShadow: (cursorIndex === -1 && activeTab === tab) ? '0 0 0 6px #E65100' : 'none'
                }}
              >
                {tab === 'VEGETABLE' ? '野菜' : tab === 'MEAT_FISH' ? '肉・魚' : 'その他'}
              </Button>
            ))}
          </div>

          {/* Item Grid */}
          <div ref={gridRef} style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: '16px',
            paddingBottom: '100px'
          }}>
            {currentItems.map((item, index) => {
              const isSelected = selectedChar.includes(item.emoji);
              const isFocused = index === cursorIndex;
              return (
                <div
                  key={item.id}
                  ref={(el) => { itemRefs.current[index] = el; }}
                  onClick={() => {
                    if (!isSelected && selectedChar.length >= 3) return;
                    toggleSelection(item.emoji);
                    setCursorIndex(index);
                  }}
                  style={{
                    backgroundColor: isSelected ? 'var(--c-orange)' : 'var(--c-white)',
                    border: `4px solid ${isSelected ? '#E65100' : 'var(--c-slate-200)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    textAlign: 'center',
                    cursor: (isSelected || selectedChar.length < 3) ? 'pointer' : 'not-allowed',
                    opacity: (!isSelected && selectedChar.length >= 3) ? 0.5 : 1,
                    transition: 'all 0.1s',
                    boxShadow: isFocused ? '0 0 0 6px #E65100' : '0 4px 0 rgba(0,0,0,0.1)',
                    transform: isFocused ? 'scale(1.05)' : 'scale(1)',
                    zIndex: isFocused ? 10 : 1
                  }}
                >
                  <div style={{ fontSize: '48px', marginBottom: '8px' }}>{item.emoji}</div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: 'var(--f-space)' }}>{item.label}</div>
                  {isSelected && <div style={{ fontSize: '12px', color: 'white', marginTop: '4px', backgroundColor: '#E65100', borderRadius: '4px' }}>選択中</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Cart Icon & Checkout */}
      <div style={{
        position: 'fixed',
        bottom: '32px',
        right: '32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '16px',
        zIndex: 100
      }}>
        {showCart && (
          <div style={{
            backgroundColor: 'var(--c-white)',
            padding: '24px',
            borderRadius: 'var(--radius-lg)',
            border: '4px solid var(--c-slate-900)',
            boxShadow: '8px 8px 0 rgba(0,0,0,0.2)',
            width: '300px'
          }}>
            <h3 style={{ margin: '0 0 16px', fontFamily: 'var(--f-pixel)', fontSize: '16px' }}>選択中の具材カゴ</h3>
            {selectedChar.length === 0 ? (
              <p style={{ color: 'var(--c-slate-500)' }}>まだ何も入っていないよ。</p>
            ) : (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                {selectedChar.map((emoji, i) => (
                  <div key={i} style={{ fontSize: '40px', backgroundColor: 'var(--c-slate-100)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '2px solid var(--c-slate-300)' }}>
                    {emoji}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{
              position: 'relative',
              padding: '10px 14px',
              backgroundColor: 'var(--c-white)',
              border: '3px solid var(--c-slate-900)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '4px 4px 0 rgba(0,0,0,0.18)',
              fontSize: '14px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
            }}>
              選択した具材を見る
              <span style={{
                position: 'absolute',
                left: '50%',
                bottom: '-10px',
                width: '16px',
                height: '16px',
                backgroundColor: 'var(--c-white)',
                borderRight: '3px solid var(--c-slate-900)',
                borderBottom: '3px solid var(--c-slate-900)',
                transform: 'translateX(-50%) rotate(45deg)',
              }} />
            </div>
            <Button
              variant="secondary"
              onClick={() => setShowCart(!showCart)}
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                fontSize: '32px',
                padding: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
                boxShadow: cursorIndex === currentItems.length ? '0 0 0 6px #E65100' : 'none',
                transform: cursorIndex === currentItems.length ? 'scale(1.05)' : 'none'
              }}
            >
              🛒
              {selectedChar.length > 0 && (
                <div style={{ position: 'absolute', top: '-5px', right: '-5px', backgroundColor: 'var(--c-red)', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '18px', fontWeight: 'bold' }}>
                  {selectedChar.length}
                </div>
              )}
            </Button>
          </div>

          {isReady && (
            <Button
              variant="primary"
              onClick={handleComplete}
              style={{
                padding: '24px 32px',
                fontSize: '24px',
                animation: 'bounce 1s infinite',
                minWidth: '188px',
                boxShadow: cursorIndex === currentItems.length + 1 ? '0 0 0 6px #E65100' : undefined,
                transform: cursorIndex === currentItems.length + 1 ? 'scale(1.05)' : undefined
              }}
            >
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1.1 }}>
                <span>調理開始！</span>
                <span style={{ marginTop: '4px', fontSize: '15px' }}>(GAME START!)</span>
              </span>
            </Button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}
