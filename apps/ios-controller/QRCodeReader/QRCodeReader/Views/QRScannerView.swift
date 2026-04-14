import AVFoundation
import SwiftUI
import UIKit

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
        
        // QRリーダー画面のカメラ向きを縦固定
        if let connection = view.videoPreviewLayer.connection {
                if connection.isVideoOrientationSupported {
                    connection.videoOrientation = .portrait
                }
            }

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
    
    override func layoutSubviews() {
            super.layoutSubviews()
            videoPreviewLayer.frame = self.bounds
            
            if let connection = videoPreviewLayer.connection {
                if connection.isVideoOrientationSupported {
                    // 90度回転しているなら、ここで .portrait を叩き込む
                    connection.videoOrientation = .portrait
                }
            }
        }
        
}
