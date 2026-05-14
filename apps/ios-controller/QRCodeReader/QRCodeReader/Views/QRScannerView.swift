import AVFoundation
import SwiftUI
import UIKit

/// SwiftUIでUIKitのカメラプレビューを表示するためのラッパー構造体
struct QRScannerView: UIViewRepresentable {
    @Binding var isScanning: Bool // スキャンの開始・停止を制御するバインディング
    var onCodeFound: (String) -> Void // QRコードが見つかった時に実行されるコールバック

    /// SwiftUIとUIKitの橋渡し役（Coordinator）を作成
    func makeCoordinator() -> Coordinator {
        Coordinator(onCodeFound: onCodeFound)
    }

    /// UIKitのView（PreviewView）を作成し、初期設定を行う
    func makeUIView(context: Context) -> PreviewView {
        let view = PreviewView()
        context.coordinator.configureSession(in: view) // キャプチャセッションの設定
        return view
    }

    /// SwiftUI側の状態（isScanningなど）が更新された時に呼ばれる
    func updateUIView(_ uiView: PreviewView, context: Context) {
        context.coordinator.onCodeFound = onCodeFound
        context.coordinator.setScanning(isScanning)
    }
}

/// カメラのセッション管理とQRコード解析のデリゲートを担うクラス
final class Coordinator: NSObject, AVCaptureMetadataOutputObjectsDelegate {
    private let session = AVCaptureSession() // カメラキャプチャの核となるセッション
    private let metadataOutput = AVCaptureMetadataOutput() // メタデータ（QRなど）を処理する出力
    private let sessionQueue = DispatchQueue(label: "qr.scanner.session") // カメラ操作用のバックグラウンドキュー

    private var isConfigured = false // セッション設定済みフラグ
    private var isScanning = false   // スキャン実行中フラグ
    private var didFindCode = false  // 重複読み取り防止フラグ

    var onCodeFound: (String) -> Void

    init(onCodeFound: @escaping (String) -> Void) {
        self.onCodeFound = onCodeFound
    }

    /// カメラ入力と解析出力をセッションに構成し、プレビューに接続する
    func configureSession(in view: PreviewView) {
        view.videoPreviewLayer.session = session
        view.videoPreviewLayer.videoGravity = .resizeAspectFill
                
        // プレビューの回転方向を縦向きに固定（90度回転）
        if let previewConnection = view.videoPreviewLayer.connection,
            previewConnection.isVideoRotationAngleSupported(90)
        {
            previewConnection.videoRotationAngle = 90
        }

        // QRリーダー画面のカメラ向きを縦固定
        if let connection = view.videoPreviewLayer.connection {
                if connection.isVideoOrientationSupported {
                    connection.videoOrientation = .portrait
                }
            }

        sessionQueue.async {
            guard !self.isConfigured else { return }
            self.isConfigured = true

            // 背面カメラの取得
            guard let device = AVCaptureDevice.default(for: .video) else { return }
            guard let input = try? AVCaptureDeviceInput(device: device) else { return }

            // セッションに入力を追加
            if self.session.canAddInput(input) {
                self.session.addInput(input)
            }

            // セッションに出力を追加
            if self.session.canAddOutput(self.metadataOutput) {
                self.session.addOutput(self.metadataOutput)
                // 解析のデリゲート設定。メインスレッドで結果を受け取る
                self.metadataOutput.setMetadataObjectsDelegate(self, queue: DispatchQueue.main)
                self.metadataOutput.metadataObjectTypes = [.qr] // 解析対象をQRコードに限定
                
                // 解析時のビデオの向きも縦向きに合わせる
                if let metadataConnection = self.metadataOutput.connection(with: .video),
                    metadataConnection.isVideoRotationAngleSupported(90)
                {
                    metadataConnection.videoRotationAngle = 90
                }
            }

            // 設定完了時にスキャンが必要ならセッションを開始
            if self.isScanning && !self.session.isRunning {
                self.session.startRunning()
            }
        }
    }

    /// スキャンの開始・停止を切り替える
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

    /// カメラがQRコードなどのメタデータを検知した時に呼ばれるデリゲートメソッド
    func metadataOutput(
        _ output: AVCaptureMetadataOutput, didOutput metadataObjects: [AVMetadataObject],
        from connection: AVCaptureConnection
    ) {
        // スキャン中かつ、まだコードを見つけていない場合のみ処理
        guard isScanning, !didFindCode else { return }

        for object in metadataObjects {
            // 読み取ったデータがQRコードであることを確認
            guard let readable = object as? AVMetadataMachineReadableCodeObject,
                readable.type == .qr,
                let value = readable.stringValue
            else { continue }

            didFindCode = true
            onCodeFound(value) // 見つかったコードをコールバックで通知
            setScanning(false) // 二重読み取りを防ぐためスキャンを停止
            break
        }
    }
}

/// カメラのプレビュー層（AVCaptureVideoPreviewLayer）を保持するための専用UIView
final class PreviewView: UIView {
    // このViewのレイヤークラスをAVCaptureVideoPreviewLayerに指定
    override class var layerClass: AnyClass {
        AVCaptureVideoPreviewLayer.self
    }

    // layerプロパティをAVCaptureVideoPreviewLayerとして扱いやすくするための計算プロパティ
    var videoPreviewLayer: AVCaptureVideoPreviewLayer {
        layer as! AVCaptureVideoPreviewLayer
    }
}
