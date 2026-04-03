//
//  ContentView.swift
//  QRCodeReader
//
//  Created by 北田果耶 on 2026/03/14.
//

import AVFoundation
import Foundation
import SwiftUI

private enum CameraAuthorizationState {
    case notDetermined
    case authorized
    case denied
}

struct ContentView: View {
    @State private var cameraAuthorization: CameraAuthorizationState = .notDetermined
    @State private var isScanning = false
    @State private var scannedCode: String = ""
    @State private var isControllerPresented = false

    var body: some View {
        VStack(spacing: 16) {
            Text("QRコードリーダー")
                .font(.title2.bold())

            content
                .frame(maxWidth: .infinity, minHeight: 320)
                .background(Color.black.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 16))

            resultSection
        }
        .padding()
        .onAppear(perform: requestCameraAccessIfNeeded)
        .onAppear {
            if !isControllerPresented {
                AppDelegate.lockOrientation(.portrait)
            }
        }
        .onDisappear {
            AppDelegate.lockOrientation(.allButUpsideDown)
        }
        .onChange(of: isControllerPresented) { _, presented in
            if presented {
                AppDelegate.lockOrientation(.allButUpsideDown)
            } else {
                AppDelegate.lockOrientation(.portrait)
            }
        }
        .fullScreenCover(isPresented: $isControllerPresented) {
            ControllerView(
                scannedCode: scannedCode,
                onDirection: { direction in
                    sendControlCommand(direction, from: scannedCode)
                },
                onConfirm: {
                    sendControlCommand("confirm", from: scannedCode)
                },
                onClose: {
                    scannedCode = ""
                    isScanning = true
                    isControllerPresented = false
                }
            )
        }
    }

    @ViewBuilder
    private var content: some View {
        switch cameraAuthorization {
        case .authorized:
            ZStack {
                QRScannerView(isScanning: $isScanning) { code in
                    scannedCode = code
                    isScanning = false
                    notifyRoomJoinedIfPossible(from: code)
                    isControllerPresented = true
                }
                .clipShape(RoundedRectangle(cornerRadius: 16))

                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.white, lineWidth: 3)
                    .frame(width: 220, height: 220)

                VStack {
                    Spacer()
                    Text("QRコードを枠に合わせてください")
                        .font(.footnote.weight(.semibold))
                        .padding(.vertical, 6)
                        .padding(.horizontal, 12)
                        .background(.black.opacity(0.6))
                        .foregroundStyle(.white)
                        .clipShape(Capsule())
                        .padding(.bottom, 16)
                }
            }
            .onAppear {
                if scannedCode.isEmpty {
                    isScanning = true
                }
            }

        case .denied:
            VStack(spacing: 12) {
                Image(systemName: "camera.fill")
                    .font(.system(size: 28))
                Text("カメラの使用が許可されていません。")
                    .multilineTextAlignment(.center)
                Text("設定 > プライバシー > カメラ から許可してください。")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding()

        case .notDetermined:
            VStack(spacing: 12) {
                ProgressView()
                Text("カメラの許可を確認中...")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
    }

    @ViewBuilder
    private var resultSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("読み取り結果")
                .font(.headline)

            if scannedCode.isEmpty {
                Text("まだ読み取っていません。")
                    .foregroundStyle(.secondary)
            } else {
                Text(scannedCode)
                    .textSelection(.enabled)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }

            Button(isScanning ? "スキャン中..." : "もう一度スキャン") {
                scannedCode = ""
                isScanning = true
            }
            .buttonStyle(.borderedProminent)
            .disabled(cameraAuthorization != .authorized)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func requestCameraAccessIfNeeded() {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            cameraAuthorization = .authorized
            if scannedCode.isEmpty {
                isScanning = true
            }
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video) { granted in
                DispatchQueue.main.async {
                    cameraAuthorization = granted ? .authorized : .denied
                    if granted {
                        isScanning = true
                    }
                }
            }
        default:
            cameraAuthorization = .denied
        }
    }

    private func notifyRoomJoinedIfPossible(from scannedValue: String) {
        guard let components = URLComponents(string: scannedValue),
            let roomId = components.queryItems?.first(where: { $0.name == "roomId" })?.value,
            !roomId.isEmpty
        else {
            return
        }

        let apiBase = components.queryItems?
            .first(where: { $0.name == "apiBase" })?
            .value?
            .trimmingCharacters(in: .whitespacesAndNewlines)

        let resolvedBaseUrl = (apiBase?.isEmpty == false ? apiBase! : "http://localhost:8080")
            .trimmingCharacters(in: CharacterSet(charactersIn: "/"))

        guard
            let encodedRoomId = roomId.addingPercentEncoding(
                withAllowedCharacters: .urlPathAllowed),
            let url = URL(string: "\(resolvedBaseUrl)/api/controller/rooms/\(encodedRoomId)/join")
        else {
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        URLSession.shared.dataTask(with: request) { _, response, error in
            if error != nil {
                return
            }

            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? -1
            if statusCode != 200 {
                print("join status: \(statusCode) (URL: \(url.absoluteString))")
            }
        }.resume()
    }

    private func sendControlCommand(_ command: String, from scannedValue: String) {
        guard let components = URLComponents(string: scannedValue),
            let roomId = components.queryItems?.first(where: { $0.name == "roomId" })?.value,
            !roomId.isEmpty
        else {
            return
        }

        let apiBase = components.queryItems?
            .first(where: { $0.name == "apiBase" })?
            .value?
            .trimmingCharacters(in: .whitespacesAndNewlines)

        let resolvedBaseUrl = (apiBase?.isEmpty == false ? apiBase! : "http://localhost:8080")
            .trimmingCharacters(in: CharacterSet(charactersIn: "/"))

        guard
            let encodedRoomId = roomId.addingPercentEncoding(
                withAllowedCharacters: .urlPathAllowed),
            let encodedCommand = command.addingPercentEncoding(
                withAllowedCharacters: .urlPathAllowed),
            let url = URL(
                string:
                    "\(resolvedBaseUrl)/api/controller/rooms/\(encodedRoomId)/commands/\(encodedCommand)"
            )
        else {
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        URLSession.shared.dataTask(with: request) { _, response, error in
            if let error {
                print("cmd \(command): failed (\(error.localizedDescription))")
                return
            }

            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? -1
            print("cmd \(command): status \(statusCode)")
        }.resume()
    }
}

#Preview {
    ContentView()
}
