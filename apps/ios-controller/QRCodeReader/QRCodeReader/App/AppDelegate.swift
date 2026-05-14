// AppDelegate.swift
import UIKit

class AppDelegate: UIResponder, UIApplicationDelegate { 

    // 静的変数で回転の状態を保持
    static var orientationLock: UIInterfaceOrientationMask = .allButUpsideDown //　逆さ以外の向きに対応

    // 静的変数で回転のロックを設定
    static func lockOrientation(_ orientation: UIInterfaceOrientationMask) { //　回転のロック
        orientationLock = orientation //　ロックした状態で回転させる
    }

    // 回転する時に呼び出す
    func application(
        _ application: UIApplication  // 実行中のアプリを”application”として定義
        supportedInterfaceOrientationsFor window: UIWindow? // UIWindow(オプショナル型)を引数に取る
    ) -> UIInterfaceOrientationMask { // UIInterfaceOrientationMask型（ビットマスク（フラグの集合））で返す
        return AppDelegate.orientationLock
    }
}
