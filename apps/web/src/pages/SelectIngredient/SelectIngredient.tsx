import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelectIngredient } from './useSelectIngredient';
import { FOOD_EMOJIS } from './emojis'; // 絵文字リストをインポート

export default function SelectIngredient() {
  const navigate = useNavigate();

  const {
    availableItems,
    selectedChar,
    isPickerOpen,
    setIsPickerOpen,
    toggleSelection,
    addCustomIngredient,
    isReady
  } = useSelectIngredient();

  const handleComplete = () => {
    const payloadData = availableItems.filter(item => selectedChar.includes(item.id));
    console.log('選択された具材:', payloadData);
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

  const styles = {
    page: {
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      // 🌟 背景画像、色、エフェクト、フォントは前の画面と同じ
      backgroundImage: `url(/images/background2.png)`, 
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      backgroundRepeat: 'no-repeat',
      fontFamily: "'DotGothic16', sans-serif", 
      color: '#000',
      overflowX: 'hidden' as const,
      boxSizing: 'border-box' as const,
    },
    // 🌟 前の画面から移植したツールバー
    header: {
      width: '100%',
      padding: '1.5rem 5%',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      boxSizing: 'border-box' as const,
      backgroundColor: 'rgba(255, 255, 255, 0.2)', // ツールバーを少し浮かせる
      backdropFilter: 'blur(5px)', // 背景ブラー
      borderBottom: '3px solid #000', // ツールバーの下にもふちを
    },
    logo: {
      fontSize: '1.5rem',
      fontWeight: 'bold',
      letterSpacing: '0.1rem',
    },
    userInfo: {
      fontSize: '1rem', 
      borderBottom: '2px solid #000',
      fontWeight: 'bold',
    },
    // コンテンツ全体のコンテナ
    contentBody: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      width: '100%',
      padding: '2rem 0',
    },
    title: {
      fontSize: '3rem',
      margin: '2rem 0 0.5rem 0',
      fontWeight: 900,
      textShadow: '2px 2px 0px #fff', // 白文字縁取り
    },
    subtitle: {
      fontSize: '1.2rem',
      marginBottom: '3rem',
      backgroundColor: '#fff', 
      padding: '0.2rem 1rem',
      border: '2px solid #000', // ふち
      borderRadius: '8px',
      display: 'inline-block',
    },
    // 🌟 具材グリッドコンテナ
    gridContainer: {
      display: 'flex',
      justifyContent: 'center',
      gap: '2rem', // カード間のギャップ
      margin: '0rem 0rem 3rem 0rem',
      flexWrap: 'wrap' as const,
      width: '90%', // 親要素に対して90%の幅
    },
    // 🌟 具材カード（Rectangle）
    card: {
      flexShrink: 0,
      width: '10rem', // 横幅固定
      // aspectRatio: '1 / 1', // 正方形にするか、Figmaに合わせて調整
      padding: '1.25rem', // 20px -> 1.25rem
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      // 🌟 共通エフェクト（3px黒縁 ＋ 4pxのベタ影 ＋ 角丸24px）
      border: '3px solid #000',
      boxShadow: '4px 4px 0px 0px #000',
      borderRadius: '24px', 
      backgroundColor: '#fff', // 基本は白背景
      cursor: 'pointer',
      transition: '0.1s', // フワッと沈むアクション
      position: 'relative' as const, // チェックマーク配置用
    },
    // 選択状態のカード
    cardSelected: {
      backgroundColor: '#ffde00', // 🌟 選択時は共通エフェクトの黄色（道着色）
    },
    cardEmoji: {
      fontSize: '3rem', // 大きく表示
      marginBottom: '0.5rem',
    },
    cardLabel: {
      fontSize: '1.1rem',
      fontWeight: 'bold',
      margin: 0,
    },
    // 🌟 さらに具材を選択するボタン（ブラー付きRectangle）
    addMoreButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '1rem 2.5rem',
      fontSize: '1rem',
      fontWeight: 'bold',
      cursor: 'pointer',
      backgroundColor: 'rgba(255, 255, 255, 0.2)', // ツールバーと同じく少し浮かせる
      backdropFilter: 'blur(5px)', // 背景ブラー
      border: '2px solid #000', // ふち
      borderRadius: '24px', // 角丸24px
      color: '#000',
      transition: 'transform 0.1s, box-shadow 0.1s',
      marginBottom: '3rem',
    },
    // 🌟 絵文字ピッカー（大きなRectangle）
    pickerCard: {
      backgroundColor: '#fff',
      width: '90%',
      maxWidth: '35rem',
      padding: '3rem 2rem',
      // 🌟 共通エフェクト（3px黒縁 ＋ 4pxのベタ影 ＋ 角丸24px）
      border: '3px solid #000',
      boxShadow: '4px 4px 0px 0px #000',
      borderRadius: '24px', 
      textAlign: 'center' as const,
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '1.5rem',
      marginBottom: '3rem',
    },
    pickerTitle: {
      fontSize: '1.2rem',
      fontWeight: 'bold',
      margin: 0,
    },
    pickerGrid: {
      display: 'flex',
      gap: '1.25rem', // 20px -> 1.25rem
      flexWrap: 'wrap' as const,
      justifyContent: 'center',
    },
    // 🌟 各絵文字（小さな Rectangle）
    pickerEmoji: {
      fontSize: '2rem', // 大きく表示
      cursor: 'pointer',
      padding: '0.625rem', // 10px -> 0.625rem
      // 細い黒縁 ＋ 角丸
      border: '2px solid #000',
      borderRadius: '8px', 
      backgroundColor: '#fff',
    },
    // 🌟 ゲームへ進むボタン（黄色いボタン Rectangle）
    buttonComplete: {
      padding: '1rem 3.5rem',
      fontSize: '1.3rem',
      fontFamily: "'DotGothic16', sans-serif", // ボタン内も確実に変更
      fontWeight: 'bold',
      backgroundColor: '#ffde00', // 🌟 黄色/道着色（共通エフェクト）
      color: '#000',
      cursor: 'pointer',
      border: '3px solid #000',
      boxShadow: '4px 4px 0px 0px #000',
      borderRadius: '24px', 
      transition: 'transform 0.1s, box-shadow 0.1s',
      marginBottom: '3rem',
    },
    // 🌟 材料不足で押せないボタン（disabled）
    buttonDisabled: {
      cursor: 'not-allowed',
      backgroundColor: '#ccc', // グレーアウト
      boxShadow: '0 0px 0px rgba(0,0,0,0)', // 🌟 影なしで沈んでいる感を
      color: '#000',
      opacity: 0.7,
    },
  };

  return (
    <div style={styles.page}>
      {/* 🌟 Google FontsからDotGothic16を読み込む */}
      <link href="https://fonts.googleapis.com/css2?family=DotGothic16&display=swap" rel="stylesheet" />
      
      <style>
        {`
          button:active, .addMoreButton:active {
            transform: translate(2px, 2px);
            box-shadow: 2px 2px 0px 0px #000 !important;
          }
        `}
      </style>

      {/* 🌟 移植されたツールバー */}
      <header style={styles.header}>
        <div style={styles.logo}>HAPPY HAPPY KARATE SOUP</div>
        <div style={styles.userInfo}>
          USER: {localStorage.getItem('user_name') || 'GUEST'}
        </div>
      </header>

      {/* メインコンテンツ */}
      <div style={styles.contentBody}>
        {/* Figmaタイトル */}
        <h1 style={styles.title}>SELECT INGREDIENTS</h1>
        {/* 説明テキスト Rectangle */}
        <p style={styles.subtitle}>材料を3つ選んでください（現在: {selectedChar.length}/3）</p>

        {/* 🌟 具材の表示グリッド */}
        <div style={styles.gridContainer}>
          {availableItems.map((item) => {
            const isSelected = selectedChar.includes(item.id);
            // ロジックとスタイルを統合
            return (
              <div
                key={item.id}
                onClick={() => toggleSelection(item.id)}
                // 選択状態に応じてスタイルを動的に適用
                style={{
                  ...styles.card,
                  ...(isSelected ? styles.cardSelected : {}),
                }}
              >
                <div style={styles.cardEmoji}>{item.emoji}</div>
                <h3 style={styles.cardLabel}>{item.label}</h3>
                {isSelected && (
                  <span style={{ 
                    color: '#000', // ふちに合わせた黒
                    fontSize: '0.8rem', 
                    borderBottom: '2px solid #000',
                    marginTop: '0.5rem',
                    fontWeight: 'bold',
                  }}>
                    選択中
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* さらに具材を選択するボタン */}
        <button
          onClick={() => setIsPickerOpen(!isPickerOpen)}
          className="addMoreButton" // CSSアニメーション用
          style={styles.addMoreButton}
        >
          <span>＋</span> さらに具材を選択
        </button>

        {/* 🌟 絵文字ピッカー（大きなRectangle） */}
        {isPickerOpen && (
          <div style={styles.pickerCard}>
            <p style={styles.pickerTitle}>追加する絵文字を選んでね</p>
            <div style={styles.pickerGrid}>
              {FOOD_EMOJIS.map(food => (
                <span
                  key={food.emoji} 
                  onClick={() => addCustomIngredient(food)}
                  style={styles.pickerEmoji}
                >
                  {food.emoji} 
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 決定ボタン（ゲームへ） */}
        {isReady ? (
          <button 
            onClick={handleComplete}
            style={styles.buttonComplete}
          >
            決定（ゲームへ）
          </button>
        ) : (
          // 🌟 disabled状態のボタン
          <button 
            disabled 
            style={{
              ...styles.buttonComplete,
              ...styles.buttonDisabled,
            }}
          >
            材料をあと {3 - selectedChar.length} 個選んでね
          </button>
        )}
      </div>
    </div>
  );
}