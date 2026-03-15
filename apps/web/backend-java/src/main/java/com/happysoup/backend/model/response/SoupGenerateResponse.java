package com.happysoup.backend.model.response;

import java.util.List;

// [EN] Combined response containing generated soup outputs.
// [JA] 生成されたスープ情報をまとめて返すレスポンスです。
public record SoupGenerateResponse(
        List<String> ingredients,
        String imageDataUrl,
        String imagePrompt,
        FlavorProfileResponse flavor,
        String comment
        ) {

}
