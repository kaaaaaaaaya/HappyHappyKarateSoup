import SwiftUI

/// 「3D」の押し込み効果（影の移動とスケール変更）を持つカスタムボタン
struct CardButton<Content: View>: View {
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
                // 背景の影
                RoundedRectangle(cornerRadius: 10).fill(Color(hex: "#9b9b9b").opacity(0.5)).offset(
                    x: isPressed ? 2 : 6, y: isPressed ? 2 : 6)
                // ボタンのメイン表面
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