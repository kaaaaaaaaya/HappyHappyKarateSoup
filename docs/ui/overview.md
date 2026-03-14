# 🗺️ 概観ドキュメント (Overview)

## 1. 全体テーマ・世界観
* **コンセプト:** Wiiなどの体感型テレビゲームの感覚をWebとスマホで再現する「空手 × 料理」アクション。
* **プレイスタイル:** PCをモニター（画面）として置き、iPhoneをコントローラー（Wiiリモコン）として手に持つ。
* **体験のコア:** 画面の動きに合わせてiPhoneを前に突き出す（パンチする）ことで具材を粉砕する爽快感と、完成した謎のスープによるハッピーな体験。

## 2. システム構成の基本
* **PC側:** 描画・メインロジック・BGM・AIコメント生成を担当（Webアプリ）。
* **iPhone側:** センサー入力（加速度・ジャイロ）・触覚フィードバック（Taptic Engine）・効果音を担当（iOSネイティブアプリ）。
* **通信:** WebSocketサーバーを介して、両者をリアルタイム（低遅延）で同期する。

## 3. 画面遷移図（フロー）

```mermaid
graph TD
    %% PC側のフロー
    subgraph PC[PCモニター側]
        P_Login[ログイン画面] --> P_Home[ホーム画面]
        P_Home --> P_Ready[コントローラー接続画面<br>QRコード表示]
        P_Ready --> P_Select[具材選択画面]
        P_Select --> P_Game[ゲーム画面<br>パンチで具材カット]
        P_Game -. 優先度低 .-> P_Mix[かき混ぜ画面]
        P_Game --> P_Result[リザルト画面]
    end

    %% iPhone側のフロー
    subgraph iPhone[iPhoneコントローラー側]
        I_Scan[PC連携画面<br>QR読み取り] --> I_Connected[接続完了]
        I_Connected --> I_Game[ゲーム画面<br>拳表示・パンチ検知]
        I_Game --> I_Result[リザルト画面<br>疲れた拳]
    end

    %% 連動アクション
    I_Scan -. WebSocket接続 .-> P_Ready
    I_Game -. 斬撃シグナル .-> P_Game
    P_Game -. ヒット判定 .-> I_Game
```