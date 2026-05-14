import SwiftUI

/// リモートモードの上部ステータスバーで使用されるスクロールテキストビュー（マーキー）
struct MarqueeView: View {
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
                // シームレスなループのための2つ目のテキスト
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