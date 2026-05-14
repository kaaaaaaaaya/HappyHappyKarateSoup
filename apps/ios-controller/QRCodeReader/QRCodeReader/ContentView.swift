//
//  ContentView.swift
//  QRCodeReader
//
//  Created by 北田果耶 on 2026/03/14.
//

import AVFoundation
import Foundation
import SwiftUI

/// カメラのアクセス権限状態を管理する列挙型
private enum CameraAuthorizationState {
    case notDetermined // 未決定
    case authorized    // 許可済み
    case denied        // 拒否
}

struct ContentView: View {
    // MARK: - 状態管理
    
    @State private var cameraAuthorization: CameraAuthorizationState = .notDetermined
    @State private var isScanning = false          // スキャンの実行中フラグ
    @State private var scannedCode: String = ""    // 読み取ったQRコードの内容
    @State private var isControllerPresented = false // コントローラー画面の表示フラグ

    var body: some View {
        VStack(spacing: 16) {
            Text("QRコードリーダー")
                .font(.title2.bold())

            // メインコンテンツ（カメラビュー または 状態メッセージ）
            content
                .frame(maxWidth: .infinity, minHeight: 320)
                .background(Color.black.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 16))

            // 読み取り結果表示エリア
            resultSection
        }
        .padding()
        .onAppear(perform: requestCameraAccessIfNeeded) // 起動時に権限確認
        .onAppear {
            // コントローラーが表示されていない時は画面を縦向き(Portrait)に固定
            if !isControllerPresented {
                AppDelegate.lockOrientation(.portrait)
            }
        }
        .onDisappear {
            // 画面が閉じる際に画面回転の制限を解除
            AppDelegate.lockOrientation(.allButUpsideDown)
        }
        .onChange(of: isControllerPresented) { _, presented in
            // コントローラーの表示状態に合わせて画面の向きを制御
            if presented {
                AppDelegate.lockOrientation(.allButUpsideDown) // ゲーム中は回転を許可
            } else {
                AppDelegate.lockOrientation(.portrait) // リーダー画面では縦向き固定
            }
        }
        // QRコード読み取り後に表示されるゲーム操作画面
        .fullScreenCover(isPresented: $isControllerPresented) {
            ControllerView(
                scannedCode: scannedCode,
                onDirection: { direction in
                    // 十字キーなどの方向コマンドを送信
                    sendControlCommand(direction, from: scannedCode)
                },
                onConfirm: {
                    // 決定ボタンのコマンドを送信
                    sendControlCommand("confirm", from: scannedCode)
                },
                onClose: {
                    // 閉じる処理：状態をリセットしてスキャンを再開
                    scannedCode = ""
                    isScanning = true
                    isControllerPresented = false
                }
            )
        }
    }

    // MARK: - ビューコンポーネント
    
    /// カメラの権限状態に応じたメインビューの切り替え
    @ViewBuilder
    private var content: some View {
        switch cameraAuthorization {
        case .authorized:
            ZStack {
                // カメラのスキャンビュー本体
                QRScannerView(isScanning: $isScanning) { code in
                    scannedCode = code
                    isScanning = false
                    notifyRoomJoinedIfPossible(from: code) // サーバーにルーム参加を通知
                    isControllerPresented = true          // コントローラーへ遷移
                }
                .clipShape(RoundedRectangle(cornerRadius: 16))

                // 読み取り範囲を示す枠線
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.white, lineWidth: 3)
                    .frame(width: 220, height: 220)

                VStack {
                    Spacer()
                    Text("QRコードを枠に合わせてください")
                        .font(.footnote.weight(.semibold))
                        .padding(.vertical, 6)
                        .padding(.horizontal, 12)
                        .background(.black.opacity(0.6))
                        .foregroundStyle(.white)
                        .clipShape(Capsule())
                        .padding(.bottom, 16)
                }
            }
            .onAppear {
                // まだ読み取っていない場合のみスキャンを開始
                if scannedCode.isEmpty {
                    isScanning = true
                }
            }

        case .denied:
            // 権限拒否時のメッセージ
            VStack(spacing: 12) {
                Image(systemName: "camera.fill")
                    .font(.system(size: 28))
                Text("カメラの使用が許可されていません。")
                    .multilineTextAlignment(.center)
                Text("設定 > プライバシー > カメラ から許可してください。")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding()

        case .notDetermined:
            // 権限確認中のローディング表示
            VStack(spacing: 12) {
                ProgressView()
                Text("カメラの許可を確認中...")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
    }

    /// 読み取り結果と再スキャンボタンのセクション
    @ViewBuilder
    private var resultSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("読み取り結果")
                .font(.headline)

            if scannedCode.isEmpty {
                Text("まだ読み取っていません。")
                    .foregroundStyle(.secondary)
            } else {
                Text(scannedCode)
                    .textSelection(.enabled) // 長押しでコピー可能
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            Button(isScanning ? "スキャン中..." : "もう一度スキャン") {
                scannedCode = ""
                isScanning = true
            }
            .buttonStyle(.borderedProminent)
            .disabled(cameraAuthorization != .authorized)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - ヘルパー関数
    
    /// カメラアクセスの許可を要求
    private func requestCameraAccessIfNeeded() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            cameraAuthorization = .authorized
            if scannedCode.isEmpty {
                isScanning = true
            }
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { granted in
                DispatchQueue.main.async {
                    cameraAuthorization = granted ? .authorized : .denied
                    if granted {
                        isScanning = true
                    }
                }
            }
        default:
            cameraAuthorization = .denied
        }
    }

    /// スキャンしたURL情報を元に、サーバーのルーム参加APIを叩く
    private func notifyRoomJoinedIfPossible(from scannedValue: String) {
        // URLからroomIdを取得
        guard let components = URLComponents(string: scannedValue),
            let roomId = components.queryItems?.first(where: { $0.name == "roomId" })?.value,
            !roomId.isEmpty
        else {
            return
        }

        // apiBaseが指定されていない場合はデフォルト(localhost)を使用
        let apiBase = components.queryItems?
            .first(where: { $0.name == "apiBase" })?
            .value?
            .trimmingCharacters(in: .whitespacesAndNewlines)

        let resolvedBaseUrl = (apiBase?.isEmpty == false ? apiBase! : "http://localhost:8080")
            .trimmingCharacters(in: CharacterSet(charactersIn: "/"))

        // エンドポイントURLの構築
        guard
            let encodedRoomId = roomId.addingPercentEncoding(
                withAllowedCharacters: .urlPathAllowed),
            let url = URL(string: "\(resolvedBaseUrl)/api/controller/rooms/\(encodedRoomId)/join")
        else {
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // 通信実行（ルーム参加通知）
        URLSession.shared.dataTask(with: request) { _, response, error in
            if error != nil { return }
            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? -1
            if statusCode != 200 {
                print("join status: \(statusCode) (URL: \(url.absoluteString))")
            }
        }.resume()
    }

    /// 指定されたコマンド（方向、決定など）をサーバーに送信
    private func sendControlCommand(_ command: String, from scannedValue: String) {
        guard let components = URLComponents(string: scannedValue),
            let roomId = components.queryItems?.first(where: { $0.name == "roomId" })?.value,
            !roomId.isEmpty
        else {
            return
        }

        let apiBase = components.queryItems?
            .first(where: { $0.name == "apiBase" })?
            .value?
            .trimmingCharacters(in: .whitespacesAndNewlines)

        let resolvedBaseUrl = (apiBase?.isEmpty == false ? apiBase! : "http://localhost:8080")
            .trimmingCharacters(in: CharacterSet(charactersIn: "/"))

        // エンドポイント構築: /rooms/{roomId}/commands/{command}
        guard
            let encodedRoomId = roomId.addingPercentEncoding(
                withAllowedCharacters: .urlPathAllowed),
            let encodedCommand = command.addingPercentEncoding(
                withAllowedCharacters: .urlPathAllowed),
            let url = URL(
                string:
                    "\(resolvedBaseUrl)/api/controller/rooms/\(encodedRoomId)/commands/\(encodedCommand)"
            )
        else {
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // 通信実行（コマンド送信）
        URLSession.shared.dataTask(with: request) { _, response, error in
            if let error {
                print("cmd \(command): failed (\(error.localizedDescription))")
                return
            }

            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? -1
            print("cmd \(command): status \(statusCode)")
        }.resume()
    }
}

#Preview {
    ContentView()
}