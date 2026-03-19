import Foundation

// [EN] Lightweight WebSocket client for controller event forwarding.
// [JA] コントローラーイベント転送用の軽量 WebSocket クライアントです。
@MainActor
final class ControllerWebSocketClient: ObservableObject {
    static let shared = ControllerWebSocketClient()

    @Published private(set) var isConnected: Bool = false
    @Published private(set) var lastErrorMessage: String?
    @Published private(set) var lastReceivedMessage: String?

    private let session: URLSession
    private var task: URLSessionWebSocketTask?

    private init(session: URLSession = .shared) {
        self.session = session
    }

    // [EN] Connects to WebSocket endpoint. Also accepts http/https and converts to ws/wss.
    // [JA] WebSocket エンドポイントへ接続します。http/https も ws/wss に変換して受け付けます。
    func connect(rawURLString: String) {
        guard let resolvedURL = Self.resolveWebSocketURL(from: rawURLString) else {
            lastErrorMessage = "Invalid WebSocket URL"
            return
        }

        disconnect()

        let newTask = session.webSocketTask(with: resolvedURL)
        task = newTask
        newTask.resume()
        isConnected = true
        lastErrorMessage = nil

        receiveLoop(task: newTask)
    }

    // [EN] Disconnects active WebSocket session.
    // [JA] アクティブな WebSocket セッションを切断します。
    func disconnect() {
        task?.cancel(with: .normalClosure, reason: nil)
        task = nil
        isConnected = false
    }

    // [EN] Sends already-encoded JSON text.
    // [JA] エンコード済み JSON 文字列を送信します。
    func send(jsonText: String) {
        guard let task else {
            lastErrorMessage = "WebSocket is not connected"
            return
        }

        task.send(.string(jsonText)) { [weak self] error in
            guard let self else { return }
            if let error {
                Task { @MainActor in
                    self.lastErrorMessage = error.localizedDescription
                    self.isConnected = false
                }
            }
        }
    }

    // [EN] Keeps receiving messages to detect closure and keep connection healthy.
    // [JA] 接続状態の維持と切断検知のために受信ループを継続します。
    private func receiveLoop(task: URLSessionWebSocketTask) {
        task.receive { [weak self] result in
            guard let self else { return }

            switch result {
            case let .success(message):
                Task { @MainActor in
                    if self.task === task {
                        switch message {
                        case let .string(text):
                            self.lastReceivedMessage = text
                        case let .data(data):
                            self.lastReceivedMessage = String(data: data, encoding: .utf8)
                        @unknown default:
                            break
                        }
                        self.receiveLoop(task: task)
                    }
                }
            case let .failure(error):
                Task { @MainActor in
                    if self.task === task {
                        self.lastErrorMessage = error.localizedDescription
                        self.isConnected = false
                        self.task = nil
                    }
                }
            }
        }
    }

    private static func resolveWebSocketURL(from raw: String) -> URL? {
        guard
            var components = URLComponents(
                string: raw.trimmingCharacters(in: .whitespacesAndNewlines))
        else {
            return nil
        }

        switch components.scheme?.lowercased() {
        case "ws", "wss":
            break
        case "http":
            components.scheme = "ws"
        case "https":
            components.scheme = "wss"
        default:
            return nil
        }

        return components.url
    }
}
