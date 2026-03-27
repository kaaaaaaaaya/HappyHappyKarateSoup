package com.happysoup.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.happysoup.backend.client.GeminiClient;
import com.happysoup.backend.config.GeminiProperties;
import com.happysoup.backend.model.response.FlavorProfileResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.util.StreamUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

// [EN] Uses Gemini to estimate six taste axes from ingredients.
// [JA] 材料から6味（甘味・酸味・塩味・苦味・うま味・辛味）を Gemini で推定します。
public class GeminiFlavorService {

    private final GeminiClient geminiClient;
    private final GeminiProperties properties;
    private final ObjectMapper objectMapper;
    private final Resource flavorPromptResource;

    public GeminiFlavorService(
            GeminiClient geminiClient,
            GeminiProperties properties,
            ObjectMapper objectMapper,
            @Value("classpath:prompts/flavor_prompt.txt") Resource flavorPromptResource
    ) {
        this.geminiClient = geminiClient;
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.flavorPromptResource = flavorPromptResource;
    }

    // [EN] Returns normalized flavor values in range 0..100.
    // [JA] 0..100 の範囲で正規化した味スコアを返します。
    public FlavorProfileResponse generateFlavorProfile(List<String> ingredients) {
        String promptTemplate = readPromptTemplate();
        String prompt = promptTemplate
                .replace("{{ingredients}}", String.join(", ", ingredients))
                .replace("{{selectedDifficulty}}", "normal")
                .replace("{{baseIngredient}}", "tomato");

        String raw = geminiClient.generateText(properties.textModel(), prompt);
        String jsonText = normalizeJsonText(raw);

        try {
            JsonNode node = objectMapper.readTree(jsonText);
            return new FlavorProfileResponse(
                    clamp(node.path("sweet").asInt(0)),
                    clamp(node.path("sour").asInt(0)),
                    clamp(node.path("salty").asInt(0)),
                    clamp(node.path("bitter").asInt(0)),
                    clamp(node.path("umami").asInt(0)),
                    clamp(node.path("spicy").asInt(0))
            );
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to parse flavor profile JSON: " + raw, ex);
        }
    }

    // [EN] Reads prompt template text from classpath resource.
    // [JA] classpath 上のプロンプトテンプレートを読み込みます。
    private String readPromptTemplate() {
        try {
            return StreamUtils.copyToString(flavorPromptResource.getInputStream(), StandardCharsets.UTF_8);
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to read flavor prompt template", ex);
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
}
