import SwiftUI
import CoreMotion
#if canImport(UIKit)
import UIKit
#endif

// スマホを持ってパンチの動きを検知し、punch_illustration.png を表示するView
struct PunchDetectorView: View {
    @StateObject private var detector = PunchDetector()

    var body: some View {
        GeometryReader { geo in
            // 端末の向きに関係なく、常に横向き前提でレイアウト計算する
            let landscapeLongEdge = max(geo.size.width, geo.size.height)
            let landscapeShortEdge = min(geo.size.width, geo.size.height)
            let isPortrait = geo.size.height > geo.size.width

            ZStack {
                if detector.isPunching {
                    Color.white
                } else if isPortrait {
                    Color.black
                } else {
                    PunchBackground()
                }

                // 横向き前提で表示したい要素群
                ZStack {
                    // パンチ時にイラストをアニメーション表示
                    if detector.isPunching {
                        punchIllustrationView(
                            isPortrait: isPortrait,
                            maxSize: min(landscapeShortEdge * 0.72, 320)
                        )
                            .transition(
                                .asymmetric(
                                    insertion: .scale(scale: 0.4).combined(with: .opacity),
                                    removal:   .scale(scale: 1.4).combined(with: .opacity)
                                )
                            )
                    }

                    // センサー未対応の端末向けメッセージ
                    if !detector.isAvailable {
                        Text("モーションセンサーが利用できません")
                            .font(.caption)
                            .foregroundStyle(
                                detector.isPunching
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
                        detector.simulatePunchOnce()
                    } label: {
                        Label("テストパンチ", systemImage: "hand.raised.fill")
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
        .animation(.spring(response: 0.18, dampingFraction: 0.55), value: detector.isPunching)
        .onAppear {
            detector.start()
        }
        .onDisappear { detector.stop() }
    }

    @ViewBuilder
    private func punchIllustrationView(isPortrait: Bool, maxSize: CGFloat) -> some View {
        if let loadedImage = loadPunchImage() {
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

                Text("punch_illustration が見つかりません")
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

    private func loadPunchImage() -> Image? {
#if canImport(UIKit)
        if let uiImage = UIImage(named: "punch_illustration")
            ?? UIImage(named: "punch_illustration.png") {
            return Image(uiImage: uiImage)
        }

        if let path = Bundle.main.path(forResource: "punch_illustration", ofType: "png"),
           let uiImage = UIImage(contentsOfFile: path) {
            return Image(uiImage: uiImage)
        }
#endif
        return nil
    }
}

// MARK: - PunchDetector

@MainActor
final class PunchDetector: ObservableObject {
    @Published var isPunching: Bool = false
    @Published var punchCount: Int  = 0
    @Published var isAvailable: Bool = true

    // 前方へ突く加速（z軸想定）
    private let forwardThreshold: Double = 1.35
    // 突いた直後の減速（z軸反転）
    private let retractThreshold: Double = 1.05
    // z軸の優位性。|z| が max(|x|,|y|) の何倍以上か
    private let axisDominanceRatio: Double = 1.45
    // 回転しすぎる動き（振り動作）を除外する閾値 [rad/s]
    private let maxRotationRate: Double = 5.2
    // 「加速→減速」パターン成立の許容時間 [秒]
    private let punchWindow: Double = 0.22
    // 1回のパンチでイラストを表示する時間 [秒]
    private let displayDuration: Double = 0.55
    // 次のパンチを受け付けるまでのクールダウン [秒]
    private let cooldown: Double        = 0.75

    private let motionManager = CMMotionManager()
    private var isCoolingDown = false
    private var phase: PunchPhase = .idle

    private enum PunchPhase {
        case idle
        case accelerating(direction: Double, startedAt: TimeInterval)
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

    func simulatePunchOnce() {
        triggerPunch()
    }

    private func evaluate(motion: CMDeviceMotion) {
        guard !isCoolingDown else { return }

        let ua  = motion.userAcceleration
        let rot = motion.rotationRate
        let now = motion.timestamp

        let absX = abs(ua.x)
        let absY = abs(ua.y)
        let absZ = abs(ua.z)
        let lateral = max(absX, absY)
        let isAxisDominant = absZ > lateral * axisDominanceRatio

        let rotationMagnitude = (rot.x * rot.x + rot.y * rot.y + rot.z * rot.z).squareRoot()
        let isLowRotation = rotationMagnitude <= maxRotationRate

        guard isAxisDominant, isLowRotation else {
            phase = .idle
            return
        }

        switch phase {
        case .idle:
            if absZ >= forwardThreshold {
                let dir = ua.z >= 0 ? 1.0 : -1.0
                phase = .accelerating(direction: dir, startedAt: now)
            }

        case let .accelerating(direction, startedAt):
            if now - startedAt > punchWindow {
                phase = .idle
                return
            }

            // 初期加速と逆向きの減速が短時間で来たら「突き」と判定
            let reversedComponent = -ua.z * direction
            if reversedComponent >= retractThreshold {
                phase = .idle
                triggerPunch()
            }
        }
    }

    private func resetStateAfterCooldown() {
        isCoolingDown = false
        phase = .idle
    }

    private func triggerPunch() {
        guard !isCoolingDown else { return }

        phase = .idle
        isCoolingDown = true
        punchCount += 1
        isPunching = true

        Task {
            try? await Task.sleep(for: .seconds(displayDuration))
            isPunching = false
            try? await Task.sleep(for: .seconds(max(0, cooldown - displayDuration)))
            resetStateAfterCooldown()
        }
    }

    /*
     調整の目安
     - 誤検知が多い: forwardThreshold / retractThreshold を上げる
     - 反応が鈍い: forwardThreshold / retractThreshold を下げる
     - まだ振りで反応する: axisDominanceRatio を上げる or maxRotationRate を下げる
    */
}

// MARK: - Background

private struct PunchBackground: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.08, green: 0.00, blue: 0.02),
                    Color(red: 0.10, green: 0.00, blue: 0.08),
                    Color(red: 0.00, green: 0.05, blue: 0.12)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            Circle()
                .fill(Color.red.opacity(0.18))
                .blur(radius: 90)
                .frame(width: 280, height: 280)
                .offset(x: -140, y: -60)

            Circle()
                .fill(Color.orange.opacity(0.14))
                .blur(radius: 100)
                .frame(width: 300, height: 300)
                .offset(x: 160, y: 120)
        }
    }
}

// MARK: - Preview


#Preview("Landscape", traits: .landscapeRight) {
    PunchDetectorView()
}
