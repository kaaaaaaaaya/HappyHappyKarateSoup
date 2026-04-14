//  ControllerMotionDetector.swift
//  リモコンの動きを検出するクラス。パンチとチョップを区別してイベントを発行する。

import CoreMotion
import Foundation

@MainActor
final class ControllerMotionDetector: ObservableObject { // ObservableObject型は、SwiftUIのViewから監視されるクラスであることを示す。パンチとチョップのイベントIDを発行するために使用される。
    private let manager = CMMotionManager() // CoreMotionのマネージャー。デバイスの動きを検出するために使用される。

    // パンチとチョップのイベントID。これらは、Viewが動きを検出したときに更新され、Viewがそれをトリガーとしてアクションを実行できるようにする。
    @Published var punchEventId: Int = 0
    @Published var chopEventId: Int = 0
    // 最新の動きの加速度。これもViewが動きを検出したときに更新され、動きの強さを表示するために使用される。
    @Published var lastActionAcceleration: Double = 0
    private var lastActionAt: TimeInterval = 0 // 最後の動きが検出された時間。クールダウンのために使用

    // 誤爆防止のためのクールダウン。腕を引く時の逆方向の揺れを無視する。
    private let cooldownSeconds: TimeInterval = 0.4
    // 振りの強さの閾値（マイナス方向）。数値が小さい(絶対値が大きい)ほど強く振る必要がある
    private let punchThreshold: Double = -1.5
    private let chopThreshold: Double = -1.8

    func start() {
        guard manager.isDeviceMotionAvailable else {
            return // デバイスモーションが利用できない場合は何もしない
        }

        manager.deviceMotionUpdateInterval = 1.0 / 50.0 // 50Hzで更新
        manager.startDeviceMotionUpdates(to: .main) { [weak self] motion, _ in
            // デバイスモーションの更新があるたびにhandleMotionを呼び出す
            guard let self, let motion else { return }  // guard文でselfとmotionがnilでないことを確認する
            self.handleMotion(motion)
        }
    }

    func stop() {
        manager.stopDeviceMotionUpdates()
    }

    private func handleMotion(_ motion: CMDeviceMotion) {
        let now = motion.timestamp
        if now - lastActionAt <= cooldownSeconds { 
            return // クールダウン中は動きを無視する
        }

        let ua = motion.userAcceleration

        // Z軸 (画面奥への突き出し) をパンチとする
        if ua.z < punchThreshold {
            // 加速度の大きさを計算してlastActionAccelerationに保存する。
            // 加速度はx、y、zの3軸のベクトルなので、sqrt(x^2 + y^2 + z^2)で計算する。
            lastActionAcceleration = sqrt((ua.x * ua.x) + (ua.y * ua.y) + (ua.z * ua.z))
            punchEventId += 1 //punch回数を記録
            lastActionAt = now // 最新の判定があった時間を更新
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
