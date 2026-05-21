// AppDelegate.swift
import UIKit

class AppDelegate: UIResponder, UIApplicationDelegate {

    static var orientationLock: UIInterfaceOrientationMask = .allButUpsideDown

    static func lockOrientation(_ orientation: UIInterfaceOrientationMask) {
        orientationLock = orientation
    }

    func application(
        _ application: UIApplication,
        supportedInterfaceOrientationsFor window: UIWindow?
    ) -> UIInterfaceOrientationMask {
        return AppDelegate.orientationLock
    }
}
