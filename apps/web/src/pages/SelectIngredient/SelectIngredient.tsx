// SelectIngredient.tsx
import { Link } from 'react-router-dom';
// 先ほど作ったフックを読み込む
import { useSelectIngredient } from './useSelectIngredient';
import { FOOD_EMOJIS } from './emojis'; // 追加した絵文字リストもインポート

export default function SelectIngredient() {
  // 裏側のロジックから必要なものを全て取り出す！
  const {
    availableItems,
    selectedChar,
    isPickerOpen,
    setIsPickerOpen,
    toggleSelection,
    addCustomIngredient,
    isReady
  } = useSelectIngredient();

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h2>具材選択画面</h2>
      <p>材料を3つ選んでください（現在: {selectedChar.length}/3）</p>

      {/* 具材の表示エリア */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', margin: '30px 0', flexWrap: 'wrap' }}>
        {availableItems.map((item) => {
          // この具材が選択されているかどうか
          const isSelected = selectedChar.includes(item.id);
          
          return (
            <div
              key={item.id}
              onClick={() => toggleSelection(item.id)}
              style={{
                padding: '20px',
                border: isSelected ? '5px solid #ff9800' : '2px solid #ccc',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: isSelected ? 'bold' : 'normal',
                backgroundColor: isSelected ? '#fff3e0' : 'transparent',
                minWidth: '120px',
                transition: '0.2s' // フワッと枠線が変わるアニメーション
              }}
            >
              <div style={{ fontSize: '40px' }}>{item.emoji}</div>
              <h3 style={{ fontSize: '16px', margin: '10px 0 0 0' }}>{item.label}</h3>
              {isSelected && <span style={{ color: '#ff9800', fontSize: '12px' }}>選択中</span>}
            </div>
          );
        })}
      </div>

      {/* さらに具材を選択するボタン */}
      <div style={{ margin: '30px 0' }}>
         <button
            onClick={() => setIsPickerOpen(!isPickerOpen)}
            style={{ padding: '10px 20px', cursor: 'pointer', borderRadius: '20px', backgroundColor: '#e0e0e0', border: 'none' }}
         >
            ＋ さらに具材を選択
         </button>
      </div>

      {/* 絵文字ピッカー（ボタンを押したら出現） */}
      {isPickerOpen && (
        <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '10px', display: 'inline-block', maxWidth: '400px' }}>
          <p style={{ marginTop: '0' }}>追加する絵文字を選んでね</p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            
            {/* 🌟 修正ポイント：取り出す1個のデータの名前を「food」にします */}
            {FOOD_EMOJIS.map(food => (
              <span
                key={food.emoji} 
                onClick={() => addCustomIngredient(food)} 
                
                style={{ fontSize: '30px', cursor: 'pointer', padding: '5px', border: '1px solid #ccc', borderRadius: '5px', backgroundColor: 'white' }}
              >
                {food.emoji} 
              </span>
            ))}

          </div>
        </div>
      )}

      {/* ゲームへ進むボタン（3つ選ぶまで押せない） */}
      <div style={{ marginTop: '50px' }}>
        {isReady ? (
          <Link to="/game">
            <button style={{ padding: '15px 30px', fontSize: '18px', cursor: 'pointer', backgroundColor: '#2196f3', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}>
              決定（ゲームへ）
            </button>
          </Link>
        ) : (
          <button disabled style={{ padding: '15px 30px', fontSize: '18px', cursor: 'not-allowed', backgroundColor: '#ccc', color: '#fff', border: 'none', borderRadius: '5px' }}>
            材料をあと {3 - selectedChar.length} 個選んでね
          </button>
        )}
      </div>
    </div>
  );
}