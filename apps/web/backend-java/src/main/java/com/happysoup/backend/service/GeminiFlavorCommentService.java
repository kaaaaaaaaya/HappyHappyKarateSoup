package com.happysoup.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.happysoup.backend.client.GeminiClient;
import com.happysoup.backend.config.GeminiProperties;
import com.happysoup.backend.model.response.FlavorProfileResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.StreamUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

// [EN] Uses Gemini to generate flavor profile and comment in a single request.
// [JA] 1回の Gemini リクエストで味プロファイルとコメントを同時生成します。
@Service
public class GeminiFlavorCommentService {

    private final GeminiClient geminiClient;
    private final GeminiProperties properties;
    private final ObjectMapper objectMapper;
    private final Resource flavorCommentPromptResource;

    public GeminiFlavorCommentService(
            GeminiClient geminiClient,
            GeminiProperties properties,
            ObjectMapper objectMapper,
            @Value("classpath:prompts/flavor_comment_prompt.txt") Resource flavorCommentPromptResource
    ) {
        this.geminiClient = geminiClient;
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.flavorCommentPromptResource = flavorCommentPromptResource;
    }

    // [EN] Returns flavor profile and Japanese comment generated from ingredients.
    // [JA] 材料から生成した味プロファイルと日本語コメントを返します。
    public FlavorCommentResult generateFlavorAndComment(List<String> ingredients) {
        return generateFlavorAndComment(ingredients, null);
    }

    // [EN] Returns flavor profile and Japanese comment with optional selected difficulty.
    // [JA] 任意の選択難易度を受け取り、味プロファイルと日本語コメントを返します。
    public FlavorCommentResult generateFlavorAndComment(List<String> ingredients, String selectedDifficulty) {
        String promptTemplate = readPromptTemplate();
        DifficultyProfile difficulty = DifficultyProfile.from(selectedDifficulty, ingredients);
        String prompt = promptTemplate
                .replace("{{ingredients}}", String.join(", ", ingredients))
                .replace("{{selectedDifficulty}}", difficulty.difficultyLabel)
                .replace("{{baseIngredient}}", difficulty.baseIngredientLabel);

        String raw = geminiClient.generateText(properties.textModel(), prompt);
        String jsonText = normalizeJsonText(raw);

        try {
            JsonNode node = objectMapper.readTree(jsonText);
            JsonNode flavorNode = node.path("flavor");
            int spicy = clamp(flavorNode.path("spicy").asInt(0));
            spicy = adjustSpicyByDifficulty(spicy, difficulty);

            FlavorProfileResponse flavor = new FlavorProfileResponse(
                    clamp(flavorNode.path("sweet").asInt(0)),
                    clamp(flavorNode.path("sour").asInt(0)),
                    clamp(flavorNode.path("salty").asInt(0)),
                    clamp(flavorNode.path("bitter").asInt(0)),
                    clamp(flavorNode.path("umami").asInt(0)),
                    spicy
            );
            String comment = node.path("comment").asText("").trim();

            return new FlavorCommentResult(flavor, comment);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to parse flavor/comment JSON: " + raw, ex);
        }
    }

    // [EN] Reads prompt template text from classpath resource.
    // [JA] classpath 上のプロンプトテンプレートを読み込みます。
    private String readPromptTemplate() {
        try {
            return StreamUtils.copyToString(flavorCommentPromptResource.getInputStream(), StandardCharsets.UTF_8);
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to read flavor_comment prompt template", ex);
        }
    }

    // [EN] Normalizes Gemini JSON output by removing markdown code fences if present.
    // [JA] Gemini の JSON 出力に markdown のコードフェンスが含まれる場合に除去します。
    private String normalizeJsonText(String raw) {
        String trimmed = raw == null ? "" : raw.trim();
        if (!trimmed.startsWith("```")) {
            return trimmed;
        }

        String withoutOpeningFence = trimmed.replaceFirst("^```(?:json)?\\s*", "");
        return withoutOpeningFence.replaceFirst("\\s*```$", "").trim();
    }

    // [EN] Clamps a score to 0..100.
    // [JA] スコアを 0..100 に丸めます。
    private int clamp(int value) {
        return Math.max(0, Math.min(100, value));
    }

    // [EN] Applies deterministic spicy correction so radar chart matches selected difficulty.
    // [JA] レーダーチャートの辛味が難易度に合うよう、辛味スコアを補正します。
    private int adjustSpicyByDifficulty(int spicy, DifficultyProfile difficulty) {
        return switch (difficulty.difficultyLabel) {
            case "easy" -> Math.min(spicy, 35);
            case "hard" -> Math.max(spicy, 70);
            default -> Math.max(35, Math.min(spicy, 65));
        };
    }

    // [EN] Helper carrying normalized difficulty/base labels.
    // [JA] 正規化済み難易度/ベースラベルを保持する補助オブジェクトです。
    private static final class DifficultyProfile {
        private final String difficultyLabel;
        private final String baseIngredientLabel;

        private DifficultyProfile(String difficultyLabel, String baseIngredientLabel) {
            this.difficultyLabel = difficultyLabel;
            this.baseIngredientLabel = baseIngredientLabel;
        }

        private static DifficultyProfile from(String selectedDifficulty, List<String> ingredients) {
            String normalizedDifficulty = normalize(selectedDifficulty);
            if (normalizedDifficulty.isBlank()) {
                normalizedDifficulty = inferDifficultyFromIngredients(ingredients);
            }

            return switch (normalizedDifficulty) {
                case "easy" -> new DifficultyProfile("easy", "miso");
                case "hard" -> new DifficultyProfile("hard", "mala");
                default -> new DifficultyProfile("normal", "tomato");
            };
        }

        private static String inferDifficultyFromIngredients(List<String> ingredients) {
            if (ingredients == null || ingredients.isEmpty()) {
                return "normal";
            }
            for (String ingredient : ingredients) {
                String token = normalize(ingredient);
                if (token.contains("mala") || token.contains("麻辣") || token.contains("malatang")) {
                    return "hard";
                }
                if (token.contains("miso") || token.contains("味噌")) {
                    return "easy";
                }
                if (token.contains("tomato") || token.contains("トマト")) {
                    return "normal";
                }
            }
            return "normal";
        }

        private static String normalize(String value) {
            return value == null ? "" : value.trim().toLowerCase();
        }
    }

    // [EN] Value object for combined flavor and comment generation output.
    // [JA] 味プロファイルとコメントの統合生成結果を保持する値オブジェクトです。
    public record FlavorCommentResult(FlavorProfileResponse flavor, String comment) {

    }
}
