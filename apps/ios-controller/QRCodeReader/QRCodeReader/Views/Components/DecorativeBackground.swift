import SwiftUI

/// レトロな背景を埋めるための装飾要素（線、円、三角形）
struct DecorativeBackground: View {
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