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
    private let cooldownSeconds: TimeInterval = 0.4
    // 振りの強さの閾値（マイナス方向）。数値が小さい(絶対値が大きい)ほど強く振る必要がある
    private let punchThreshold: Double = -1.5
    private let chopThreshold: Double = -1.8

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

        // Z軸 (画面奥への突き出し) をパンチとする
        if ua.z < punchThreshold {
            lastActionAcceleration = sqrt((ua.x * ua.x) + (ua.y * ua.y) + (ua.z * ua.z))
            punchEventId += 1
            lastActionAt = now
            return
        }

        // X/Y軸の複合 (スマホの持ち方によるブレを吸収して縦振りをチョップとする)
        if ua.y < chopThreshold || ua.x < chopThreshold {
            lastActionAcceleration = sqrt((ua.x * ua.x) + (ua.y * ua.y) + (ua.z * ua.z))
            chopEventId += 1
            lastActionAt = now
            return
        }
    }
}
