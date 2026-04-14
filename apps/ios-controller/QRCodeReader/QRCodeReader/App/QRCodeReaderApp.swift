//
//  QRCodeReaderApp.swift
//  QRCodeReader
//
//  Created by 北田果耶 on 2026/03/14.
//

import SwiftUI

@main
struct QRCodeReaderApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    init() {
            setOrientation(.portrait)
        }
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
