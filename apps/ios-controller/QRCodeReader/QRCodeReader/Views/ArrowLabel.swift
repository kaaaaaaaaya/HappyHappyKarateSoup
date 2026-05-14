import SwiftUI

/// レトロスタイルのドット絵風矢印ラベル
struct ArrowLabel: View {
    let symbol: String
    var fontSize: CGFloat = 64
    var body: some View {
        Text(symbol).font(.custom("DotGothic16-Regular", size: fontSize)).foregroundColor(
            Color(hex: "#1a1a1a")).baselineOffset(10)
    }
}