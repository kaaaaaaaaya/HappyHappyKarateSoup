//
//  ContentView.swift
//  QRCodeReader
//
//  Created by 北田果耶 on 2026/03/14.
//

import AVFoundation
import CoreMotion
import Foundation
import SwiftUI
import UIKit

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
    @State private var controllerDebugMessage: String = ""

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
        .fullScreenCover(isPresented: $isControllerPresented) {
            ControllerView(
                scannedCode: scannedCode,
                debugMessage: controllerDebugMessage,
                onDirection: { direction in
                    sendControlCommand(direction, from: scannedCode)
                },
                onConfirm: {
                    sendControlCommand("confirm", from: scannedCode)
                },
                onClose: {
                    scannedCode = ""
                    controllerDebugMessage = ""
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

    // [EN] Parses roomId from scanned QR and notifies backend join endpoint.
    // [JA] 読み取った QR から roomId を解析し、バックエンドの join エンドポイントへ通知します。
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
            if let error {
                DispatchQueue.main.async {
                    controllerDebugMessage = "join failed: \(error.localizedDescription)"
                }
                return
            }

            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? -1
            DispatchQueue.main.async {
                controllerDebugMessage = "join status: \(statusCode)"
            }
        }.resume()
    }

    // [EN] Sends controller button command to backend for room control.
    // [JA] コントローラのボタン入力コマンドを部屋制御用バックエンドへ送信します。
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
                DispatchQueue.main.async {
                    controllerDebugMessage =
                        "cmd \(command): failed (\(error.localizedDescription))"
                }
                return
            }

            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? -1
            DispatchQueue.main.async {
                controllerDebugMessage = "cmd \(command): status \(statusCode)"
            }
        }.resume()
    }
}

struct QRScannerView: UIViewRepresentable {
    @Binding var isScanning: Bool
    var onCodeFound: (String) -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(onCodeFound: onCodeFound)
    }

    func makeUIView(context: Context) -> PreviewView {
        let view = PreviewView()
        context.coordinator.configureSession(in: view)
        return view
    }

    func updateUIView(_ uiView: PreviewView, context: Context) {
        context.coordinator.onCodeFound = onCodeFound
        context.coordinator.setScanning(isScanning)
    }
}

final class Coordinator: NSObject, AVCaptureMetadataOutputObjectsDelegate {
    private let session = AVCaptureSession()
    private let metadataOutput = AVCaptureMetadataOutput()
    private let sessionQueue = DispatchQueue(label: "qr.scanner.session")

    private var isConfigured = false
    private var isScanning = false
    private var didFindCode = false

    var onCodeFound: (String) -> Void

    init(onCodeFound: @escaping (String) -> Void) {
        self.onCodeFound = onCodeFound
    }

    func configureSession(in view: PreviewView) {
        view.videoPreviewLayer.session = session
        view.videoPreviewLayer.videoGravity = .resizeAspectFill

        sessionQueue.async {
            guard !self.isConfigured else { return }
            self.isConfigured = true

            guard let device = AVCaptureDevice.default(for: .video) else { return }
            guard let input = try? AVCaptureDeviceInput(device: device) else { return }

            if self.session.canAddInput(input) {
                self.session.addInput(input)
            }

            if self.session.canAddOutput(self.metadataOutput) {
                self.session.addOutput(self.metadataOutput)
                self.metadataOutput.setMetadataObjectsDelegate(self, queue: DispatchQueue.main)
                self.metadataOutput.metadataObjectTypes = [.qr]
            }

            if self.isScanning && !self.session.isRunning {
                self.session.startRunning()
            }
        }
    }

    func setScanning(_ scanning: Bool) {
        sessionQueue.async {
            if !self.isConfigured {
                self.isScanning = scanning
                return
            }

            if scanning {
                self.didFindCode = false
                if !self.session.isRunning {
                    self.session.startRunning()
                }
            } else {
                if self.session.isRunning {
                    self.session.stopRunning()
                }
            }

            self.isScanning = scanning
        }
    }

    func metadataOutput(
        _ output: AVCaptureMetadataOutput, didOutput metadataObjects: [AVMetadataObject],
        from connection: AVCaptureConnection
    ) {
        guard isScanning, !didFindCode else { return }

        for object in metadataObjects {
            guard let readable = object as? AVMetadataMachineReadableCodeObject,
                readable.type == .qr,
                let value = readable.stringValue
            else { continue }

            didFindCode = true
            onCodeFound(value)
            setScanning(false)
            break
        }
    }
}

final class PreviewView: UIView {
    override class var layerClass: AnyClass {
        AVCaptureVideoPreviewLayer.self
    }

    var videoPreviewLayer: AVCaptureVideoPreviewLayer {
        layer as! AVCaptureVideoPreviewLayer
    }
}

#Preview {
    ContentView()
}

private struct ControllerView: View {
    enum Direction {
        case up
        case down
        case left
        case right
    }

    private enum ControllerMode {
        case remote
        case action
    }

    private struct RoomStatusResponse: Decodable {
        let roomId: String
        let connected: Bool
        let commandSequence: Int?
        let latestCommand: String?
    }

    let scannedCode: String
    let debugMessage: String
    var onDirection: (String) -> Void
    var onConfirm: () -> Void
    var onClose: () -> Void

    @State private var mode: ControllerMode = .remote
    @State private var pollTask: Task<Void, Never>? = nil
    @State private var lastSeenSequence: Int = -1
    @State private var aimX: CGFloat = 0.5
    @State private var aimY: CGFloat = 0.55
    @StateObject private var motionDetector = ControllerMotionDetector()

    var body: some View {
        GeometryReader { geo in
            let isPortrait = geo.size.height > geo.size.width

            ZStack {
                controllerContent
                    .frame(
                        width: isPortrait ? geo.size.height : geo.size.width,
                        height: isPortrait ? geo.size.width : geo.size.height
                    )
                    .rotationEffect(.degrees(isPortrait ? -90 : 0)) // 反時計回り90度をデフォルト表示
                    .position(x: geo.size.width / 2, y: geo.size.height / 2)
            }
            .ignoresSafeArea()
        }
        .onAppear {
            startPollingRoomStatus()
            motionDetector.start()
        }
        .onDisappear {
            pollTask?.cancel()
            pollTask = nil
            motionDetector.stop()
        }
        .onChange(of: motionDetector.punchEventId) { _, _ in
            sendActionCommand("punch")
        }
        .onChange(of: motionDetector.chopEventId) { _, _ in
            sendActionCommand("chop")
        }
    }

    private var controllerContent: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.05, green: 0.07, blue: 0.14),
                    Color(red: 0.08, green: 0.02, blue: 0.16),
                    Color(red: 0.02, green: 0.18, blue: 0.22),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 20) {
                HStack {
                    Text("Controller")
                        .font(.system(size: 26, weight: .heavy, design: .rounded))
                        .foregroundStyle(.white)
                    Spacer()
                    Button("終了") {
                        onClose()
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.pink)
                }

                if !scannedCode.isEmpty {
                    Text("接続コード")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.white.opacity(0.8))
                    Text(scannedCode)
                        .font(.caption2.monospaced())
                        .foregroundStyle(.white.opacity(0.9))
                        .lineLimit(2)
                        .truncationMode(.middle)
                }

                if !debugMessage.isEmpty {
                    Text(debugMessage)
                        .font(.caption2.monospaced())
                        .foregroundStyle(.white.opacity(0.92))
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(.black.opacity(0.35))
                        .clipShape(Capsule())
                }

                Spacer()

                if mode == .remote {
                    VStack(spacing: 18) {
                        PadButton(symbol: "chevron.up", tint: .cyan) {
                            onDirection("up")
                        }
                        HStack(spacing: 18) {
                            PadButton(symbol: "chevron.left", tint: .orange) {
                                onDirection("left")
                            }
                            PadButton(title: "決定", tint: .pink, diameter: 110) {
                                onConfirm()
                            }
                            PadButton(symbol: "chevron.right", tint: .orange) {
                                onDirection("right")
                            }
                        }
                        PadButton(symbol: "chevron.down", tint: .cyan) {
                            onDirection("down")
                        }
                    }
                } else {
                    VStack(spacing: 16) {
                        Text("ゲームモード（オートエイム）")
                            .font(.headline)
                            .foregroundStyle(.white.opacity(0.95))

                        VStack(spacing: 10) {
                            Image(systemName: "iphone.radiowaves.left.and.right")
                                .font(.system(size: 64, weight: .bold))
                                .foregroundStyle(.white)
                            Text("パンチ: 突き出し")
                                .font(.title3.weight(.bold))
                                .foregroundStyle(.red.opacity(0.95))
                            Text("チョップ: 縦振り")
                                .font(.title3.weight(.bold))
                                .foregroundStyle(.cyan.opacity(0.95))
                            Text("タッチ操作は不要です")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(.white.opacity(0.9))
                                .padding(.top, 6)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 18)
                        .background(Color.white.opacity(0.12))
                        .clipShape(RoundedRectangle(cornerRadius: 18))
                    }
                }

                Spacer()

                Text(
                    mode == .remote
                        ? "QRコードを読み取り後、コントローラ画面に切り替わりました"
                        : "オートエイム中。モーションだけで攻撃できます"
                )
                .font(.footnote)
                .foregroundStyle(.white.opacity(0.8))
            }
            .padding(20)
        }
    }

    private func sendActionCommand(_ action: String) {
        let x = String(format: "%.3f", max(0, min(1, aimX)))
        let y = String(format: "%.3f", max(0, min(1, aimY)))
        onDirection("\(action)@\(x),\(y)")
        let impact = UIImpactFeedbackGenerator(style: .medium)
        impact.impactOccurred()
    }

    private func startPollingRoomStatus() {
        pollTask?.cancel()

        guard let roomInfo = parseRoomInfo(from: scannedCode) else {
            return
        }

        pollTask = Task {
            while !Task.isCancelled {
                await fetchRoomStatus(baseURL: roomInfo.baseURL, roomId: roomInfo.roomId)
                try? await Task.sleep(nanoseconds: 400_000_000)
            }
        }
    }

    private func parseRoomInfo(from scannedValue: String) -> (baseURL: String, roomId: String)? {
        guard let components = URLComponents(string: scannedValue),
            let roomId = components.queryItems?.first(where: { $0.name == "roomId" })?.value,
            !roomId.isEmpty
        else {
            return nil
        }

        let apiBase = components.queryItems?
            .first(where: { $0.name == "apiBase" })?
            .value?
            .trimmingCharacters(in: .whitespacesAndNewlines)

        let resolvedBaseURL = (apiBase?.isEmpty == false ? apiBase! : "http://localhost:8080")
            .trimmingCharacters(in: CharacterSet(charactersIn: "/"))

        return (resolvedBaseURL, roomId)
    }

    @MainActor
    private func fetchRoomStatus(baseURL: String, roomId: String) async {
        guard
            let encodedRoomId = roomId.addingPercentEncoding(
                withAllowedCharacters: .urlPathAllowed),
            let url = URL(string: "\(baseURL)/api/controller/rooms/\(encodedRoomId)/status")
        else {
            return
        }

        do {
            let (data, response) = try await URLSession.shared.data(from: url)
            guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode)
            else {
                return
            }

            let status = try JSONDecoder().decode(RoomStatusResponse.self, from: data)
            let sequence = status.commandSequence ?? 0
            let latest = status.latestCommand ?? ""

            if sequence > lastSeenSequence {
                lastSeenSequence = sequence
                if latest == "start_game" {
                    mode = .action
                } else if latest == "end_game" || latest == "game_end" || latest == "return_remote"
                {
                    mode = .remote
                }
            }
        } catch {
            // keep silent to avoid noisy UI updates during temporary network hiccups
        }
    }
}

private struct PadButton: View {
    var symbol: String? = nil
    var title: String? = nil
    var tint: Color
    var diameter: CGFloat = 88
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            Circle()
                .fill(
                    LinearGradient(
                        colors: [tint.opacity(0.95), tint.opacity(0.55)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .overlay(
                    Group {
                        if let symbol {
                            Image(systemName: symbol)
                                .font(.system(size: 30, weight: .black))
                        } else if let title {
                            Text(title)
                                .font(.system(size: 26, weight: .heavy, design: .rounded))
                        }
                    }
                    .foregroundStyle(.white)
                )
                .frame(width: diameter, height: diameter)
                .shadow(color: tint.opacity(0.45), radius: 16, x: 0, y: 8)
        }
        .buttonStyle(.plain)
    }
}

@MainActor
final class ControllerMotionDetector: ObservableObject {
    private let manager = CMMotionManager()
    @Published var punchEventId: Int = 0
    @Published var chopEventId: Int = 0
    private var lastActionAt: TimeInterval = 0

    private let cooldownSeconds: TimeInterval = 0.16
    private let accelMagnitudeThreshold: Double = 0.18
    private let rotationMagnitudeThreshold: Double = 1.2

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
        let ua = motion.userAcceleration
        let rr = motion.rotationRate
        let absX = abs(ua.x)
        let absY = abs(ua.y)
        let absZ = abs(ua.z)
        let accelMagnitude = sqrt(absX * absX + absY * absY + absZ * absZ)

        let absRx = abs(rr.x)
        let absRy = abs(rr.y)
        let absRz = abs(rr.z)
        let rotationMagnitude = sqrt(absRx * absRx + absRy * absRy + absRz * absRz)

        // [JA] 加速度または回転のどちらかが十分大きい時だけトリガー。
        if accelMagnitude < accelMagnitudeThreshold && rotationMagnitude < rotationMagnitudeThreshold {
            return
        }

        if now - lastActionAt <= cooldownSeconds {
            return
        }

        lastActionAt = now

        // [JA] 判定は単純化: 縦成分優位なら chop、それ以外は punch。
        let chopScore = absY + absRy * 0.12
        let punchScore = absZ + absRz * 0.12 + absX * 0.04

        if chopScore >= punchScore {
            chopEventId += 1
            return
        }

        punchEventId += 1
    }
}
