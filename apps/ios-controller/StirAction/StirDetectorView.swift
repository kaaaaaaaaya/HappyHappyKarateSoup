import SwiftUI

#if os(iOS) && !targetEnvironment(macCatalyst)
    import CoreMotion
    #if canImport(UIKit)
        import UIKit
    #endif

    // スマホを振って回転させる「かき混ぜ」動作を検知するView
    struct StirDetectorView: View {
        @StateObject private var detector = StirDetector()
        var isPhaseActive: Bool = true
        #if targetEnvironment(simulator)
            @State private var showImageTest = false
        #endif

        var body: some View {
            GeometryReader { geo in
                let landscapeLongEdge = max(geo.size.width, geo.size.height)
                let landscapeShortEdge = min(geo.size.width, geo.size.height)
                let isPortrait = geo.size.height > geo.size.width

                ZStack {
                    if detector.isStirring {
                        Color.white
                    } else if isPortrait {
                        Color.black
                    } else {
                        StirBackground()
                    }

                    ZStack {
                        if detector.isStirring {
                            stirIllustrationView(
                                isPortrait: isPortrait,
                                maxSize: min(landscapeShortEdge * 0.96, 430)
                            )
                            .transition(
                                .asymmetric(
                                    insertion: .scale(scale: 0.6).combined(with: .opacity),
                                    removal: .scale(scale: 1.3).combined(with: .opacity)
                                )
                            )
                        } else {
                            VStack(spacing: 10) {
                                Image(systemName: "arrow.triangle.2.circlepath")
                                    .font(.system(size: 56, weight: .bold))
                                Text("スマホを振りながら回して\n具材をかき混ぜてください")
                                    .font(.headline)
                                    .multilineTextAlignment(.center)
                            }
                            .foregroundStyle(.white)
                            .rotationEffect(.degrees(isPortrait ? 90 : 0))
                        }

                        if !detector.isAvailable {
                            Text("モーションセンサーが利用できません")
                                .font(.caption)
                                .foregroundStyle(Color.white.opacity(0.7))
                                .rotationEffect(.degrees(isPortrait ? 90 : 0))
                        }
                    }
                    .frame(width: landscapeLongEdge, height: landscapeShortEdge)
                    .position(x: geo.size.width / 2, y: geo.size.height / 2)

                    #if targetEnvironment(simulator)
                        VStack {
                            Spacer()

                            Button {
                                detector.simulateStirOnce()
                            } label: {
                                Label("テストかき混ぜ", systemImage: "arrow.triangle.2.circlepath")
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
            .animation(.spring(response: 0.2, dampingFraction: 0.62), value: detector.isStirring)
            .onAppear {
                if isPhaseActive {
                    detector.start()
                }
            }
            .onDisappear { detector.stop() }
            .onChange(of: isPhaseActive, initial: true) { _, active in
                if active {
                    detector.start()
                } else {
                    detector.stop()
                }
            }
            #if targetEnvironment(simulator)
                .overlay(alignment: .topTrailing) {
                    VStack(alignment: .trailing, spacing: 8) {
                        Button(showImageTest ? "画像テスト終了" : "whisk画像テスト") {
                            showImageTest.toggle()
                        }
                        .font(.caption.bold())
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(.ultraThinMaterial, in: Capsule())

                        if showImageTest {
                            if let image = loadWhiskImage() {
                                image
                                .resizable()
                                .scaledToFit()
                                .frame(width: 120, height: 120)
                                .padding(10)
                                .background(
                                    .ultraThinMaterial,
                                    in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                            } else {
                                Text("whisk.png が見つかりません")
                                .font(.caption2)
                                .padding(10)
                                .background(
                                    .ultraThinMaterial,
                                    in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                            }
                        }
                    }
                    .padding(12)
                }
            #endif
        }

        @ViewBuilder
        private func stirIllustrationView(isPortrait: Bool, maxSize: CGFloat) -> some View {
            if let loadedImage = loadWhiskImage() {
                loadedImage
                    .resizable()
                    .scaledToFit()
                    .frame(maxWidth: maxSize, maxHeight: maxSize)
                    .scaleEffect(1.85)
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

                        Text("whisk.png が見つかりません")
                            .font(.caption)
                            .foregroundStyle(.white)
                            .multilineTextAlignment(.center)
                            .padding(12)
                    }
                    .frame(maxWidth: maxSize, maxHeight: maxSize)
                    .rotationEffect(.degrees(isPortrait ? 90 : 0))
                #else
                    Image(systemName: "arrow.triangle.2.circlepath.circle.fill")
                        .resizable()
                        .scaledToFit()
                        .frame(maxWidth: maxSize, maxHeight: maxSize)
                        .foregroundStyle(Color.orange)
                        .rotationEffect(.degrees(isPortrait ? 90 : 0))
                #endif
            }
        }

        private func loadWhiskImage() -> Image? {
            #if canImport(UIKit)
                if let uiImage = UIImage(named: "whisk")
                    ?? UIImage(named: "whisk.png")
                {
                    return Image(uiImage: uiImage)
                }

                if let path = Bundle.main.path(forResource: "whisk", ofType: "png"),
                    let uiImage = UIImage(contentsOfFile: path)
                {
                    return Image(uiImage: uiImage)
                }

                if let path = Bundle.main.path(
                    forResource: "whisk", ofType: "png", inDirectory: "StirAction"),
                    let uiImage = UIImage(contentsOfFile: path)
                {
                    return Image(uiImage: uiImage)
                }
            #endif
            return nil
        }

    }

    @MainActor
    final class StirDetector: ObservableObject {
        @Published var isStirring: Bool = false
        @Published var stirCount: Int = 0
        @Published var isAvailable: Bool = true

        // 回転の勢い [rad/s]
        private let rotationThreshold: Double = 3.7
        // 振りの勢い [G]
        private let accelerationThreshold: Double = 0.35
        // 連続判定に必要な時間 [秒]
        private let requiredDuration: Double = 0.55
        // 判定が途切れても許容する最大間隔 [秒]
        private let maxGap: Double = 0.14
        // 演出表示時間 [秒]
        private let displayDuration: Double = 0.6
        // 次回受付までの待機時間 [秒]
        private let cooldown: Double = 0.9

        private let motionManager = CMMotionManager()
        private var isCoolingDown = false
        private var activeDuration: Double = 0
        private var lastCandidateTime: TimeInterval?

        func start() {
            guard !motionManager.isDeviceMotionActive else { return }
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
            resetProgress()
        }

        func simulateStirOnce() {
            triggerStir()
        }

        private func evaluate(motion: CMDeviceMotion) {
            guard !isCoolingDown else { return }

            let now = motion.timestamp
            let rot = motion.rotationRate
            let ua = motion.userAcceleration

            let rotationMagnitude = (rot.x * rot.x + rot.y * rot.y + rot.z * rot.z).squareRoot()
            let accelerationMagnitude = (ua.x * ua.x + ua.y * ua.y + ua.z * ua.z).squareRoot()

            let isCandidate =
                rotationMagnitude >= rotationThreshold
                && accelerationMagnitude >= accelerationThreshold

            if isCandidate {
                if let last = lastCandidateTime {
                    activeDuration += min(now - last, 0.08)
                }
                lastCandidateTime = now

                if activeDuration >= requiredDuration {
                    triggerStir()
                }
                return
            }

            if let last = lastCandidateTime, now - last > maxGap {
                resetProgress()
            }
        }

        private func resetProgress() {
            activeDuration = 0
            lastCandidateTime = nil
        }

        private func triggerStir() {
            guard !isCoolingDown else { return }

            isCoolingDown = true
            stirCount += 1
            isStirring = true
            resetProgress()

            Task {
                try? await Task.sleep(for: .seconds(displayDuration))
                isStirring = false
                try? await Task.sleep(for: .seconds(max(0, cooldown - displayDuration)))
                isCoolingDown = false
            }
        }
    }

    private struct StirBackground: View {
        var body: some View {
            LinearGradient(
                colors: [
                    Color(red: 0.04, green: 0.08, blue: 0.16),
                    Color(red: 0.05, green: 0.15, blue: 0.20),
                    Color(red: 0.14, green: 0.08, blue: 0.16),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }

    #Preview("Stir", traits: .landscapeRight) {
        StirDetectorView()
    }

#else

    struct StirDetectorView: View {
        var body: some View {
            Text("StirDetectorView は iOS のみ対応です")
                .padding()
        }
    }

#endif
