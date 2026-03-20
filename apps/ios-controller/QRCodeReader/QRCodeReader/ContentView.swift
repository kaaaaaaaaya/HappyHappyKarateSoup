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

// MARK: - Models & Enums
private enum CameraAuthorizationState {
    case notDetermined
    case authorized
    case denied
}

// MARK: - Main Content View
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

// MARK: - Controller View (Integrated Design)
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

    // For Action Command
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
                    .rotationEffect(.degrees(isPortrait ? -90 : 0))  // 反時計回り90度をデフォルト表示
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
            if mode == .action { sendActionCommand("punch") }
        }
        .onChange(of: motionDetector.chopEventId) { _, _ in
            if mode == .action { sendActionCommand("chop") }
        }
    }

    @ViewBuilder
    private var controllerContent: some View {
        ZStack {
            if mode == .remote {
                retroRemoteView
            } else {
                modernActionView
            }
        }
    }

    // MARK: - Retro Remote UI (D-Pad Mode)
    private var retroRemoteView: some View {
        ZStack(alignment: .topLeading) {
            Color(hex: "#F5EDD8").ignoresSafeArea()
            DecorativeBackground()

            VStack(spacing: 0) {
                // Top Marquee (Status Bar)
                ZStack {
                    Color(hex: "#8A9BAD").opacity(0.88)
                    MarqueeView(
                        text: debugMessage.isEmpty
                            ? "Ready to Play - Scan QR to Start" : debugMessage)
                }
                .frame(maxWidth: .infinity, minHeight: 46, maxHeight: 46)

                HStack {
                    Spacer()
                    Button("CLOSE") { onClose() }
                        .font(.custom("DotGothic16-Regular", size: 14))
                        .padding(8)
                        .background(Color.pink.opacity(0.8))
                        .foregroundColor(.white)
                        .cornerRadius(4)
                        .padding()
                }

                Spacer()

                HStack(alignment: .center, spacing: 20) {
                    Spacer().frame(width: 16)

                    CardButton(action: { onConfirm() }) {
                        OKLabel(fontSize: 60)
                    }
                    .frame(width: 160, height: 160)

                    Spacer().frame(width: 40)

                    HStack(spacing: 12) {
                        CardButton(action: { onDirection("left") }) {
                            ArrowLabel(symbol: "<", fontSize: 60)
                        }.frame(width: 80, height: 120)

                        VStack(spacing: 12) {
                            CardButton(action: { onDirection("up") }) {
                                ArrowLabel(symbol: "^", fontSize: 50)
                            }.frame(width: 90, height: 70)

                            CardButton(action: { onDirection("down") }) {
                                ArrowLabel(symbol: "v", fontSize: 50)
                            }.frame(width: 90, height: 70)
                        }

                        CardButton(action: { onDirection("right") }) {
                            ArrowLabel(symbol: ">", fontSize: 60)
                        }.frame(width: 80, height: 120)
                    }
                    Spacer()
                }

                Spacer()

                Text("QRコードを読み取り後、コントローラ画面に切り替わりました")
                    .font(.footnote)
                    .foregroundStyle(Color(hex: "#1a1a1a").opacity(0.8))
                    .padding(.bottom, 8)

                Color(hex: "#8A9BAD").opacity(0.88).frame(height: 20)
            }
        }
    }

    // MARK: - Modern Action UI (Auto Aim Mode)
    private var modernActionView: some View {
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
                .padding(.horizontal, 40)

                Spacer()

                Text("オートエイム中。モーションだけで攻撃できます")
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
        guard let info = parseRoomInfo(from: scannedCode) else { return }
        pollTask = Task {
            while !Task.isCancelled {
                await fetchRoomStatus(baseURL: info.baseURL, roomId: info.roomId)
                try? await Task.sleep(nanoseconds: 500_000_000)
            }
        }
    }

    private func parseRoomInfo(from val: String) -> (baseURL: String, roomId: String)? {
        guard let comp = URLComponents(string: val),
            let rid = comp.queryItems?.first(where: { $0.name == "roomId" })?.value
        else { return nil }
        let base =
            comp.queryItems?.first(where: { $0.name == "apiBase" })?.value
            ?? "http://localhost:8080"
        return (base.trimmingCharacters(in: CharacterSet(charactersIn: "/")), rid)
    }

    @MainActor
    private func fetchRoomStatus(baseURL: String, roomId: String) async {
        guard let url = URL(string: "\(baseURL)/api/controller/rooms/\(roomId)/status") else {
            return
        }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let res = try JSONDecoder().decode(RoomStatusResponse.self, from: data)
            let seq = res.commandSequence ?? 0
            if seq > lastSeenSequence {
                lastSeenSequence = seq
                let cmd = res.latestCommand ?? ""
                if cmd == "start_game" {
                    mode = .action
                } else if ["end_game", "return_remote"].contains(cmd) {
                    mode = .remote
                }
            }
        } catch {}
    }
}

// MARK: - Reusable UI Components
private struct ArrowLabel: View {
    let symbol: String
    var fontSize: CGFloat = 64
    var body: some View {
        Text(symbol).font(.custom("DotGothic16-Regular", size: fontSize)).foregroundColor(
            Color(hex: "#1a1a1a"))
    }
}

private struct OKLabel: View {
    var fontSize: CGFloat = 58
    var body: some View {
        Text("OK!").font(.custom("DotGothic16-Regular", size: fontSize)).foregroundColor(
            Color(hex: "#1a1a1a")
        ).kerning(2)
    }
}

private struct CardButton<Content: View>: View {
    let action: () -> Void
    @ViewBuilder let content: () -> Content
    @State private var isPressed = false

    var body: some View {
        Button(action: {
            withAnimation(.spring(response: 0.1, dampingFraction: 0.6)) { isPressed = true }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                withAnimation { isPressed = false }
            }
            action()
        }) {
            ZStack {
                RoundedRectangle(cornerRadius: 10).fill(Color(hex: "#9b9b9b").opacity(0.5)).offset(
                    x: isPressed ? 2 : 6, y: isPressed ? 2 : 6)
                RoundedRectangle(cornerRadius: 10).fill(Color(hex: "#D4896A"))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10).strokeBorder(
                            Color(hex: "#7a7a7a"), lineWidth: 2))
                content()
            }
        }
        .buttonStyle(PlainButtonStyle())
        .scaleEffect(isPressed ? 0.95 : 1.0)
    }
}

private struct MarqueeView: View {
    let text: String
    @State private var offset: CGFloat = 0
    @State private var textWidth: CGFloat = 0

    var body: some View {
        GeometryReader { geo in
            let fullText = ". ... \(text) ... ... "
            HStack(spacing: 0) {
                Text(fullText).font(.custom("DotGothic16-Regular", size: 18)).fixedSize()
                    .background(
                        GeometryReader { tGeo in
                            Color.clear.onAppear { textWidth = tGeo.size.width }
                        })
                Text(fullText).font(.custom("DotGothic16-Regular", size: 18)).fixedSize()
            }
            .foregroundColor(Color(hex: "#1a1a1a"))
            .offset(x: offset)
            .onAppear {
                withAnimation(.linear(duration: 8).repeatForever(autoreverses: false)) {
                    offset = -textWidth
                }
            }
        }.clipped()
    }
}

private struct DecorativeBackground: View {
    var body: some View {
        ZStack {
            Path { p in
                p.move(to: .init(x: 155, y: 80))
                p.addLine(to: .init(x: 255, y: 175))
            }.stroke(Color(hex: "#F5C842"), lineWidth: 3)
            Circle().stroke(Color(hex: "#D4896A"), lineWidth: 2.5).frame(width: 100).position(
                x: 100, y: 400)
            Path { p in
                p.move(to: .init(x: 580, y: 100))
                p.addLine(to: .init(x: 680, y: 200))
                p.addLine(to: .init(x: 480, y: 200))
                p.closeSubpath()
            }.stroke(Color(hex: "#D4896A"), lineWidth: 2)
        }
    }
}

// MARK: - Motion Detector
@MainActor
final class ControllerMotionDetector: ObservableObject {
    private let manager = CMMotionManager()
    @Published var punchEventId: Int = 0
    @Published var chopEventId: Int = 0
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
            punchEventId += 1
            lastActionAt = now
            return
        }

        // X/Y軸の複合 (スマホの持ち方によるブレを吸収して縦振りをチョップとする)
        if ua.y < chopThreshold || ua.x < chopThreshold {
            chopEventId += 1
            lastActionAt = now
            return
        }
    }
}

// MARK: - Extension
extension Color {
    fileprivate init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r = Double((int >> 16) & 0xFF) / 255
        let g = Double((int >> 8) & 0xFF) / 255
        let b = Double(int & 0xFF) / 255
        self.init(.sRGB, red: r, green: g, blue: b, opacity: 1)
    }
}
