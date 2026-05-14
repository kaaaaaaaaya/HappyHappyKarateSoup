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
            case .punch:
                return "PunchIllustration"
            case .chop:
                return "ChopIllustration"
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
            // ネットワークポーリングとモーションセンサーを開始
            startPollingRoomStatus()
            motionDetector.start()
        }
        .onDisappear {
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
                retroRemoteView
            } else {
                modernActionView
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    /// 十字キー形式のレイアウトを使用してメニューを操作するためのUI
    private var retroRemoteView: some View {
        ZStack {
            Color(hex: "#F5EDD8").ignoresSafeArea()
            DecorativeBackground()

            VStack(spacing: 0) {
                // 上部のマーキー（流れる文字）バー
                ZStack {
                    Color(hex: "#8A9BAD").opacity(0.88)
                    MarqueeView(text: "Now Playing Happy Happy Karate Soup!")
                }
                .frame(maxWidth: .infinity, minHeight: 40, maxHeight: 40)

                // 閉じるボタン
                HStack {
                    Spacer()
                    Button("CLOSE") { onClose() }
                        .font(.custom("DotGothic16-Regular", size: 14))
                        .padding(8)
                        .background(Color.pink.opacity(0.8))
                        .foregroundColor(.white)
                        .cornerRadius(4)
                        .padding()
                }

                Spacer()

                // メインコントローラーのボタン
                HStack(alignment: .center, spacing: 100) {
                    // 決定/OKボタン
                    CardButton(action: { onConfirm() }) {
                        OKLabel(fontSize: 70)
                    }
                    .frame(width: 160, height: 160)

                    // 方向キー（D-Pad）
                    HStack(spacing: 20) {
                        CardButton(action: { onDirection("left") }) {
                            ArrowLabel(symbol: "<", fontSize: 60)
                        }.frame(width: 80, height: 130)

                        VStack(spacing: 20) {
                            CardButton(action: { onDirection("up") }) {
                                ArrowLabel(symbol: "^", fontSize:50)
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                            }.frame(width: 110, height: 80)

                            CardButton(action: { onDirection("down") }) {
                                ArrowLabel(symbol: "v", fontSize: 50)
                            }.frame(width: 110, height: 80)
                        }

                        CardButton(action: { onDirection("right") }) {
                            ArrowLabel(symbol: ">", fontSize: 60)
                        }.frame(width: 80, height: 130)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .center)

                Spacer()

                // 下部の装飾バー
                Color(hex: "#8A9BAD").opacity(0.88).frame(height: 20)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        }
        .ignoresSafeArea()
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
                HStack {
                    Text("Controller")
                        .font(.system(size: 26, weight: .heavy, design: .rounded))
                        .foregroundStyle(.white)
                    Spacer()
                    Button("終了") {
                        onClose()
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.pink)
                }

                Spacer()

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
                    }
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

                Spacer()

                Text("オートエイム中。モーションだけで攻撃できます")
                    .font(.footnote)
                    .foregroundStyle(.white.opacity(0.8))
            }
            .padding(20)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)

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

    /// 攻撃アニメーションのオーバーレイを描画
    @ViewBuilder
    private func actionFlashOverlay(for flash: ActionFlash) -> some View {
        VStack {
            Spacer()
            Image(flash.imageName)
                .resizable()
                .scaledToFit()
                .frame(maxWidth: 520, maxHeight: 320)
                .padding(.horizontal, 24)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(
            Color.white.ignoresSafeArea()
        )
        .allowsHitTesting(false) // オーバーレイがタッチをブロックしないように設定
    }

    // MARK: - ロジック & ヘルパー関数
    
    /// コマンド文字列を作成し、ゲームのインスタンスに送信する
    private func sendActionCommand(_ action: String, acceleration: Double?) {
        let x = String(format: "%.3f", max(0, min(1, aimX)))
        let y = String(format: "%.3f", max(0, min(1, aimY)))
        
        // 攻撃の威力を判定するため、利用可能な場合は加速度を追加
        if let acceleration {
            let a = String(format: "%.3f", max(0, acceleration))
            onDirection("\(action)@\(x),\(y),\(a)")
        } else {
            onDirection("\(action)@\(x),\(y)")
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
        } catch {}
    }

    /// ダメージを受けたことをシミュレートするために物理的な振動（ハプティクス）を作動させる
    private func notifyHitHaptic() {
        let impactGenerator = UIImpactFeedbackGenerator(style: .heavy)
        impactGenerator.prepare() // レイテンシを最小化
        impactGenerator.impactOccurred()
    }
}

// MARK: - サブビュー

/// レトロスタイルのドット絵風矢印ラベル
private struct ArrowLabel: View {
    let symbol: String
    var fontSize: CGFloat = 64
    var body: some View {
        Text(symbol).font(.custom("DotGothic16-Regular", size: fontSize)).foregroundColor(
            Color(hex: "#1a1a1a")).baselineOffset(10)
    }
}

/// レトロスタイルのドット絵風OKラベル
private struct OKLabel: View {
    var fontSize: CGFloat = 80
    var body: some View {
        Text("OK!").font(.custom("DotGothic16-Regular", size: fontSize)).foregroundColor(
            Color(hex: "#1a1a1a")
        ).kerning(2)
    }
}

/// 「3D」の押し込み効果（影の移動とスケール変更）を持つカスタムボタン
private struct CardButton<Content: View>: View {
    let action: () -> Void
    @ViewBuilder let content: () -> Content
    @State private var isPressed = false

    var body: some View {
        Button(action: {
            withAnimation(.spring(response: 0.1, dampingFraction: 0.6)) { isPressed = true }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                withAnimation { isPressed = false }
            }
            action()
        }) {
            ZStack {
                // 背景の影
                RoundedRectangle(cornerRadius: 10).fill(Color(hex: "#9b9b9b").opacity(0.5)).offset(
                    x: isPressed ? 2 : 6, y: isPressed ? 2 : 6)
                // ボタンのメイン表面
                RoundedRectangle(cornerRadius: 10).fill(Color(hex: "#D4896A"))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10).strokeBorder(
                            Color(hex: "#7a7a7a"), lineWidth: 2))
                content()
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .buttonStyle(PlainButtonStyle())
        .scaleEffect(isPressed ? 0.95 : 1.0)
    }
}

/// リモートモードの上部ステータスバーで使用されるスクロールテキストビュー（マーキー）
private struct MarqueeView: View {
    let text: String
    @State private var offset: CGFloat = 0
    @State private var textWidth: CGFloat = 0

    var body: some View {
        GeometryReader { _ in
            let fullText = ". ... \(text) ... ... "
            HStack(spacing: 0) {
                Text(fullText).font(.custom("DotGothic16-Regular", size: 18)).fixedSize()
                    .background(
                        GeometryReader { tGeo in
                            Color.clear.onAppear { textWidth = tGeo.size.width }
                        })
                // シームレスなループのための2つ目のテキスト
                Text(fullText).font(.custom("DotGothic16-Regular", size: 18)).fixedSize()
            }
            .foregroundColor(Color(hex: "#1a1a1a"))
            .offset(x: offset)
            .onAppear {
                withAnimation(.linear(duration: 8).repeatForever(autoreverses: false)) {
                    offset = -textWidth
                }
            }
        }.clipped()
    }
}

/// レトロな背景を埋めるための装飾要素（線、円、三角形）
private struct DecorativeBackground: View {
    var body: some View {
        ZStack {
            Path { p in
                p.move(to: .init(x: 155, y: 80))
                p.addLine(to: .init(x: 255, y: 175))
            }.stroke(Color(hex: "#F5C842"), lineWidth: 3)
            Circle().stroke(Color(hex: "#D4896A"), lineWidth: 2.5).frame(width: 100).position(
                x: 100, y: 400)
            Path { p in
                p.move(to: .init(x: 580, y: 100))
                p.addLine(to: .init(x: 680, y: 200))
                p.addLine(to: .init(x: 480, y: 200))
                p.closeSubpath()
            }.stroke(Color(hex: "#D4896A"), lineWidth: 2)
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