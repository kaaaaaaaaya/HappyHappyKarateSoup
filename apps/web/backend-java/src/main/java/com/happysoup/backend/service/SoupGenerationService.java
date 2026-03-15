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
    private final GeminiFlavorService flavorService;
    private final GeminiCommentService commentService;

    public SoupGenerationService(
            GeminiImageService imageService,
            GeminiFlavorService flavorService,
            GeminiCommentService commentService
    ) {
        this.imageService = imageService;
        this.flavorService = flavorService;
        this.commentService = commentService;
    }

    // [EN] Generates image, flavor chart data, and comment from ingredients.
    // [JA] 材料から画像・味チャートデータ・コメントを生成します。
    public SoupGenerateResponse generate(List<String> ingredients) {
        GeminiImageService.GeneratedImage generatedImage = imageService.generateSoupImage(ingredients);
        FlavorProfileResponse flavor = flavorService.generateFlavorProfile(ingredients);
        String comment = commentService.generateComment(ingredients);

        return new SoupGenerateResponse(
                ingredients,
                generatedImage.imageDataUrl(),
                generatedImage.imagePrompt(),
                flavor,
                comment
        );
    }
}
