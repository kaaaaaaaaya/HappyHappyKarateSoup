package com.happysoup.backend.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.happysoup.backend.config.GeminiProperties;
import com.google.auth.oauth2.AccessToken;
import com.google.auth.oauth2.GoogleCredentials;
import org.springframework.http.MediaType;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

// [EN] Low-level Gemini API client for text and image generation.
// [JA] テキスト生成・画像生成を行う Gemini API の低レイヤークライアントです。
@Component
public class GeminiClient {

    private static final String CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform";

    private final WebClient webClient;
    private final GeminiProperties properties;

    public GeminiClient(WebClient geminiWebClient, GeminiProperties properties) {
        this.webClient = geminiWebClient;
        this.properties = properties;
    }

    // [EN] Generates plain text from a prompt.
    // [JA] プロンプトからテキストを生成します。
    public String generateText(String model, String prompt) {
        JsonNode root = callGenerateContent(model, prompt, false);
        JsonNode textNode = root.path("candidates").path(0)
                .path("content").path("parts").path(0).path("text");
        return textNode.isMissingNode() ? "" : textNode.asText("");
    }

    // [EN] Generates image bytes in Base64 if Gemini returns inline image data.
    // [JA] Gemini がインライン画像を返した場合は Base64 文字列を返します。
    public String generateImageBase64(String model, String prompt) {
        JsonNode root = callGenerateContent(model, prompt, true);
        JsonNode candidates = root.path("candidates");

        if (candidates.isArray()) {
            for (JsonNode candidate : candidates) {
                JsonNode parts = candidate.path("content").path("parts");
                if (!parts.isArray()) {
                    continue;
                }

                for (JsonNode part : parts) {
                    JsonNode inlineData = part.path("inlineData");
                    if (inlineData.isMissingNode()) {
                        continue;
                    }

                    String mimeType = inlineData.path("mimeType").asText("");
                    String data = inlineData.path("data").asText("");
                    if (!data.isBlank() && (mimeType.isBlank() || mimeType.startsWith("image/"))) {
                        return data;
                    }
                }
            }
        }
        return "";
    }

    // [EN] Calls Gemini generateContent endpoint.
    // [JA] Gemini の generateContent エンドポイントを呼び出します。
    private JsonNode callGenerateContent(String model, String prompt, boolean imageRequest) {
        if (isVertexAiEnabled()) {
            return callVertexGenerateContent(model, prompt, imageRequest);
        }

        return callGeminiApiKeyGenerateContent(model, prompt, imageRequest);
    }

    // [EN] Calls Gemini API endpoint using API key authentication.
    // [JA] API キー認証で Gemini API エンドポイントを呼び出します。
    private JsonNode callGeminiApiKeyGenerateContent(String model, String prompt, boolean imageRequest) {
        ensureApiKey();

        Map<String, Object> body = buildRequestBody(prompt, imageRequest);

        return webClient.post()
                .uri(uriBuilder -> uriBuilder
                .path("/v1beta/models/{model}:generateContent")
                .queryParam("key", properties.apiKey())
                .build(model))
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .blockOptional()
                .orElseThrow(() -> new IllegalStateException("Gemini response is empty"));
    }

    // [EN] Calls Vertex AI Gemini endpoint using Application Default Credentials.
    // [JA] Application Default Credentials で Vertex AI Gemini エンドポイントを呼び出します。
    private JsonNode callVertexGenerateContent(String model, String prompt, boolean imageRequest) {
        ensureVertexConfig();

        String endpoint = "https://%s-aiplatform.googleapis.com/v1/projects/%s/locations/%s/publishers/google/models/%s:generateContent"
                .formatted(properties.location(), properties.projectId(), properties.location(), model);

        Map<String, Object> body = buildRequestBody(prompt, imageRequest);

        return webClient.post()
                .uri(endpoint)
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + getVertexAccessToken())
                .bodyValue(body)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .blockOptional()
                .orElseThrow(() -> new IllegalStateException("Vertex Gemini response is empty"));
    }

    // [EN] Builds common request body for text/image generation.
    // [JA] テキスト/画像生成の共通リクエストボディを作成します。
    private Map<String, Object> buildRequestBody(String prompt, boolean imageRequest) {
        Map<String, Object> body = new HashMap<>();
        body.put("contents", List.of(
                Map.of("role", "user", "parts", List.of(Map.of("text", prompt)))
        ));

        if (imageRequest) {
            body.put("generationConfig", Map.of(
                    "responseModalities", List.of("TEXT", "IMAGE")
            ));
        }

        return body;
    }

    // [EN] Obtains OAuth2 access token via Application Default Credentials.
    // [JA] Application Default Credentials から OAuth2 アクセストークンを取得します。
    private String getVertexAccessToken() {
        try {
            GoogleCredentials credentials = GoogleCredentials.getApplicationDefault()
                    .createScoped(List.of(CLOUD_PLATFORM_SCOPE));
            credentials.refreshIfExpired();
            AccessToken token = credentials.getAccessToken();

            if (token == null || token.getTokenValue() == null || token.getTokenValue().isBlank()) {
                throw new IllegalStateException("Vertex access token is empty");
            }
            return token.getTokenValue();
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to obtain Vertex access token", ex);
        }
    }

    // [EN] Returns true when Vertex AI mode is enabled.
    // [JA] Vertex AI モードが有効かどうかを返します。
    private boolean isVertexAiEnabled() {
        return Boolean.TRUE.equals(properties.useVertexAi());
    }

    // [EN] Validates required Vertex AI settings.
    // [JA] Vertex AI に必要な設定値を検証します。
    private void ensureVertexConfig() {
        if (properties.projectId() == null || properties.projectId().isBlank()) {
            throw new IllegalStateException("GEMINI_PROJECT_ID is not configured for Vertex AI mode");
        }
        if (properties.location() == null || properties.location().isBlank()) {
            throw new IllegalStateException("GEMINI_LOCATION is not configured for Vertex AI mode");
        }
    }

    // [EN] Validates API key presence before outbound call.
    // [JA] 外部呼び出し前に API キー設定を検証します。
    private void ensureApiKey() {
        if (properties.apiKey() == null || properties.apiKey().isBlank()) {
            throw new IllegalStateException("GEMINI_API_KEY is not configured");
        }
    }
}
