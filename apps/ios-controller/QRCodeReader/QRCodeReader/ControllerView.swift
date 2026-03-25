import Foundation
import SwiftUI
import UIKit

struct ControllerView: View {
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

    private enum ActionFlash: Equatable {
        case punch
        case chop

        var imageName: String {
            switch self {
            case .punch:
                return "PunchIllustration"
            case .chop:
                return "ChopIllustration"
            }
        }
    }

    private struct RoomStatusResponse: Decodable {
        struct CommandEntry: Decodable {
            let sequence: Int
            let command: String
        }

        let roomId: String
        let connected: Bool
        let commandSequence: Int?
        let latestCommand: String?
        let commands: [CommandEntry]?
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
    @State private var currentActionFlash: ActionFlash? = nil
    @State private var hideFlashTask: Task<Void, Never>? = nil
    @StateObject private var motionDetector = ControllerMotionDetector()
    private let showsSimulatorTestButtons: Bool = {
#if targetEnvironment(simulator)
        true
#else
        false
#endif
    }()

    var body: some View {
        GeometryReader { geo in
            controllerContent
                .frame(width: geo.size.width, height: geo.size.height)
        }
        .ignoresSafeArea()
        .onAppear {
            startPollingRoomStatus()
            motionDetector.start()
        }
        .onDisappear {
            pollTask?.cancel()
            pollTask = nil
            hideFlashTask?.cancel()
            hideFlashTask = nil
            motionDetector.stop()
        }
        .onChange(of: motionDetector.punchEventId) { _, _ in
            if mode == .action {
                showActionFlash(.punch)
                sendActionCommand("punch", acceleration: motionDetector.lastActionAcceleration)
            }
        }
        .onChange(of: motionDetector.chopEventId) { _, _ in
            if mode == .action {
                showActionFlash(.chop)
                sendActionCommand("chop", acceleration: motionDetector.lastActionAcceleration)
            }
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
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var retroRemoteView: some View {
        ZStack {
            Color(hex: "#F5EDD8").ignoresSafeArea()
            DecorativeBackground()

            VStack(spacing: 0) {
                ZStack {
                    Color(hex: "#8A9BAD").opacity(0.88)
                    MarqueeView(text: "Now Playing Happy Happy Karate Soup!")
                }
                .frame(maxWidth: .infinity, minHeight: 40, maxHeight: 40)

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

                HStack(alignment: .center, spacing: 100) {
                    CardButton(action: { onConfirm() }) {
                        OKLabel(fontSize: 70)
                    }
                    .frame(width: 160, height: 160)

                    HStack(spacing: 20) {
                        CardButton(action: { onDirection("left") }) {
                            ArrowLabel(symbol: "<", fontSize: 60)
                            
                        }.frame(width: 80, height: 130)

                        VStack(spacing: 20) {
                            CardButton(action: { onDirection("up") }) {
                                ArrowLabel(symbol: "^", fontSize:50)
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                            }.frame(width: 110, height: 80)

                            CardButton(action: { onDirection("down") }) {
                                ArrowLabel(symbol: "v", fontSize: 50)
                            }.frame(width: 110, height: 80)
                        }

                        CardButton(action: { onDirection("right") }) {
                            ArrowLabel(symbol: ">", fontSize: 60)
                        }.frame(width: 80, height: 130)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .center)

                Spacer()

                Color(hex: "#8A9BAD").opacity(0.88).frame(height: 20)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        }
        .ignoresSafeArea()
    }

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

                Spacer()

                VStack(spacing: 16) {
                    Text("ゲームモード")
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

                if showsSimulatorTestButtons {
                    HStack(spacing: 12) {
                        Button("TEST PUNCH") {
                            showActionFlash(.punch)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.red)

                        Button("TEST CHOP") {
                            showActionFlash(.chop)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.cyan)
                    }
                }

                Spacer()

                Text("オートエイム中。モーションだけで攻撃できます")
                    .font(.footnote)
                    .foregroundStyle(.white.opacity(0.8))
            }
            .padding(20)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)

            if let flash = currentActionFlash {
                actionFlashOverlay(for: flash)
                    .transition(
                        .asymmetric(
                            insertion: .scale(scale: 0.55).combined(with: .opacity),
                            removal: .scale(scale: 1.08).combined(with: .opacity)
                        )
                    )
            }
        }
        .animation(
            .interactiveSpring(response: 0.14, dampingFraction: 0.58, blendDuration: 0.06),
            value: currentActionFlash
        )
    }

    @ViewBuilder
    private func actionFlashOverlay(for flash: ActionFlash) -> some View {
        VStack {
            Spacer()
            Image(flash.imageName)
                .resizable()
                .scaledToFit()
                .frame(maxWidth: 520, maxHeight: 320)
                .padding(.horizontal, 24)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(
            Color.white.ignoresSafeArea()
        )
        .allowsHitTesting(false)
    }

    private func sendActionCommand(_ action: String, acceleration: Double?) {
        let x = String(format: "%.3f", max(0, min(1, aimX)))
        let y = String(format: "%.3f", max(0, min(1, aimY)))
        if let acceleration {
            let a = String(format: "%.3f", max(0, acceleration))
            onDirection("\(action)@\(x),\(y),\(a)")
        } else {
            onDirection("\(action)@\(x),\(y)")
        }
        let impact = UIImpactFeedbackGenerator(style: .medium)
        impact.impactOccurred()
    }

    private func showActionFlash(_ flash: ActionFlash) {
        hideFlashTask?.cancel()
        currentActionFlash = flash
        hideFlashTask = Task {
            try? await Task.sleep(nanoseconds: 650_000_000)
            guard !Task.isCancelled else { return }
            await MainActor.run {
                currentActionFlash = nil
            }
        }
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
        var components = URLComponents(string: "\(baseURL)/api/controller/rooms/\(roomId)/status")
        if lastSeenSequence >= 0 {
            components?.queryItems = [URLQueryItem(name: "since", value: String(lastSeenSequence))]
        }

        guard let url = components?.url else {
            return
        }
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            let res = try JSONDecoder().decode(RoomStatusResponse.self, from: data)
            let seq = res.commandSequence ?? 0

            let commandEntries: [RoomStatusResponse.CommandEntry]
            if let incremental = res.commands, !incremental.isEmpty {
                commandEntries = incremental
            } else if seq > lastSeenSequence, let latest = res.latestCommand {
                commandEntries = [.init(sequence: seq, command: latest)]
            } else {
                commandEntries = []
            }

            for entry in commandEntries {
                let cmd = entry.command
                if cmd == "start_game" {
                    mode = .action
                } else if ["end_game", "return_remote"].contains(cmd) {
                    mode = .remote
                } else if cmd == "hit" && mode == .action {
                    print("[ControllerView] hit received (sequence: \(entry.sequence))")
                    notifyHitHaptic()
                }
            }

            if seq > lastSeenSequence {
                lastSeenSequence = seq
            }
        } catch {}
    }

    private func notifyHitHaptic() {
        // ゲームの打撃（ヒット）に最適な、重くて短い振動
        let impactGenerator = UIImpactFeedbackGenerator(style: .heavy)
        impactGenerator.prepare() // 事前に準備しておくと遅延なく振動
        impactGenerator.impactOccurred()
    }
}

private struct ArrowLabel: View {
    let symbol: String
    var fontSize: CGFloat = 64
    var body: some View {
        Text(symbol).font(.custom("DotGothic16-Regular", size: fontSize)).foregroundColor(
            Color(hex: "#1a1a1a")).baselineOffset(10)
    }
}

private struct OKLabel: View {
    var fontSize: CGFloat = 80
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
            .frame(maxWidth: .infinity, maxHeight: .infinity)
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
        GeometryReader { _ in
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

#Preview(traits: .landscapeRight) {
    ControllerView(
        scannedCode: "happykaratesoup://connect?roomId=room-preview&apiBase=http://localhost:8080",
        debugMessage: "Now Playing Happy Happy Karate Soup!",
        onDirection: { _ in },
        onConfirm: {},
        onClose: {}
    )
}
