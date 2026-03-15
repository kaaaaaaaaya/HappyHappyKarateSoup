//
//  ContentView.swift
//  QRCodeReader
//
//  Created by 北田果耶 on 2026/03/14.
//

import SwiftUI
import AVFoundation
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
    }

    @ViewBuilder
    private var content: some View {
        switch cameraAuthorization {
        case .authorized:
            ZStack {
                QRScannerView(isScanning: $isScanning) { code in
                    scannedCode = code
                    isScanning = false
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

    func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput metadataObjects: [AVMetadataObject], from connection: AVCaptureConnection) {
        guard isScanning, !didFindCode else { return }

        for object in metadataObjects {
            guard let readable = object as? AVMetadataMachineReadableCodeObject,
                  readable.type == .qr,
                  let value = readable.stringValue else { continue }

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
