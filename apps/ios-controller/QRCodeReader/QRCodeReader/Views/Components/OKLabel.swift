import SwiftUI

/// レトロスタイルのドット絵風OKラベル
struct OKLabel: View {
    var fontSize: CGFloat = 80
    var body: some View {
        Text("OK!").font(.custom("DotGothic16-Regular", size: fontSize)).foregroundColor(
            Color(hex: "#1a1a1a")
        ).kerning(2)
    }
}