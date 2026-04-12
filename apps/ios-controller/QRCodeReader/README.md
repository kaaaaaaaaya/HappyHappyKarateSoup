# QRコードリーダー iOS アプリ

**Happy Happy Karate Soup** - 空手アクション × 料理ゲームのコントローラーアプリです。モーション検出を使ってゲーム内のアクションを操作します。

## 概要

このiOSアプリは、Happy Happy Karate Soupゲームのワイヤレスコントローラーとして機能します。空手の動き（突き、手刀、混ぜるなど）を検出し、QRコードスキャンで確立したWebSocket接続を通じてメインゲームに送信します。

### 主な機能

- **QRコードスキャン**: メインゲーム画面に表示されたQRコードをスキャンして接続を確立
- **モーション検出**: デバイスの加速度計とジャイロスコープを使用して空手の動きを検出
- **リアルタイム通信**: モーションデータをWebSocket経由でメインゲームに送信
- **縦画面ロック**: 最適なゲームプレイのために縦向き表示に固定
- **ビジュアルフィードバック**: 接続状態とモーション検出をリアルタイム表示

## アーキテクチャ構成

### メインSwiftファイル

- **QRCodeReaderApp.swift**: アプリのエントリーポイントとウィンドウ設定
- **ContentView.swift**: QRコードスキャナーと状態表示を含むメインUI
- **QRScannerView.swift**: AVFoundationを使用したQRコードスキャンビュー
- **ControllerView.swift**: コントローラーインターフェースとモーション表示
- **ControllerMotionDetector.swift**: 空手の動き検出用のコア処理
- **StirDetectorView.swift**: 混ぜるモーション用のジェスチャー検出
- **Color+Hex.swift**: UI用のカスタムカラーユーティリティ

## 必要環境

- iOS 14.0以上
- Xcode 13.0以上
- モーションセンサー搭載iPhone（加速度計、ジャイロスコープ）
- QRコードスキャン用カメラ許可

## セットアップ & 開発

### アプリのビルド

1. XcodeでプロジェクトファイルからQRCodeReaderを開く:
   ```bash
   open QRCodeReader/QRCodeReader.xcodeproj
   ```

2. ターゲットデバイスまたはシミュレーターを選択

3. ビルドして実行 (Cmd+R)

### 必要な権限

`Info.plist`で設定される以下の権限が必要です:
- **カメラ**: QRコードスキャン用
- **モーション**: ジェスチャー検出用

## 使い方

1. PCのブラウザでHappy Happy Karate Soupウェブゲームを起動
2. ウェブゲームでセッション用のQRコードを生成・表示
3. このiOSアプリを開き「QRコードをスキャン」をタップ
4. iPhoneのカメラをQRコードに向ける
5. 接続後、空手の動きを実行してゲームを操作:
   - **突き**: 真っ直ぐなパンチ動作 = 具材をスライス
   - **手刀**: 手刀の切り動作 = スペシャルアクション
   - **混ぜ**: 円形の動き = 混ぜる動作

## テスト

プロジェクトに含まれるテストスイートを実行:
- **QRCodeReaderTests**: コア処理用ユニットテスト
- **QRCodeReaderUITests**: UI統合テスト

## プロジェクト構成

```
QRCodeReader/
├── QRCodeReader/              # メインアプリソースコード
│   ├── QRCodeReaderApp.swift      # アプリエントリーポイント
│   ├── ContentView.swift          # メインUI
│   ├── QRScannerView.swift        # QRスキャン処理
│   ├── ControllerView.swift       # コントローラーUI
│   ├── ControllerMotionDetector.swift  # モーション検出
│   └── ...
├── QRCodeReader.xcodeproj     # Xcodeプロジェクト設定
├── QRCodeReaderTests/         # ユニットテスト
└── QRCodeReaderUITests/       # UIテスト
```

## メインゲームとの連携

このアプリはバックエンドAPI経由でWebSocket通信を行います:

- **QRコードペイロード**: セッションIDと接続エンドポイントを含む
- **モーションデータ形式**: 検出したアクションをコマンドイベントとして送信
- **リアルタイム更新**: ゲームプレイ中に持続的な接続を維持

## 開発に参加する場合

モーション検出またはUIを修正する際:

1. `QRCodeReader/` ディレクトリ内の関連するSwiftファイルを編集
2. テストを実行: Xcode内で `Cmd+U`
3. QRコードスキャン機能が正しく動作することを確認
4. 様々なデバイス動作でモーション検出の精度をテスト

## 既知の制限事項

- QRコードスキャンは明るい環境での使用が必要
- モーション検出の精度はデバイスキャリブレーションに依存
- 接続はセッションベース。新しいゲームセッション開始時に再接続が必要

## 関連ドキュメント

- [アーキテクチャ & データフロー](../../docs/architecture/data_flow.md)
- [iOSアプリドキュメント](../../docs/architecture/apps/ios-controller/)
- [メインゲームREADME](../../../README.md)
