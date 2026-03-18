# backend-java

HappyHappyKarateSoup の Web バックエンド（Java / Spring Boot）です。

## 役割
- フロントエンドから投入成功材料を受け取る
- Gemini API で以下を生成する
  - 完成スープ画像
  - 味の六角形レーダーチャート用スコア（甘味・酸味・塩味・苦味・うま味・辛味）
  - 完成スープへのコメント


## Gemini 接続モード
- APIキー方式（デフォルト）
  - `GEMINI_USE_VERTEX_AI=false`
  - `GEMINI_API_KEY` を設定
- Vertex AI方式
  - `GEMINI_USE_VERTEX_AI=true`
  - `GEMINI_PROJECT_ID`, `GEMINI_LOCATION` を設定
  - Application Default Credentials を利用するため `GOOGLE_APPLICATION_CREDENTIALS` を設定

## API
- `GET /api/soup/health`
- `POST /api/soup/generate`

### POST リクエスト例
```json
{
  "ingredients": ["tomato", "onion", "miso"],
  "referenceImageDataUrl": "data:image/png;base64,..."
}
```

- `referenceImageDataUrl` は任意です。
- 形式は `data:image/<type>;base64,<...>` を想定します。

### レスポンス例
```json
{
  "ingredients": ["tomato", "onion", "miso"],
  "imageDataUrl": "data:image/png;base64,...",
  "flavor": {
    "sweet": 20,
    "sour": 35,
    "salty": 70,
    "bitter": 10,
    "umami": 80,
    "spicy": 15
  },
  "comment": "旨味が重なるパンチ系スープ！"
}
```

## API処理フロー（Controller → Service → Client）
###  `POST /api/soup/generate`

```text
Client
  → SoupController.generate(request)
    → SoupGenerationService.generate(ingredients)
      ├→ GeminiImageService.generateSoupImage(ingredients)
      │   ├→ resources/prompts/image_prompt.txt を読込
      │   └→ GeminiClient.generateImageBase64(...)
      └→ GeminiFlavorCommentService.generateFlavorAndComment(ingredients)
          ├→ resources/prompts/flavor_comment_prompt.txt を読込
          └→ GeminiClient.generateText(...) （味スコア+コメントを1回で生成）
    → SoupGenerateResponse を組み立てて返却
```

#### 例外時の流れ
- Gemini呼び出し中に例外が発生した場合、`ApiExceptionHandler` でHTTPレスポンスへ整形します。
- 画像生成モデルが不正・未対応などで失敗した場合、`GeminiImageService` は `imageDataUrl=""` でレスポンス継続を試みます（他の生成結果は返却可能）。

#### プロンプト適用ルール
- `prompts/*.txt` の `{{ingredients}}` を実際の材料リスト（`tomato, onion, miso` のようなCSV文字列）へ置換して送信します。

## 注意
- `imageDataUrl` が空文字のときは、Gemini の画像モデルレスポンスにインライン画像が含まれていません。
- その場合は、画像生成モデル名やAPI仕様を確認してください。
- Vertex AI 利用時、`imagen-*` 系モデルは `:generateContent` ではなく `:predict` エンドポイントを使用します。


## ディレクトリ / ファイル構成（詳細）

```text
apps/web/backend-java/
├── .env.example
├── .env
├── build.gradle
├── settings.gradle
├── README.md
└── src/
    ├── main/
    │   ├── java/com/happysoup/backend/
    │   │   ├── BackendJavaApplication.java
    │   │   ├── client/
    │   │   │   └── GeminiClient.java
    │   │   ├── config/
    │   │   │   ├── AppConfig.java
    │   │   │   └── GeminiProperties.java
    │   │   ├── controller/
    │   │   │   ├── SoupController.java
    │   │   │   └── ApiExceptionHandler.java
    │   │   ├── model/
    │   │   │   ├── request/
    │   │   │   │   └── SoupGenerateRequest.java
    │   │   │   └── response/
    │   │   │       ├── SoupGenerateResponse.java
    │   │   │       └── FlavorProfileResponse.java
    │   │   └── service/
    │   │       ├── SoupGenerationService.java
    │   │       ├── GeminiImageService.java
    │   │       ├── GeminiFlavorService.java
    │   │       ├── GeminiCommentService.java
    │   │       └── GeminiFlavorCommentService.java
    │   └── resources/
    │       ├── application.yml
    │       └── prompts/
    │           ├── image_prompt.txt
    │           ├── flavor_prompt.txt
    │           └── comment_prompt.txt
    └── test/
        └── java/com/happysoup/backend/
            └── BackendJavaApplicationTests.java
```

### 主要ファイルの責務

#### ルート
- `.env.example`
  - 環境変数の雛形。新規開発者はまずこの内容を基準に `.env` を作成します。
- `.env`
  - ローカル実行用の実値設定（APIキー、接続モード、モデル名など）。Git管理対象外想定です。
- `build.gradle`
  - Spring Boot / 依存ライブラリ / テスト実行設定を定義。
- `settings.gradle`
  - Gradleプロジェクト名（`backend-java`）を定義。

#### main/java
- `BackendJavaApplication.java`
  - Spring Boot のエントリーポイント。

- `client/GeminiClient.java`
  - Gemini API 呼び出しの実装層。
  - テキスト生成と画像生成を担当。
  - APIキー方式と Vertex AI方式の分岐を担当。

- `config/GeminiProperties.java`
  - `application.yml` / 環境変数から Gemini 設定を受け取る設定クラス。
- `config/AppConfig.java`
  - WebClient や CORS などアプリ共通の設定を定義。

- `controller/SoupController.java`
  - `GET /api/soup/health`, `POST /api/soup/generate` を公開するRESTエンドポイント。
- `controller/ApiExceptionHandler.java`
  - バリデーションエラーや実行時例外をAPIレスポンスへ整形。

- `model/request/SoupGenerateRequest.java`
  - 生成APIの入力モデル（材料一覧）。
- `model/response/SoupGenerateResponse.java`
  - 生成APIの最終レスポンスモデル（画像、味、コメント、時刻など）。
- `model/response/FlavorProfileResponse.java`
  - 味スコア（6軸）モデル。

- `service/SoupGenerationService.java`
  - ユースケースのオーケストレーション層。
  - 画像・味・コメント生成サービスを組み合わせて最終レスポンスを作成。
- `service/GeminiImageService.java`
  - 画像生成専用サービス。
  - `resources/prompts/image_prompt.txt` を読み込み、`{{ingredients}}` を置換して画像生成。
- `service/GeminiFlavorCommentService.java`
  - 味スコアとコメントを1回の Gemini テキスト生成でまとめて生成するサービス。
  - `resources/prompts/flavor_comment_prompt.txt` を読み込み、JSONをパースして味スコアとコメントを返却。
- `service/GeminiFlavorService.java`
  - （旧）味スコア生成専用サービス。
  - `resources/prompts/flavor_prompt.txt` を読み込み、JSONをパースして0〜100に正規化。
- `service/GeminiCommentService.java`
  - （旧）コメント生成専用サービス。
  - `resources/prompts/comment_prompt.txt` を読み込み、短いコメントを生成。

#### main/resources
- `application.yml`
  - ポートやGemini関連のデフォルト値を管理。
- `prompts/*.txt`
  - Gemini向けプロンプトテンプレート群。
  - プレースホルダ `{{ingredients}}` を各サービスで置換して使用。

#### test
- `BackendJavaApplicationTests.java`
  - コンテキスト起動確認の基本テスト。
  - 依存解決や設定不備の初期検知に利用。

## セットアップ
1. `.env.example` を参考に環境変数を設定
2. ルート: [apps/web/backend-java](.)
3. 起動:
   - `./gradlew bootRun`（Gradle Wrapper追加後）
   - または `gradle bootRun`

## POSTテスト結果をファイルへ保存する

Base64 の `imageDataUrl` は長くなりやすいため、標準出力ではなくファイル保存で確認できます。

- スクリプト: `scripts/post_generate_to_files.sh`
- 生成先（デフォルト）: `tmp/generate-output/`

主な出力ファイル:
- `response.json` : APIレスポンス全体
- `image_prompt.txt` : 画像生成に使ったプロンプト
- `image_data_url.txt` : Data URL 生文字列
- `image.png` : `imageDataUrl` が存在する場合にデコード保存
- `summary.txt` : 主要項目の短い要約

実行例:
- 既定材料（tomato,onion,miso）
  - `bash scripts/post_generate_to_files.sh`
- 材料を変更
  - `INGREDIENTS_CSV="tomato,onion,miso,chili" bash scripts/post_generate_to_files.sh`
- 参照画像を付けて送信（ローカル画像を Data URL 化して送信）
  - `REFERENCE_IMAGE_PATH="/absolute/path/to/miso.png" bash scripts/post_generate_to_files.sh`
- 出力先を変更
  - `OUTPUT_DIR="./tmp/my-run" bash scripts/post_generate_to_files.sh`

