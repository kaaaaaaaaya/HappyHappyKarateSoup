package com.happysoup.backend.service;

import com.happysoup.backend.model.response.FlavorProfileResponse;
import com.happysoup.backend.model.response.SoupGenerateResponse;
import org.springframework.stereotype.Service;

import java.util.List;

// [EN] Orchestrates all Gemini-based generation steps.
// [JA] Gemini を使った各生成処理をまとめて実行します。
@Service
public class SoupGenerationService {

    private final GeminiImageService imageService;
    private final GeminiFlavorCommentService flavorCommentService;

    public SoupGenerationService(
            GeminiImageService imageService,
            GeminiFlavorCommentService flavorCommentService
    ) {
        this.imageService = imageService;
        this.flavorCommentService = flavorCommentService;
    }

    // [EN] Generates image, flavor chart data, and comment from ingredients.
    // [JA] 材料から画像・味チャートデータ・コメントを生成します。
    public SoupGenerateResponse generate(List<String> ingredients) {
        return generate(ingredients, null);
    }

    // [EN] Generates outputs using ingredients and an optional reference image.
    // [JA] 材料と任意の参照画像を使って生成結果を作成します。
    public SoupGenerateResponse generate(List<String> ingredients, String referenceImageDataUrl) {
        GeminiImageService.GeneratedImage generatedImage = imageService.generateSoupImage(ingredients, referenceImageDataUrl);
        GeminiFlavorCommentService.FlavorCommentResult flavorComment = flavorCommentService.generateFlavorAndComment(ingredients);
        FlavorProfileResponse flavor = flavorComment.flavor();
        String comment = flavorComment.comment();

        return new SoupGenerateResponse(
                ingredients,
                generatedImage.imageDataUrl(),
                flavor,
                comment
        );
    }
}
