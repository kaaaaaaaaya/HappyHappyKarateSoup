import CoreMotion
import Foundation

@MainActor
final class ControllerMotionDetector: ObservableObject {
    private let manager = CMMotionManager()
    @Published var punchEventId: Int = 0
    @Published var chopEventId: Int = 0
    @Published var lastActionAcceleration: Double = 0
    private var lastActionAt: TimeInterval = 0

    // 誤爆防止のためのクールダウン。腕を引く時の逆方向の揺れを無視する。
    private let cooldownSeconds: TimeInterval = 0.55
    // 振りの強さの閾値（マイナス方向）。数値が小さい(絶対値が大きい)ほど強く振る必要がある
    private let punchThreshold: Double = -2.1
    private let chopThreshold: Double = -2.3
    private let minimumMagnitude: Double = 2.0

    func start() {
        guard manager.isDeviceMotionAvailable else {
            return
        }

        manager.deviceMotionUpdateInterval = 1.0 / 50.0
        manager.startDeviceMotionUpdates(to: .main) { [weak self] motion, _ in
            guard let self, let motion else { return }
            self.handleMotion(motion)
        }
    }

    func stop() {
        manager.stopDeviceMotionUpdates()
    }

    private func handleMotion(_ motion: CMDeviceMotion) {
        let now = motion.timestamp
        if now - lastActionAt <= cooldownSeconds {
            return
        }

        let ua = motion.userAcceleration
        let magnitude = sqrt((ua.x * ua.x) + (ua.y * ua.y) + (ua.z * ua.z))
        if magnitude < minimumMagnitude {
            return
        }

        // Z軸 (画面奥への突き出し) をパンチとする
        if ua.z < punchThreshold && abs(ua.z) > abs(ua.x) + 0.2 && abs(ua.z) > abs(ua.y) + 0.2 {
            lastActionAcceleration = magnitude
            punchEventId += 1
            lastActionAt = now
            return
        }

        // X/Y軸の複合 (スマホの持ち方によるブレを吸収して縦振りをチョップとする)
        let isChopFromY = ua.y < chopThreshold && abs(ua.y) > abs(ua.x) + 0.2 && abs(ua.y) > abs(ua.z) + 0.2
        let isChopFromX = ua.x < chopThreshold && abs(ua.x) > abs(ua.y) + 0.2 && abs(ua.x) > abs(ua.z) + 0.2
        if isChopFromY || isChopFromX {
            lastActionAcceleration = magnitude
            chopEventId += 1
            lastActionAt = now
            return
        }
    }
}
