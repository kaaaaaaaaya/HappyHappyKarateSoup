// SelectIngredient.tsx
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useSelectIngredient } from './useSelectIngredient';
import { FOOD_EMOJIS } from './emojis'; // 追加した絵文字リストもインポート
import { fetchControllerRoomStatus } from '../../api/controllerRoomApi';

type FocusArea = 'ingredient' | 'add-button' | 'picker-item' | 'confirm-button';

export default function SelectIngredient() {
  // 画面遷移のためのフック
  const navigate = useNavigate();
  const location = useLocation();
  const roomIdFromState = (location.state as { roomId?: string } | null)?.roomId;
  const connectedRoomId = roomIdFromState ?? sessionStorage.getItem('connectedRoomId') ?? '';
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [focusArea, setFocusArea] = useState<FocusArea>('ingredient');
  const [pickerFocusedIndex, setPickerFocusedIndex] = useState(0);
  const focusedIndexRef = useRef(0);
  const focusAreaRef = useRef<FocusArea>('ingredient');
  const pickerFocusedIndexRef = useRef(0);
  const availableItemsRef = useRef<Array<{ id: string; label: string; emoji: string }>>([]);
  const [latestControllerCommand, setLatestControllerCommand] = useState('');
  const [latestControllerSequence, setLatestControllerSequence] = useState(0);
  const lastCommandSequenceRef = useRef(0);
  const columnCount = 4;
  const pickerColumnCount = 7;

  // 裏側のロジックから必要なデータや関数を取得
  const {
    availableItems,
    selectedChar,
    isPickerOpen,
    setIsPickerOpen,
    toggleSelection,
    addCustomIngredient,
    isReady
  } = useSelectIngredient();

  useEffect(() => {
    availableItemsRef.current = availableItems;
  }, [availableItems]);

  useEffect(() => {
    focusedIndexRef.current = focusedIndex;
  }, [focusedIndex]);

  useEffect(() => {
    focusAreaRef.current = focusArea;
  }, [focusArea]);

  useEffect(() => {
    pickerFocusedIndexRef.current = pickerFocusedIndex;
  }, [pickerFocusedIndex]);

  useEffect(() => {
    if (availableItems.length === 0) {
      return;
    }
    setFocusedIndex((prev) => Math.min(prev, availableItems.length - 1));
  }, [availableItems.length]);

  useEffect(() => {
    // Keep focus valid so the highlight never disappears unexpectedly.
    if (focusArea === 'confirm-button' && !isReady) {
      setFocusArea('ingredient');
      focusAreaRef.current = 'ingredient';
    }

    if (focusArea === 'picker-item' && !isPickerOpen) {
      setFocusArea('add-button');
      focusAreaRef.current = 'add-button';
    }
  }, [focusArea, isPickerOpen, isReady]);

  useEffect(() => {
    if (!connectedRoomId) {
      return;
    }

    const applyControllerCommand = (command: string) => {
      const currentItems = availableItemsRef.current;
      if (currentItems.length === 0) {
        return;
      }

      if (command === 'left' || command === 'right') {
        if (focusAreaRef.current === 'picker-item') {
          setPickerFocusedIndex((prev) => {
            const next = command === 'left'
              ? Math.max(0, prev - 1)
              : Math.min(FOOD_EMOJIS.length - 1, prev + 1);
            pickerFocusedIndexRef.current = next;
            return next;
          });
          return;
        }

        if (focusAreaRef.current !== 'ingredient') {
          return;
        }

        setFocusedIndex((prev) => {
          const next = command === 'left'
            ? Math.max(0, prev - 1)
            : Math.min(currentItems.length - 1, prev + 1);
          focusedIndexRef.current = next;
          return next;
        });
      }

      if (command === 'up') {
        if (focusAreaRef.current === 'confirm-button') {
          if (isPickerOpen) {
            setFocusArea('picker-item');
            focusAreaRef.current = 'picker-item';
          } else {
            setFocusArea('add-button');
            focusAreaRef.current = 'add-button';
          }
          return;
        }

        if (focusAreaRef.current === 'picker-item') {
          setPickerFocusedIndex((prev) => {
            if (prev - pickerColumnCount >= 0) {
              const next = prev - pickerColumnCount;
              pickerFocusedIndexRef.current = next;
              return next;
            }

            setFocusArea('add-button');
            focusAreaRef.current = 'add-button';
            return prev;
          });
          return;
        }

        if (focusAreaRef.current === 'add-button') {
          setFocusArea('ingredient');
          focusAreaRef.current = 'ingredient';
          return;
        }

        setFocusedIndex((prev) => {
          if (prev - columnCount >= 0) {
            const next = prev - columnCount;
            focusedIndexRef.current = next;
            return next;
          }
          focusedIndexRef.current = prev;
          return prev;
        });
      }

      if (command === 'down') {
        if (focusAreaRef.current === 'ingredient') {
          const nextByRow = focusedIndexRef.current + columnCount;
          if (nextByRow < currentItems.length) {
            setFocusedIndex(nextByRow);
            focusedIndexRef.current = nextByRow;
            return;
          }

          setFocusArea('add-button');
          focusAreaRef.current = 'add-button';
          return;
        }

        if (focusAreaRef.current === 'add-button') {
          if (isPickerOpen) {
            setFocusArea('picker-item');
            focusAreaRef.current = 'picker-item';
            return;
          }

          setFocusArea('confirm-button');
          focusAreaRef.current = 'confirm-button';
          return;
        }

        if (focusAreaRef.current === 'picker-item') {
          setPickerFocusedIndex((prev) => {
            const next = prev + pickerColumnCount;
            if (next < FOOD_EMOJIS.length) {
              pickerFocusedIndexRef.current = next;
              return next;
            }

            // Reached bottom row: keep current cursor instead of leaving picker.
            return prev;
          });
          return;
        }
      }

      if (command === 'confirm') {
        if (focusAreaRef.current === 'ingredient') {
          const target = currentItems[focusedIndexRef.current];
          if (target) {
            toggleSelection(target.id);
          }
          return;
        }

        if (focusAreaRef.current === 'add-button') {
          setIsPickerOpen((prev) => {
            const next = !prev;
            if (next) {
              setFocusArea('picker-item');
              focusAreaRef.current = 'picker-item';
              setPickerFocusedIndex(0);
              pickerFocusedIndexRef.current = 0;
            }
            return next;
          });
          return;
        }

        if (focusAreaRef.current === 'picker-item') {
          const target = FOOD_EMOJIS[pickerFocusedIndexRef.current];
          if (target) {
            addCustomIngredient(target);
            setIsPickerOpen(false);
            setFocusArea('ingredient');
            focusAreaRef.current = 'ingredient';
            setFocusedIndex(0);
            focusedIndexRef.current = 0;
            setPickerFocusedIndex(0);
            pickerFocusedIndexRef.current = 0;
          }
          return;
        }

        if (focusAreaRef.current === 'confirm-button' && isReady) {
          handleComplete();
        }
      }
    };

    const pollTimerId = window.setInterval(async () => {
      try {
        const status = await fetchControllerRoomStatus(connectedRoomId);
        const currentSequence = status.commandSequence ?? 0;
        const latestCommand = status.latestCommand ?? '';
        setLatestControllerSequence(currentSequence);
        setLatestControllerCommand(latestCommand);

        if (currentSequence > lastCommandSequenceRef.current && latestCommand) {
          lastCommandSequenceRef.current = currentSequence;
          applyControllerCommand(latestCommand);
        }
      } catch (error) {
        console.error('Failed to poll controller command:', error);
      }
    }, 250);

    return () => {
      window.clearInterval(pollTimerId);
    };
  }, [addCustomIngredient, connectedRoomId, isPickerOpen, isReady, setIsPickerOpen, toggleSelection]);

  const handleComplete = () => {
    const payloadData = availableItems.filter(item => selectedChar.includes(item.id));

    console.log('選択された具材:', payloadData);
    // =======================================================
    // try {
    //  // ここでAPIに送信するコードを追加
    //
    //   // ゲーム画面にもstateを用いて選択された具材の情報を渡す
    //   // state[selectedIngredients]に具材の情報を格納
    //   navigate('/game', { state: { selectedIngredients: payloadData } });
    // } catch (error) {
    //   console.error('具材情報のBE送信に失敗しました:', error);
    //  alert("具材情報の送信に失敗しました。もう一度試してください。");
    // }
    // =======================================================

    // API通信コード追加後：通信が成功しないと遷移しない
    // 現在は通信無しで遷移
    navigate('/game', { state: { selectedIngredients: payloadData } });
  };

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h2>具材選択画面</h2>
      <p>材料を3つ選んでください（現在: {selectedChar.length}/3）</p>
      {!!connectedRoomId && (
        <p style={{ fontSize: '12px', color: '#455a64' }}>
          Controller room: {connectedRoomId} / seq: {latestControllerSequence} / cmd: {latestControllerCommand || '-'}
        </p>
      )}

      {/* 具材の表示エリア */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', margin: '30px 0', flexWrap: 'wrap' }}>
        {availableItems.map((item, index) => {
          // この具材が選択されているかどうか
          const isSelected = selectedChar.includes(item.id);
          
          return (
            <div
              key={item.id}
              onClick={() => {
                setFocusArea('ingredient');
                toggleSelection(item.id);
              }} // クリックで選択・解除
              style={{
                padding: '20px',
                border: isSelected
                  ? '5px solid #ff9800'
                  : focusArea === 'ingredient' && focusedIndex === index
                    ? '4px solid #42a5f5'
                    : '2px solid #ccc',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: isSelected ? 'bold' : 'normal',
                backgroundColor: isSelected ? '#fff3e0' : focusArea === 'ingredient' && focusedIndex === index ? '#e3f2fd' : 'transparent',
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
            onClick={() => {
            setFocusArea('add-button');
              setIsPickerOpen(!isPickerOpen);
          }}
          style={{
            padding: '10px 20px',
            cursor: 'pointer',
            borderRadius: '20px',
            backgroundColor: focusArea === 'add-button' ? '#d1ecff' : '#e0e0e0',
            border: focusArea === 'add-button' ? '3px solid #42a5f5' : 'none'
          }}
         >
            ＋ さらに具材を選択
         </button>
      </div>

      {/* 絵文字ピッカー（ボタンを押したら出現） */}
      {isPickerOpen && (
        <div style={{ padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '10px', display: 'inline-block', maxWidth: '400px' }}>
          <p style={{ marginTop: '0' }}>追加する絵文字を選んでね</p>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            
            {FOOD_EMOJIS.map((food, index) => (
              <span
                key={food.emoji} 
                onClick={() => {
                  setFocusArea('picker-item');
                  setPickerFocusedIndex(index);
                  pickerFocusedIndexRef.current = index;
                  addCustomIngredient(food);
                  setIsPickerOpen(false);
                  setFocusArea('ingredient');
                  focusAreaRef.current = 'ingredient';
                  setFocusedIndex(0);
                  focusedIndexRef.current = 0;
                }}  // クリックで具材追加
                
                style={{
                  fontSize: '30px',
                  cursor: 'pointer',
                  padding: '5px',
                  border: focusArea === 'picker-item' && pickerFocusedIndex === index
                    ? '3px solid #42a5f5'
                    : '1px solid #ccc',
                  borderRadius: '5px',
                  backgroundColor: focusArea === 'picker-item' && pickerFocusedIndex === index
                    ? '#e3f2fd'
                    : 'white'
                }}
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
          <button 
            onClick={() => {
              setFocusArea('confirm-button');
              handleComplete();
            }} // クリックで選択完了の処理を実行
            style={{
              padding: '15px 30px',
              fontSize: '18px',
              cursor: 'pointer',
              backgroundColor: '#2196f3',
              color: '#fff',
              border: focusArea === 'confirm-button' ? '3px solid #fff59d' : 'none',
              borderRadius: '5px',
              fontWeight: 'bold'
            }}
            >
            決定（ゲームへ）
          </button>
        ) : (
          <button disabled style={{ padding: '15px 30px', fontSize: '18px', cursor: 'not-allowed', backgroundColor: '#ccc', color: '#fff', border: 'none', borderRadius: '5px' }}>
            材料をあと {3 - selectedChar.length} 個選んでね
          </button>
        )}
      </div>
    </div>
  );
}