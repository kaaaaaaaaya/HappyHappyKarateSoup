package com.happysoup.backend.service;

import com.happysoup.backend.model.response.FlavorProfileResponse;
import com.happysoup.backend.model.response.SoupGenerateResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;

// [EN] Orchestrates all Gemini-based generation steps.
// [JA] Gemini を使った各生成処理をまとめて実行します。
@Service
public class SoupGenerationService {

    private static final Logger LOG = LoggerFactory.getLogger(SoupGenerationService.class);

    private final GeminiImageService imageService;
    private final GeminiFlavorCommentService flavorCommentService;
    private final boolean enableLocalFallback;

    public SoupGenerationService(
            GeminiImageService imageService,
            GeminiFlavorCommentService flavorCommentService,
            @Value("${soup.local-fallback.enabled:false}") boolean enableLocalFallback
    ) {
        this.imageService = imageService;
        this.flavorCommentService = flavorCommentService;
        this.enableLocalFallback = enableLocalFallback;
    }

    // [EN] Generates image, flavor chart data, and comment from ingredients.
    // [JA] 材料から画像・味チャートデータ・コメントを生成します。
    public SoupGenerateResponse generate(List<String> ingredients) {
        return generate(ingredients, null);
    }

    // [EN] Generates outputs using ingredients and an optional reference image.
    // [JA] 材料と任意の参照画像を使って生成結果を作成します。
    public SoupGenerateResponse generate(List<String> ingredients, String referenceImageDataUrl) {
        try {
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
        } catch (RuntimeException ex) {
            if (!isGeminiConfigMissing(ex)) {
                if (isGeminiTemporaryFailure(ex)) {
                    LOG.warn("Gemini temporary failure detected; returning local fallback response", ex);
                    return buildLocalFallbackResponse(ingredients);
                }
                throw ex;
            }

            if (!enableLocalFallback) {
                throw new IllegalStateException(
                        "Gemini configuration is missing. Set GEMINI_API_KEY or Vertex AI settings to enable AI generation.",
                        ex
                );
            }

            LOG.warn("Gemini config is missing; returning local fallback response", ex);
            return buildLocalFallbackResponse(ingredients);
        }
    }

    // [EN] Detects common Gemini configuration failures in exception chain.
    // [JA] 例外チェーンから Gemini 設定不足エラーを判定します。
    private boolean isGeminiConfigMissing(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            String message = current.getMessage();
            if (message != null) {
                if (message.contains("GEMINI_API_KEY is not configured")
                        || message.contains("GEMINI_PROJECT_ID is not configured")
                        || message.contains("GEMINI_LOCATION is not configured")
                        || message.contains("Failed to obtain Vertex access token")) {
                    return true;
                }
            }
            current = current.getCause();
        }
        return false;
    }

    // [EN] Detects retryable/temporary Gemini failures (quota or transient upstream errors).
    // [JA] Gemini の一時障害（クォータ超過や上流エラー）を判定します。
    private boolean isGeminiTemporaryFailure(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            String message = current.getMessage();
            if (message != null) {
                String normalized = message.toLowerCase();
                if (normalized.contains("429 too many requests")
                        || normalized.contains("resource_exhausted")
                        || normalized.contains("quota")
                        || normalized.contains("503 service unavailable")
                        || normalized.contains("504 gateway timeout")) {
                    return true;
                }
            }
            current = current.getCause();
        }
        return false;
    }

    // [EN] Builds deterministic local fallback output for development/demo use.
    // [JA] 開発/デモ用途向けに決定的なローカルフォールバック結果を作成します。
    private SoupGenerateResponse buildLocalFallbackResponse(List<String> ingredients) {
        int hash = Math.abs(String.join(",", ingredients).hashCode());
        FlavorProfileResponse flavor = new FlavorProfileResponse(
                30 + (hash % 45),
                20 + ((hash / 3) % 40),
                25 + ((hash / 5) % 40),
                10 + ((hash / 7) % 35),
                35 + ((hash / 11) % 45),
                5 + ((hash / 13) % 30)
        );

        String joined = ingredients.isEmpty() ? "具材" : String.join("・", ingredients);
        String comment = "ローカル生成モード: " + joined + " の個性を活かした、やさしい味わいのスープです。";

        String svg = "<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512'>"
                + "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>"
                + "<stop offset='0%' stop-color='#f6b73c'/><stop offset='100%' stop-color='#e46c2f'/></linearGradient></defs>"
                + "<rect width='100%' height='100%' fill='url(#g)'/>"
                + "<text x='50%' y='44%' text-anchor='middle' fill='white' font-size='54' font-family='sans-serif'>LOCAL MODE</text>"
                + "<text x='50%' y='58%' text-anchor='middle' fill='white' font-size='34' font-family='sans-serif'>Happy Soup</text>"
                + "</svg>";
        String imageDataUrl = "data:image/svg+xml;base64," + Base64.getEncoder().encodeToString(svg.getBytes(StandardCharsets.UTF_8));

        return new SoupGenerateResponse(ingredients, imageDataUrl, flavor, comment);
    }
}
