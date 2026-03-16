# Happy Happy Karate Soup

## Overview
エンジニアの運動不足解消と気分転換を目的にした、**空手アクション × 料理ゲーム**です。  
PC(Web)をメイン画面、iPhoneをコントローラーとして使い、空手の動きで具材を切って自分だけのスープを完成させます。

- コンセプト: 「空手の動きで具材を切り、自分だけのスープを生成する」
- 体験イメージ: Wiiのように、画面とコントローラーを分けて遊ぶ
- 提供形態: Webアプリ（メイン） + iOSアプリ（コントローラー）

## Architecture
```text
ユーザー
	├─ PC(Web / React): ログイン・ゲーム表示・結果表示
	└─ iPhone(Swift): モーション入力(突き/手刀など)

Web Frontend / iOS App
	└─ Backend API (Java / Spring Boot)
				├─ 認証・ユーザー管理
				├─ プレイログ保存（誰が/いつ/何を切ったか）
				├─ スコア計算・ランキング集計
				├─ Vertex AI 連携（プロンプト生成/呼び出し）
				└─ 画像・メタデータ管理

Infrastructure
	├─ Cloud SQL: ユーザー・プレイ履歴・ランキング
	├─ Google Cloud Storage: 生成画像などのアセット保存
	├─ Artifact Registry: コンテナ管理
	└─ GKE or Cloud Run: アプリ実行基盤
```

### Vertex AI の役割
- Front: ユーザーのアクション（モーション）を送信
- Backend(Java): 入力データを集計し、AI向けプロンプトを生成
- Vertex AI:
	- Gemini: スープの味の特徴や評価コメントを生成
	- Imagen: スープ画像を生成
- iPhone: スープ名をユーザー操作で決定
- Front: 生成結果をリザルト画面に表示（カラオケ採点のような見せ方を想定）

## Features
### ゲームの基本フロー（MVP）
1. ログイン
2. ホーム画面からゲーム開始
3. 具材をリストから選択
4. ゲームプレイ（まずは**突き(パンチ)**中心）
5. 必要に応じて「混ぜる」工程（オプション）
6. スープ完成（AIで味の評価・画像を生成、名前はiPhone側で決定）
7. リザルト表示・スコア反映

### PC側 画面遷移
1. ログイン画面
2. ホーム画面
3. ゲームスタート
4. iPhone接続画面（QR表示）
5. 具材選択画面
6. （優先度低）遊び方説明
7. ゲーム画面
	 - 7-1. 具材をパンチする画面（落下/横流れ具材をタイミングよく処理）
	 - 7-2. （優先度低）具材をかき混ぜる画面
8. リザルト画面

### iPhone側 画面遷移
1. PC連携画面
2. QR読み取り
3. ゲーム画面（拳の突き出し表示、技入力）
4. 成功時フィードバック
5. リザルト画面

### ゲーム内判定・表現
- 具材の結果判定: 完璧に鍋へ入る / 落下する / 破片だけ入る
- 入力技（例）: 突き、手刀
- キャラ要素: 帯を強調したアバター

## Tech Stack
### Frontend
- Web: React.js
- iOS Controller App: Swift

### Backend
- Java (Spring Boot)

### Infrastructure
- Cloud SQL
- Google Cloud Storage (GCS)
- Artifact Registry
- GKE または Cloud Run
- （認証候補）Google Cloud ベースのユーザー認証

## Setup
> 現在は企画・設計フェーズ。実装着手時に更新予定。

想定セットアップ方針:
- apps / services / infra の単位で構成
- apps配下にWebフロントとiOSコントローラーを配置
- services配下にバックエンドAPIを配置
- バックエンドはDockerコンテナ化
- インフラはGoogle Cloudで構成

## Usage
1. PCでWebアプリにログイン
2. iPhoneアプリでQRを読み取り、PCに接続
3. 具材を選び、空手モーションで調理
4. 生成されたスープの味の評価コメント・画像を確認（名前はiPhone側で決定）
5. スコアとランキングを確認

## API
### 想定される責務
- ユーザー登録・認証
- プレイセッション開始/終了
- 入力イベント（技・タイミング・ヒット情報）受信
- スコア計算
- AI生成リクエスト（味の評価コメント/画像）
- リザルト保存・ランキング集計

### データ保存の要点
- 誰が
- いつ
- どんな具材を切ったか
- どんなスープができたか

### 運用上の要件
- APIキー管理
- プロンプト生成ロジックはバックエンドで管理

## Directory Structure
```text
HappyHappyKarateSoup/
	README.md
	apps/
		web/               # React.js (PCメイン画面)
		ios-controller/    # Swift (iPhoneコントローラー)
	services/
		backend/           # Java Spring Boot API
	infra/               # Docker/Kubernetes/Cloud設定
```

## Future Work
### 追加したい機能
- バイブレーション + 効果音
- 対戦モード
- 技の拡張
- 演出・サウンドの強化

### スコアリングの拡張
- カテゴリ別ランキング
- 技の完成度
- 技のヒット率
- 鍋に具材が正しく入った割合