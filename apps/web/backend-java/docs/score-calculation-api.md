# Score Calculation API Spec

## Purpose
フロントから受け取った判定結果（Perfect / Good / Bad）を使って、
バックエンドでスコアを計算し、保存せずにレスポンスとして返す。

## Endpoint
- Method: `POST`
- Path: `/api/scores/calculate`
- Auth: 不要（公開API）
- Persistence: なし（DB保存しない）

## Request
### Body
```json
{
  "perfect": 10,
  "good": 5,
  "bad": 2
}
```

### Field Rules
- `perfect`: integer, 0以上
- `good`: integer, 0以上
- `bad`: integer, 0以上

## Scoring Rules
- Perfect: `100` 点
- Good: `50` 点
- Bad: `0` 点

### Formula
`totalScore = perfect * 100 + good * 50 + bad * 0`

## Response
### 200 OK
```json
{
  "totalScore": 1250,
  "counts": {
    "perfect": 10,
    "good": 5,
    "bad": 2
  },
  "points": {
    "perfect": 100,
    "good": 50,
    "bad": 0
  }
}
```

## Error Cases
- `400 Bad Request`
  - 必須項目不足
  - 負数の入力
  - 数値以外の入力

## Frontend Usage Flow
1. プレイ終了時に判定件数を集計
2. `/api/scores/calculate` に `perfect/good/bad` を送信
3. `totalScore` をリザルト画面に表示

## Future Work
- スコア計算結果をクラウドに保存する
