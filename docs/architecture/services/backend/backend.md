# ⚙️ services/backend (Java / Spring Boot サーバー)

ゲームのスコア計算、AIとの連携、ユーザーデータの保存などを管轄するAPIサーバーです。Java 21 と Spring Bootによって作られています。

## 📍 フォルダ構造

```text
services/backend/
 ├── src/                  # メインのソースコード群
 │    ├── main/java/       # Java APIプログラム
 │    ├── main/resources/  # アートリソース、譜面データ等の静的ファイル・設定
 │    └── test/            # 自動テストコード群
 ├── docs/                 # バックエンドAPI専用のドキュメント
 └── pom.xml               # Maven 依存関係・ビルドの設定ファイル
```

## 各フォルダの詳細

* **`src/main/java/`**
  サーバー内の主要な処理を担います。
  * `com/happykaratesoup/backend/chart/` : 具材を落とすタイミング（譜面）の管理・読み取り部分。
  * `com/happykaratesoup/backend/score/` : コントローラーの振動（パンチやチョップ）に基づいたスコア判定。

* **`src/main/resources/`**
  プログラムではない設定ファイルや、ゲーム全体の譜面データなどが含まれます。
  * `application.yml` : DB設定やサーバー設定
  * `charts/` : `soup_beginner_01.json` のようなゲーム内に使用されるJSONの譜面配置
  * `schema/` : 譜面データの必須項目を定めるJSON Schema等の定義

* **`src/test/`**
  各処理の正しさを検証する自動テスト。とくにスコアロジックなど、単体環境でのテストを想定して用意されます。

* **`docs/`**
  `score-calculation-api.md` のような、バックエンド側に閉じたAPIエンドポイントの振る舞い等を記述するドキュメントです。
