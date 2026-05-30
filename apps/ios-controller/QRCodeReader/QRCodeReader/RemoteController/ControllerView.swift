import Foundation
import SwiftUI
import UIKit

struct ControllerView: View {
    // MARK: - 列挙型
    
    /// レトロリモコンモード用の方向入力
    enum Direction {
        case up
        case down
        case left
        case right
    }

    /// ユーザーがメニュー（リモート）にいるか、ゲーム中（アクション）かを判定する
    private enum ControllerMode {
        case remote
        case action
    }

    /// 物理的な攻撃時の視覚的フィードバックの種類を定義
    private enum ActionFlash: Equatable {
        case punch
        case chop

        var imageName: String {
            switch self {
            case .punch: return "punch_transparented"
            case .chop:  return "cho_transparented"
            }
        }

        var displayName: String {
            switch self {
            case .punch: return "Punch!"
            case .chop:  return "Chop!"
            }
        }
    }

    // MARK: - ネットワークモデル
    
    /// ゲームの状態をポーリングする際にサーバーから返されるデータ構造
    private struct RoomStatusResponse: Decodable {
        struct CommandEntry: Decodable {
            let sequence: Int
            let command: String
        }

        let roomId: String
        let connected: Bool
        let commandSequence: Int?
        let latestCommand: String?
        let commands: [CommandEntry]?
    }

    // MARK: - プロパティ
    
    let scannedCode: String           // QRコードから取得した接続文字列
    var onDirection: (String) -> Void // ゲームにコマンドを送信するためのコールバック
    var onConfirm: () -> Void         // 「OK」ボタン用のコールバック
    var onClose: () -> Void           // コントローラーを終了するためのコールバック

    // MARK: - 状態管理
    
    @State private var mode: ControllerMode = .remote
    @State private var pollTask: Task<Void, Never>? = nil
    @State private var lastSeenSequence: Int = -1 // 古いコマンドを再処理しないよう履歴を追跡

    @State private var aimX: CGFloat = 0.5
    @State private var aimY: CGFloat = 0.55
    @State private var currentActionFlash: ActionFlash? = nil
    @State private var hideFlashTask: Task<Void, Never>? = nil
    @State private var isConfirmSent: Bool = false
    @State private var isDisconnected: Bool = false
    
    // 加速度計とジャイロスコープのデータを監視
    @StateObject private var motionDetector = ControllerMotionDetector()
    
    // Xcodeシミュレータで実行している時のみ、デバッグ用ボタンを表示
    private let showsSimulatorTestButtons: Bool = {
#if targetEnvironment(simulator)
        true
#else
        false
#endif
    }()

    var body: some View {
        GeometryReader { geo in
            controllerContent
                .frame(width: geo.size.width, height: geo.size.height)
        }
        .ignoresSafeArea()
        .onAppear {
            setOrientation(.landscapeRight) //rotate screen
            // ネットワークポーリングとモーションセンサーを開始
            startPollingRoomStatus()
            motionDetector.start()
        }
        .onDisappear {
            setOrientation(.portrait) //return to original direction
            // メモリリークやバックグラウンドでのバッテリー消費を防ぐためにリソースをクリーンアップ
            pollTask?.cancel()
            pollTask = nil
            hideFlashTask?.cancel()
            hideFlashTask = nil
            motionDetector.stop()
        }
        // motionDetectorによって検知されたモーションイベントに反応
        .onChange(of: motionDetector.punchEventId) { _, _ in
            if mode == .action {
                showActionFlash(.punch)
                sendActionCommand("punch", acceleration: motionDetector.lastActionAcceleration)
            }
        }
        .onChange(of: motionDetector.chopEventId) { _, _ in
            if mode == .action {
                showActionFlash(.chop)
                sendActionCommand("chop", acceleration: motionDetector.lastActionAcceleration)
            }
        }
    }

    // MARK: - ビューコンポーネント
    
    /// レトロ（メニュー）とモダン（ゲームプレイ）のUIを切り替える
    @ViewBuilder
    private var controllerContent: some View {
        ZStack {
            if mode == .remote {
                RemoteControllerView(onDirection: onDirection, onConfirm: onConfirm, onClose: onClose, isDisconnected: isDisconnected)
            } else {
                modernActionView
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    /// アクティブなゲームプレイモード（モーション操作）用のUI
    private var modernActionView: some View {
        ZStack {
            // ネオン・サイバーパンク風のグラデーション背景
            LinearGradient(
                colors: [
                    Color(red: 0.05, green: 0.07, blue: 0.14),
                    Color(red: 0.08, green: 0.02, blue: 0.16),
                    Color(red: 0.02, green: 0.18, blue: 0.22),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 20) {
                // 切断時の警告バナー
                if isDisconnected {
                    HStack(spacing: 8) {
                        Image(systemName: "wifi.slash")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.red)
                        Text("Controller Disconnected")
                            .font(.custom("DotGothic16-Regular", size: 14))
                            .foregroundColor(.red)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .background(Color(red: 0.35, green: 0.05, blue: 0.05).opacity(0.9))
                }

                HStack {
                    Text("Controller")
                        .font(.system(size: 24, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                    Spacer()
                    Button("終了") {
                        onClose()
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.pink)
                    .disabled(true)
                    .opacity(0.55)
                }
                .padding(.horizontal, 40)

                // 操作説明パネル
                VStack(spacing: 16) {
                    Text("ゲームモード")
                        .font(.headline)
                        .foregroundStyle(.white.opacity(0.95))

                    VStack(spacing: 10) {
                        Image(systemName: "iphone.radiowaves.left.and.right")
                            .font(.system(size: 64, weight: .bold))
                            .foregroundStyle(.white)

                        Text("パンチ: 突き出し")
                            .font(.title3.weight(.bold))
                            .foregroundStyle(.red.opacity(0.95))
                        Text("チョップ: 縦振り")
                            .font(.title3.weight(.bold))
                            .foregroundStyle(.cyan.opacity(0.95))
                        Text("タッチ操作は不要です")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(.white.opacity(0.9))
                            .padding(.top, 6)

                        Button(action: {
                            isConfirmSent = true
                            notifyConfirmHaptic()
                            onConfirm()
                        }) {
                            Text("準備OK")
                                .font(.custom("DotGothic16-Regular", size: 18))
                                .fontWeight(.bold)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 14)
                                .background(isConfirmSent ? Color.gray.opacity(0.5) : Color.green.opacity(0.95))
                                .foregroundColor(isConfirmSent ? .white.opacity(0.5) : .white)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                                .grayscale(isConfirmSent ? 1.0 : 0.0)
                        }
                        .disabled(isConfirmSent)
                        .padding(.top, 8)
                    }
                    .frame(maxWidth: .infinity, alignment: .center)
                    .multilineTextAlignment(.center)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 18)
                    .background(Color.white.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 18))
                }
                .padding(.horizontal, 40)

                // モーション操作が利用できないシミュレータでのテスト用デバッグボタン
                if showsSimulatorTestButtons {
                    HStack(spacing: 12) {
                        Button("TEST PUNCH") {
                            showActionFlash(.punch)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.red)

                        Button("TEST CHOP") {
                            showActionFlash(.chop)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.cyan)
                    }
                }
            }
            .padding(20)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)

            // 攻撃時の視覚フィードバック（パンチ/チョップの画像）
            if let flash = currentActionFlash {
                actionFlashOverlay(for: flash)
                    .transition(
                        .asymmetric(
                            insertion: .scale(scale: 0.55).combined(with: .opacity),
                            removal: .scale(scale: 1.08).combined(with: .opacity)
                        )
                    )
            }
        }
        .animation(
            .interactiveSpring(response: 0.14, dampingFraction: 0.58, blendDuration: 0.06),
            value: currentActionFlash
        )
    }

    /// 攻撃アニメーションのオーバーレイを描画（背景変更なし、右半分に画像・左半分に技名テキストを表示）
    @ViewBuilder
    private func actionFlashOverlay(for flash: ActionFlash) -> some View {
        GeometryReader { geo in
            let halfWidth = geo.size.width / 2
            let halfHeight = geo.size.height / 2

            // 左半分：技名テキスト
            Text(flash.displayName)
                .font(.custom("DotGothic16-Regular", size: 72))
                .fontWeight(.bold)
                .foregroundStyle(flash == .punch ? Color.red : Color.cyan)
                .frame(width: halfWidth, height: geo.size.height)
                .position(x: halfWidth / 2, y: geo.size.height / 2)

            // 右半分：透過画像
            Image(flash.imageName)
                .resizable()
                .scaledToFit()
                .frame(width: halfWidth, height: halfHeight)
                .position(x: geo.size.width * 0.75, y: geo.size.height / 2)
        }
        .allowsHitTesting(false)
    }

    // MARK: - ロジック & ヘルパー関数
    
    /// コマンド文字列を作成し、ゲームのインスタンスに送信する
    private func sendActionCommand(_ action: String, acceleration: Double?) {
        let x = String(format: "%.3f", max(0, min(1, aimX)))
        let y = String(format: "%.3f", max(0, min(1, aimY)))
        let sentAtMs = Int(Date().timeIntervalSince1970 * 1000)
        
        // 攻撃の威力を判定するため、利用可能な場合は加速度を追加
        if let acceleration {
            let a = String(format: "%.3f", max(0, acceleration))
            onDirection("\(action)@\(x),\(y),\(a),\(sentAtMs)")
        } else {
            onDirection("\(action)@\(x),\(y),\(sentAtMs)")
        }
        
        // 技を繰り出したユーザーへの触覚フィードバック
        let impact = UIImpactFeedbackGenerator(style: .medium)
        impact.impactOccurred()
    }

    /// 攻撃時の画像を画面上に短時間表示する
    private func showActionFlash(_ flash: ActionFlash) {
        hideFlashTask?.cancel()
        currentActionFlash = flash
        hideFlashTask = Task {
            try? await Task.sleep(nanoseconds: 650_000_000) // 650ms間表示
            guard !Task.isCancelled else { return }
            await MainActor.run {
                currentActionFlash = nil
            }
        }
    }

    /// ルームステータスの更新を確認するバックグラウンドループを開始
    private func startPollingRoomStatus() {
        guard let info = parseRoomInfo(from: scannedCode) else { return }
        pollTask = Task {
            while !Task.isCancelled {
                await fetchRoomStatus(baseURL: info.baseURL, roomId: info.roomId)
                try? await Task.sleep(nanoseconds: 500_000_000) // 500msごとにポーリング
            }
        }
    }

    /// スキャンされたURLから接続情報を抽出する
    private func parseRoomInfo(from val: String) -> (baseURL: String, roomId: String)? {
        guard let comp = URLComponents(string: val),
            let rid = comp.queryItems?.first(where: { $0.name == "roomId" })?.value
        else { return nil }
        let base =
            comp.queryItems?.first(where: { $0.name == "apiBase" })?.value
            ?? "http://localhost:8080"
        return (base.trimmingCharacters(in: CharacterSet(charactersIn: "/")), rid)
    }

    /// サーバーから現在の状態を取得し、ゲーム側のイベントに反応する
    @MainActor
    private func fetchRoomStatus(baseURL: String, roomId: String) async {
        var components = URLComponents(string: "\(baseURL)/api/controller/rooms/\(roomId)/status")
        
        // まだ受信していないコマンドのみを取得するため 'since' パラメータを使用
        if lastSeenSequence >= 0 {
            components?.queryItems = [URLQueryItem(name: "since", value: String(lastSeenSequence))]
        }

        guard let url = components?.url else {
            return
        }
        
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let res = try JSONDecoder().decode(RoomStatusResponse.self, from: data)
            isDisconnected = !res.connected
            let seq = res.commandSequence ?? 0

            // コマンドのリストがあるか、最新のものだけかを確認
            let commandEntries: [RoomStatusResponse.CommandEntry]
            if let incremental = res.commands, !incremental.isEmpty {
                commandEntries = incremental
            } else if seq > lastSeenSequence, let latest = res.latestCommand {
                commandEntries = [.init(sequence: seq, command: latest)]
            } else {
                commandEntries = []
            }

            // ゲームコマンドの処理（状態変化と触覚フィードバック）
            for entry in commandEntries {
                let cmd = entry.command
                if cmd == "start_game" {
                    mode = .action
                    isConfirmSent = false
                } else if ["end_game", "return_remote"].contains(cmd) {
                    mode = .remote
                } else if cmd == "hit" && mode == .action {
                    // ゲーム内でプレイヤーが被弾したときにバイブレーションを作動させる
                    print("[ControllerView] hit received (sequence: \(entry.sequence))")
                    notifyHitHaptic()
                }
            }

            // シーケンス番号を更新
            if seq > lastSeenSequence {
                lastSeenSequence = seq
            }
        } catch {
            isDisconnected = true
        }
    }

    /// ダメージを受けたことをシミュレートするために物理的な振動（ハプティクス）を作動させる
    private func notifyHitHaptic() {
        let impactGenerator = UIImpactFeedbackGenerator(style: .heavy)
        impactGenerator.prepare() // レイテンシを最小化
        impactGenerator.impactOccurred()
    }

    /// 「準備OK」ボタン押下時に少し長めのバイブレーションを発生させる
    private func notifyConfirmHaptic() {
        let impactGenerator = UIImpactFeedbackGenerator(style: .heavy)
        impactGenerator.prepare()
        impactGenerator.impactOccurred()

        Task {
            try? await Task.sleep(nanoseconds: 180_000_000) // 180ms
            impactGenerator.impactOccurred()
        }
    }
}

// MARK: - プレビュー

#Preview(traits: .landscapeRight) {
    ControllerView(
        scannedCode: "happykaratesoup://connect?roomId=room-preview&apiBase=http://localhost:8080",
        onDirection: { _ in },
        onConfirm: {},
        onClose: {}
    )
}
