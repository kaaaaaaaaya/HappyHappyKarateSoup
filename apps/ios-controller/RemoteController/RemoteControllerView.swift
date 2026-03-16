import SwiftUI

// iPhone横向き用のリモコンUI
struct RemoteControllerView: View {
    enum Direction {
        case up, down, left, right
    }

    var onDirection: (Direction) -> Void = { _ in }
    var onConfirm: () -> Void = {}

    var body: some View {
        GeometryReader { geo in
            // 端末の向きに関係なく、常に横向き前提でレイアウト計算する
            let landscapeShortEdge = min(geo.size.width, geo.size.height)
            let isPortrait = geo.size.height > geo.size.width

            ZStack {
                GameLikeBackground()

                VStack {
                    Spacer()

                    controlPad
                        .frame(
                            width: min(landscapeShortEdge * 0.8, 420),
                            height: min(landscapeShortEdge * 0.8, 420)
                        )

                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .rotationEffect(.degrees(isPortrait ? 90 : 0))
            }
            .ignoresSafeArea()
        }
    }

    private var controlPad: some View {
        VStack(spacing: 18) {
            ArrowButton(systemImage: "chevron.up", color: .cyan) {
                onDirection(.up)
            }

            HStack(spacing: 18) {
                ArrowButton(systemImage: "chevron.left", color: .orange) {
                    onDirection(.left)
                }

                DecisionButton {
                    onConfirm()
                }

                ArrowButton(systemImage: "chevron.right", color: .orange) {
                    onDirection(.right)
                }
            }

            ArrowButton(systemImage: "chevron.down", color: .cyan) {
                onDirection(.down)
            }
        }
        .padding(20)
        .background(
            RoundedRectangle(cornerRadius: 32, style: .continuous)
                .fill(.ultraThinMaterial.opacity(0.35))
                .overlay(
                    RoundedRectangle(cornerRadius: 32, style: .continuous)
                        .stroke(Color.white.opacity(0.22), lineWidth: 1)
                )
        )
    }
}

private struct ArrowButton: View {
    let systemImage: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Circle()
                .fill(
                    LinearGradient(
                        colors: [color.opacity(0.95), color.opacity(0.55)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .overlay(
                    Image(systemName: systemImage)
                        .font(.system(size: 30, weight: .black))
                        .foregroundStyle(.white)
                )
                .overlay(
                    Circle()
                        .stroke(Color.white.opacity(0.25), lineWidth: 1)
                )
                .frame(width: 92, height: 92)
                .shadow(color: color.opacity(0.45), radius: 16, x: 0, y: 8)
        }
        .buttonStyle(ArcadePressStyle())
    }
}

private struct DecisionButton: View {
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Circle()
                .fill(
                    RadialGradient(
                        colors: [Color.pink.opacity(0.95), Color.purple.opacity(0.8)],
                        center: .topLeading,
                        startRadius: 8,
                        endRadius: 80
                    )
                )
                .overlay(
                    Text("決定")
                        .font(.system(size: 28, weight: .heavy, design: .rounded))
                        .foregroundStyle(.white)
                        .shadow(color: .black.opacity(0.35), radius: 3, x: 0, y: 2)
                )
                .overlay(
                    Circle()
                        .stroke(Color.white.opacity(0.35), lineWidth: 1)
                )
                .frame(width: 120, height: 120)
                .shadow(color: Color.purple.opacity(0.55), radius: 18, x: 0, y: 8)
        }
        .buttonStyle(ArcadePressStyle())
    }
}

private struct ArcadePressStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.94 : 1)
            .brightness(configuration.isPressed ? -0.08 : 0)
            .animation(.easeOut(duration: 0.08), value: configuration.isPressed)
    }
}

private struct GameLikeBackground: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.02, green: 0.02, blue: 0.06),
                    Color(red: 0.05, green: 0.01, blue: 0.12),
                    Color(red: 0.00, green: 0.10, blue: 0.18)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            // うっすらネオンの光
            Circle()
                .fill(Color.cyan.opacity(0.20))
                .blur(radius: 80)
                .frame(width: 240, height: 240)
                .offset(x: -170, y: -80)

            Circle()
                .fill(Color.pink.opacity(0.18))
                .blur(radius: 90)
                .frame(width: 260, height: 260)
                .offset(x: 180, y: 100)

            // シンプルなゲーム風グリッド
            GridPattern()
                .stroke(Color.white.opacity(0.07), lineWidth: 1)
                .blendMode(.plusLighter)
        }
    }
}

private struct GridPattern: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let step: CGFloat = 32

        var x: CGFloat = 0
        while x <= rect.width {
            path.move(to: CGPoint(x: x, y: 0))
            path.addLine(to: CGPoint(x: x, y: rect.height))
            x += step
        }

        var y: CGFloat = 0
        while y <= rect.height {
            path.move(to: CGPoint(x: 0, y: y))
            path.addLine(to: CGPoint(x: rect.width, y: y))
            y += step
        }

        return path
    }
}

#Preview("Landscape", traits: .landscapeRight) {
    RemoteControllerView()
}
