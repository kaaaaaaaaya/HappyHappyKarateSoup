import { useState, useCallback, useEffect, useRef } from 'react';
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
    handleTabChange
  );

  // [JA] スクロール制御のために、表示されている各具材要素の参照を保持します。
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // [JA] タブ切り替えなどで maxIdx が変わった際、カーソル位置が範囲外にならないよう補正します。
  useEffect(() => {
    if (cursorIndex > maxIdx) {
      setCursorIndex(maxIdx);
    }
  }, [maxIdx, cursorIndex, setCursorIndex]);

  // [JA] カーソルが移動した際、対象の具材が画面内に見えるようにスムーズスクロールさせます。
  useEffect(() => {
    if (cursorIndex < 0 || cursorIndex >= currentItems.length) {
      return;
    }

    const target = itemRefs.current[cursorIndex];
    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [cursorIndex, currentItems]);

  // [JA] 具材が3つ選ばれ準備完了状態になったら、自動的に「調理する」ボタンへカーソルを合わせます。
  useEffect(() => {
    if (isReady && selectedChar.length === 3) {
      const cookButtonIndex = currentItems.length + 1;
      if (cursorIndex !== cookButtonIndex) {
        setCursorIndex(cookButtonIndex);
      }
    }
  }, [isReady, selectedChar.length, currentItems.length, cursorIndex, setCursorIndex]);

  // [JA] 初回マウント時に難易度が設定されていない場合は、デフォルトで 'normal' にします。
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
      <div style={{ padding: '20px', backgroundColor: 'rgba(255,255,255,0.9)', borderBottom: '4px solid var(--c-slate-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontFamily: 'var(--f-pixel)', fontSize: '24px' }}>SELECT INGREDIENTS</h2>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
          あと {3 - selectedChar.length} 個選んでね
        </div>
        <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
          難易度: {selectedDifficulty.toUpperCase()}
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Main Content Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', overflowY: 'auto' }}>
          
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
          <div style={{ 
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

          {isReady && (
            <Button 
              variant="primary" 
              onClick={handleComplete}
              style={{
                padding: '24px 32px',
                fontSize: '24px',
                animation: 'bounce 1s infinite',
                boxShadow: cursorIndex === currentItems.length + 1 ? '0 0 0 6px #E65100' : undefined,
                transform: cursorIndex === currentItems.length + 1 ? 'scale(1.05)' : undefined
              }}
            >
              調理する！
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
