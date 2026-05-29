import SwiftUI
import UIKit


/// レトロスタイルのドット絵風矢印ラベル
struct ArrowLabel: View {
    let symbol: String
    var fontSize: CGFloat = 64
    var body: some View {
        Text(symbol)
            .font(.custom("DotGothic16-Regular", size: fontSize))
            .foregroundColor(Color(hex: "#1a1a1a"))
            .baselineOffset(10)
    }
}

/// レトロスタイルのドット絵風OKラベル
struct OKLabel: View {
    var fontSize: CGFloat = 80
    var body: some View {
        Text("OK!")
            .font(.custom("DotGothic16-Regular", size: fontSize))
            .foregroundColor(Color(hex: "#1a1a1a"))
            .kerning(2)
    }
}

/// 「3D」の押し込み効果（影の移動とスケール変更）を持つカスタムボタン
struct CardButton<Content: View>: View {
    let action: () -> Void
    @ViewBuilder let content: () -> Content
    @State private var isPressed = false
    @State private var hasTriggeredHaptic = false
    private let feedbackGenerator = UIImpactFeedbackGenerator(style: .medium)

    var body: some View {
        Button(action: {
            action()
        }) {
            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color(hex: "#9b9b9b").opacity(0.5))
                    .offset(x: isPressed ? 2 : 6, y: isPressed ? 2 : 6)

                RoundedRectangle(cornerRadius: 10)
                    .fill(Color(hex: "#D4896A"))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .strokeBorder(Color(hex: "#7a7a7a"), lineWidth: 2)
                    )
                content()
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .buttonStyle(PlainButtonStyle())
        .scaleEffect(isPressed ? 0.95 : 1.0)
        .onLongPressGesture(minimumDuration: 0, maximumDistance: 50, pressing: { pressing in
            if pressing {
                if !hasTriggeredHaptic {
                    feedbackGenerator.prepare()
                    feedbackGenerator.impactOccurred()
                    hasTriggeredHaptic = true
                }
                withAnimation(.spring(response: 0.1, dampingFraction: 0.6)) {
                    isPressed = true
                }
            } else {
                hasTriggeredHaptic = false
                withAnimation {
                    isPressed = false
                }
            }
        }, perform: {})
    }
}

/// リモートモードの上部ステータスバーで使用されるスクロールテキストビュー（マーキー）
struct MarqueeView: View {
    let text: String
    @State private var offset: CGFloat = 0
    @State private var textWidth: CGFloat = 0

    var body: some View {
        GeometryReader { _ in
            let fullText = ". ... \(text) ... ... "
            HStack(spacing: 0) {
                Text(fullText)
                    .font(.custom("DotGothic16-Regular", size: 18))
                    .fixedSize()
                    .background(
                        GeometryReader { tGeo in
                            Color.clear.onAppear { textWidth = tGeo.size.width }
                        }
                    )
                Text(fullText)
                    .font(.custom("DotGothic16-Regular", size: 18))
                    .fixedSize()
            }
            .foregroundColor(Color(hex: "#1a1a1a"))
            .offset(x: offset)
            .onAppear {
                withAnimation(.linear(duration: 8).repeatForever(autoreverses: false)) {
                    offset = -textWidth
                }
            }
        }
        .clipped()
    }
}
