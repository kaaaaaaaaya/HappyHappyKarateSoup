package com.happysoup.backend.model.response;

// [EN] Six-axis flavor profile used for radar chart drawing.
// [JA] 六角形レーダーチャート描画に使う6軸の味プロファイルです。
public record FlavorProfileResponse(
        int sweet,
        int sour,
        int salty,
        int bitter,
        int umami,
        int spicy
        ) {

}
