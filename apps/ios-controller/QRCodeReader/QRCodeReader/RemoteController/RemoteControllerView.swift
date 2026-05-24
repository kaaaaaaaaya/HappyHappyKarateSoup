import SwiftUI


/// 十字キー形式のレイアウトを使用してメニューを操作するためのUI
struct RemoteControllerView: View {
    var onDirection: (String) -> Void
    var onConfirm: () -> Void
    var onClose: () -> Void

    var body: some View {
        ZStack {
            Image("RemoteControllerBackground")
                .resizable()
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // 上部のマーキー（流れる文字）バー
                ZStack {
                    Color(hex: "#8A9BAD").opacity(0.88)
                    MarqueeView(text: "Now Playing Happy Happy Karate Soup!")
                }
                .frame(maxWidth: .infinity, minHeight: 40, maxHeight: 40)

                // 閉じるボタン
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

                // メインコントローラーのボタン
                HStack(alignment: .center, spacing: 100) {
                    // 決定/OKボタン
                    CardButton(action: { onConfirm() }) {
                        OKLabel(fontSize: 70)
                    }
                    .frame(width: 160, height: 160)

                    // 方向キー（D-Pad）
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

                // 下部の装飾バー
                Color(hex: "#8A9BAD").opacity(0.88).frame(height: 20)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        }
        .ignoresSafeArea()
    }
}
