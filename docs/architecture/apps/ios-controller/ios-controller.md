# 📱 apps/ios-controller (iPhoneコントローラーアプリ)

iPhoneを直接コントローラーとして見立てて遊ぶためのネイティブiOSアプリです。Swiftによって構築されています。

## 📍 フォルダ構造

```text
apps/ios-controller/
 ├── PunchAction/          # 「突き」の動作を判定するビューや処理
 ├── ChopAction/           # 「手刀」の動作を判定するビューや処理
 ├── QRCodeReader/         # PC画面のQRコードを読み取り通信を確立する機能
 ├── RemoteController/     # PC画面のメニュー操作用（十字キー/決定ボタンなど）
 └── (その他 Swift/Xcode設定ファイル群)
```

## 各フォルダの詳細

* **`PunchAction/`**
  ユーザーがiPhoneを持ち、前方に突き出すパンチの動きを加速度センサー等を用いて検知します。

* **`ChopAction/`**
  ユーザーがiPhoneを持ち、下方に手を振り下ろすチョップの動きをセンサーで検知します。

* **`QRCodeReader/`**
  ゲーム開始時、PCのWeb画面上に表示されたQRコードをカメラで読み込むことで、どの部屋に入るか、どの端末と連携するかを処理します。

* **`RemoteController/`**
  縦持ち状態などでの画面操作時、ボタン入力をトリガーとしてPCのWeb側に操作イベントを送信する役割を果たします。
