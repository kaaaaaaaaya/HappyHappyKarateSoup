# 🌐 apps/web (PCモニター側アプリ)

PCのモニター側に表示するWebアプリケーションです。React + TypeScript + Vite によって構築されています。

## 📍 フォルダ構造

```text
apps/web/
 ├── src/                  # アプリケーションの主要なソースコード
 │    ├── assets/          # 画像などのアセット
 │    ├── pages/           # 画面ごとのUIコンポーネント (Home, Game, Resultなど)
 │    ├── App.tsx          # 各画面へのルーティング
 │    └── main.tsx         # アプリケーションのエントリーポイント
 ├── public/               # 公開用の静的ファイル置き場
 ├── index.html            # WebアプリのベースとなるHTMLファイル
 ├── package.json          # 依存するライブラリやスクリプト定義
 ├── tsconfig.json         # TypeScriptの設定
 └── vite.config.ts        # Vite (ビルドツール) の設定
```

## 各フォルダの詳細

* **[`src/` 配下の構造について](./src/src.md)**
  ユーザーが目にする画面や操作を管理するコードの中心です。詳細は専用ドキュメントをご参照ください。

* **`public/`**
  ビルド過程で一切処理されず、そのままデプロイされる静的なリソース（画像やファビコンなど）を配置します。

*(※注: `apps/web/backend-java/` 等の不要に見えるフォルダが混入している場合、システム的には `services/backend/` を参照するため、移行段階の一時的なものである可能性があります。)*
