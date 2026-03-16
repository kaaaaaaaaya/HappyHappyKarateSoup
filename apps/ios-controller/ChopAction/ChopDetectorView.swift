#if os(iOS)

    import CoreMotion
    import SwiftUI

    #if canImport(UIKit)
        import UIKit
    #endif

    // スマホを持って手刀（上から振り下ろし）を検知し、chop 画像を表示するView
    struct ChopDetectorView: View {
        @StateObject private var detector = ChopDetector()

        var body: some View {
            GeometryReader { geo in
                // 端末の向きに関係なく、常に横向き前提でレイアウト計算する
                let landscapeLongEdge = max(geo.size.width, geo.size.height)
                let landscapeShortEdge = min(geo.size.width, geo.size.height)
                let isPortrait = geo.size.height > geo.size.width

                ZStack {
                    if detector.isChopping {
                        Color.white
                    } else if isPortrait {
                        Color.black
                    } else {
                        ChopBackground()
                    }

                    // 横向き前提で表示したい要素群
                    ZStack {
                        // チョップ時にイラストをアニメーション表示
                        if detector.isChopping {
                            chopIllustrationView(
                                isPortrait: isPortrait,
                                maxSize: min(landscapeShortEdge * 0.72, 320)
                            )
                            .transition(
                                .asymmetric(
                                    insertion: .scale(scale: 0.4).combined(with: .opacity),
                                    removal: .scale(scale: 1.4).combined(with: .opacity)
                                )
                            )
                        }

                        // センサー未対応の端末向けメッセージ
                        if !detector.isAvailable {
                            Text("モーションセンサーが利用できません")
                                .font(.caption)
                                .foregroundStyle(
                                    detector.isChopping
                                        ? Color.black.opacity(0.65)
                                        : Color.white.opacity(0.6)
                                )
                                .rotationEffect(.degrees(isPortrait ? 90 : 0))
                        }
                    }
                    .frame(width: landscapeLongEdge, height: landscapeShortEdge)
                    .position(x: geo.size.width / 2, y: geo.size.height / 2)

                    #if targetEnvironment(simulator)
                        VStack {
                            Spacer()

                            Button {
                                detector.simulateChopOnce()
                            } label: {
                                Label("テストチョップ", systemImage: "hand.raised.fill")
                                    .font(.system(.headline, design: .rounded))
                                    .padding(.horizontal, 16)
                                    .padding(.vertical, 10)
                                    .background(.ultraThinMaterial, in: Capsule())
                            }
                            .tint(.white)
                            .foregroundStyle(.white)
                            .padding(.bottom, 24)
                        }
                        .rotationEffect(.degrees(isPortrait ? 90 : 0))
                    #endif
                }
                .ignoresSafeArea()
            }
            .animation(.spring(response: 0.18, dampingFraction: 0.55), value: detector.isChopping)
            .onAppear {
                detector.start()
            }
            .onDisappear { detector.stop() }
        }

        @ViewBuilder
        private func chopIllustrationView(isPortrait: Bool, maxSize: CGFloat) -> some View {
            if let loadedImage = loadChopImage() {
                loadedImage
                    .resizable()
                    .scaledToFit()
                    .frame(maxWidth: maxSize, maxHeight: maxSize)
                    .rotationEffect(.degrees(isPortrait ? 90 : 0))
            } else {
                #if targetEnvironment(simulator)
                    ZStack {
                        RoundedRectangle(cornerRadius: 24, style: .continuous)
                            .fill(.black.opacity(0.35))
                            .overlay(
                                RoundedRectangle(cornerRadius: 24, style: .continuous)
                                    .stroke(.white.opacity(0.35), lineWidth: 1)
                            )

                        Text("chop 画像が見つかりません")
                            .font(.caption)
                            .foregroundStyle(.white)
                            .multilineTextAlignment(.center)
                            .padding(12)
                    }
                    .frame(maxWidth: maxSize, maxHeight: maxSize)
                    .rotationEffect(.degrees(isPortrait ? 90 : 0))
                #else
                    EmptyView()
                #endif
            }
        }

        private func loadChopImage() -> Image? {
            #if canImport(UIKit)
                if let uiImage = UIImage(named: "chop")
                    ?? UIImage(named: "chop.png")
                {
                    return Image(uiImage: uiImage)
                }

                if let path = Bundle.main.path(forResource: "chop", ofType: "png"),
                    let uiImage = UIImage(contentsOfFile: path)
                {
                    return Image(uiImage: uiImage)
                }
            #endif
            return nil
        }
    }

    // MARK: - ChopDetector

    @MainActor
    final class ChopDetector: ObservableObject {
        @Published var isChopping: Bool = false
        @Published var chopCount: Int = 0
        @Published var isAvailable: Bool = true

        // 振り下ろし加速（y軸想定）
        private let downwardThreshold: Double = 1.35
        // 振り下ろし直後の減速（y軸反転）
        private let reboundThreshold: Double = 1.0
        // y軸の優位性。|y| が max(|x|,|z|) の何倍以上か
        private let axisDominanceRatio: Double = 1.4
        // 回転しすぎる動き（ひねり動作）を除外する閾値 [rad/s]
        private let maxRotationRate: Double = 6.0
        // 「振り下ろし→反転」パターン成立の許容時間 [秒]
        private let chopWindow: Double = 0.26
        // 1回のチョップでイラストを表示する時間 [秒]
        private let displayDuration: Double = 0.55
        // 次のチョップを受け付けるまでのクールダウン [秒]
        private let cooldown: Double = 0.75

        private let motionManager = CMMotionManager()
        private var isCoolingDown = false
        private var phase: ChopPhase = .idle

        private enum ChopPhase {
            case idle
            case swingingDown(direction: Double, startedAt: TimeInterval)
        }

        func start() {
            guard motionManager.isDeviceMotionAvailable else {
                isAvailable = false
                return
            }
            motionManager.deviceMotionUpdateInterval = 1.0 / 60.0
            motionManager.startDeviceMotionUpdates(to: .main) { [weak self] motion, _ in
                guard let self, let motion else { return }
                self.evaluate(motion: motion)
            }
        }

        func stop() {
            motionManager.stopDeviceMotionUpdates()
            phase = .idle
        }

        func simulateChopOnce() {
            triggerChop()
        }

        private func evaluate(motion: CMDeviceMotion) {
            guard !isCoolingDown else { return }

            let ua = motion.userAcceleration
            let rot = motion.rotationRate
            let now = motion.timestamp

            let absX = abs(ua.x)
            let absY = abs(ua.y)
            let absZ = abs(ua.z)
            let lateral = max(absX, absZ)
            let isAxisDominant = absY > lateral * axisDominanceRatio

            let rotationMagnitude = (rot.x * rot.x + rot.y * rot.y + rot.z * rot.z).squareRoot()
            let isLowRotation = rotationMagnitude <= maxRotationRate

            guard isAxisDominant, isLowRotation else {
                phase = .idle
                return
            }

            switch phase {
            case .idle:
                if absY >= downwardThreshold {
                    let dir = ua.y >= 0 ? 1.0 : -1.0
                    phase = .swingingDown(direction: dir, startedAt: now)
                }

            case let .swingingDown(direction, startedAt):
                if now - startedAt > chopWindow {
                    phase = .idle
                    return
                }

                // 初期加速と逆向きの減速が短時間で来たら「チョップ」と判定
                let reversedComponent = -ua.y * direction
                if reversedComponent >= reboundThreshold {
                    phase = .idle
                    triggerChop()
                }
            }
        }

        private func resetStateAfterCooldown() {
            isCoolingDown = false
            phase = .idle
        }

        private func triggerChop() {
            guard !isCoolingDown else { return }

            phase = .idle
            isCoolingDown = true
            chopCount += 1
            isChopping = true

            Task {
                try? await Task.sleep(for: .seconds(displayDuration))
                isChopping = false
                try? await Task.sleep(for: .seconds(max(0, cooldown - displayDuration)))
                resetStateAfterCooldown()
            }
        }
    }

    // MARK: - Background

    private struct ChopBackground: View {
        var body: some View {
            ZStack {
                LinearGradient(
                    colors: [
                        Color(red: 0.03, green: 0.01, blue: 0.08),
                        Color(red: 0.06, green: 0.02, blue: 0.12),
                        Color(red: 0.01, green: 0.08, blue: 0.10),
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                Circle()
                    .fill(Color.purple.opacity(0.18))
                    .blur(radius: 90)
                    .frame(width: 280, height: 280)
                    .offset(x: -140, y: -60)

                Circle()
                    .fill(Color.cyan.opacity(0.14))
                    .blur(radius: 100)
                    .frame(width: 300, height: 300)
                    .offset(x: 160, y: 120)
            }
        }
    }

    // MARK: - Preview

    #Preview("Landscape", traits: .landscapeRight) {
        ChopDetectorView()
    }

#else

    import SwiftUI

    struct ChopDetectorView: View {
        var body: some View {
            Text("ChopDetectorView is iOS only")
        }
    }

#endif
