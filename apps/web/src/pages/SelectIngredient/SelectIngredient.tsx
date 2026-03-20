import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelectIngredient } from './useSelectIngredient';
import { FOOD_EMOJIS } from './emojis';
import { Button } from '../../components/Button';
import bgConnection from '../../assets/backgrounds/bg_connection.png';

// 分類をざっくり定義
const CATEGORIES = {
  VEGETABLE: FOOD_EMOJIS.slice(0, 18),
  MEAT_FISH: FOOD_EMOJIS.slice(18, 30),
  OTHERS: FOOD_EMOJIS.slice(30)
};

export default function SelectIngredient() {
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'VEGETABLE' | 'MEAT_FISH' | 'OTHERS'>('VEGETABLE');
  const [showCart, setShowCart] = useState(false);

  const {
    selectedChar,
    toggleSelection,
    isReady
  } = useSelectIngredient();

  const handleComplete = () => {
    navigate('/game', { state: { selectedIngredientEmojis: selectedChar } });
  };

  const currentItems = CATEGORIES[activeTab];

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
                onClick={() => setActiveTab(tab)}
                style={{ padding: '10px 20px', fontSize: '18px' }}
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
            {currentItems.map((item) => {
              const isSelected = selectedChar.includes(item.emoji);
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (!isSelected && selectedChar.length >= 3) return;
                    toggleSelection(item.emoji);
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
                    boxShadow: '0 4px 0 rgba(0,0,0,0.1)'
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
        gap: '16px' 
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
              position: 'relative'
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
              style={{ padding: '24px 32px', fontSize: '24px', animation: 'bounce 1s infinite' }}
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
