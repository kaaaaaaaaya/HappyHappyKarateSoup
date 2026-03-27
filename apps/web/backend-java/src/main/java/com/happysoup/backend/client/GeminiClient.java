package com.happysoup.backend.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.happysoup.backend.config.GeminiProperties;
import com.google.auth.oauth2.AccessToken;
import com.google.auth.oauth2.GoogleCredentials;
import org.springframework.http.MediaType;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// [EN] Low-level Gemini API client for text and image generation.
// [JA] テキスト生成・画像生成を行う Gemini API の低レイヤークライアントです。
@Component
public class GeminiClient {

    private static final String CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform";
    private static final Pattern DATA_URL_PATTERN = Pattern.compile("^data:(image/[\\w.+-]+);base64,(.+)$", Pattern.DOTALL);
    private static final int MAX_RETRY_ATTEMPTS = 3;
    private static final long INITIAL_RETRY_DELAY_MILLIS = 800L;

    private final WebClient webClient;
    private final GeminiProperties properties;

    public GeminiClient(WebClient geminiWebClient, GeminiProperties properties) {
        this.webClient = geminiWebClient;
        this.properties = properties;
        if (!Boolean.TRUE.equals(properties.useVertexAi())) {
            throw new IllegalStateException("GEMINI_USE_VERTEX_AI must be true. Vertex AI is mandatory.");
        }
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
        return generateImageBase64(model, prompt, null);
    }

    // [EN] Generates image bytes with optional reference image input.
    // [JA] 任意の参照画像入力付きで画像 Base64 を生成します。
    public String generateImageBase64(String model, String prompt, String referenceImageDataUrl) {
        if (isVertexAiEnabled() && isImagenModel(model)) {
            JsonNode root = withRetryOnTooManyRequests(() -> callVertexImagenPredict(model, prompt, referenceImageDataUrl));
            JsonNode predictions = root.path("predictions");

            if (predictions.isArray()) {
                for (JsonNode prediction : predictions) {
                    String data = prediction.path("bytesBase64Encoded").asText("");
                    if (!data.isBlank()) {
                        return data;
                    }
                }
            }
            return "";
        }

        JsonNode root = callGenerateContent(model, prompt, true, referenceImageDataUrl);
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
        return callGenerateContent(model, prompt, imageRequest, null);
    }

    // [EN] Calls Gemini generateContent endpoint with optional reference image input.
    // [JA] 任意の参照画像入力付きで Gemini の generateContent エンドポイントを呼び出します。
    private JsonNode callGenerateContent(String model, String prompt, boolean imageRequest, String referenceImageDataUrl) {
        return withRetryOnTooManyRequests(() -> {
            if (isVertexAiEnabled()) {
                return callVertexGenerateContent(model, prompt, imageRequest, referenceImageDataUrl);
            }
            return callGeminiApiKeyGenerateContent(model, prompt, imageRequest, referenceImageDataUrl);
        });
    }

    // [EN] Retries request on HTTP 429 with exponential backoff.
    // [JA] HTTP 429 の場合に指数バックオフで再試行します。
    private JsonNode withRetryOnTooManyRequests(RequestExecutor executor) {
        long delay = INITIAL_RETRY_DELAY_MILLIS;

        for (int attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
            try {
                return executor.execute();
            } catch (WebClientResponseException ex) {
                if (ex.getStatusCode().value() != 429 || attempt == MAX_RETRY_ATTEMPTS) {
                    throw ex;
                }
                sleep(delay);
                delay *= 2;
            }
        }

        throw new IllegalStateException("Unexpected retry flow");
    }

    // [EN] Sleeps current thread for retry delay.
    // [JA] 再試行待機のためにスレッドをスリープします。
    private void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Retry sleep interrupted", ex);
        }
    }

    @FunctionalInterface
    private interface RequestExecutor {

        JsonNode execute();
    }

    // [EN] Calls Gemini API endpoint using API key authentication.
    // [JA] API キー認証で Gemini API エンドポイントを呼び出します。
    private JsonNode callGeminiApiKeyGenerateContent(String model, String prompt, boolean imageRequest) {
        return callGeminiApiKeyGenerateContent(model, prompt, imageRequest, null);
    }

    // [EN] Calls Gemini API endpoint using API key with optional image input.
    // [JA] 任意の画像入力付きで API キー認証の Gemini API を呼び出します。
    private JsonNode callGeminiApiKeyGenerateContent(String model, String prompt, boolean imageRequest, String referenceImageDataUrl) {
        ensureApiKey();

        Map<String, Object> body = buildRequestBody(prompt, imageRequest, referenceImageDataUrl);

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
        return callVertexGenerateContent(model, prompt, imageRequest, null);
    }

    // [EN] Calls Vertex AI Gemini endpoint with optional image input.
    // [JA] 任意の画像入力付きで Vertex AI Gemini エンドポイントを呼び出します。
    private JsonNode callVertexGenerateContent(String model, String prompt, boolean imageRequest, String referenceImageDataUrl) {
        ensureVertexConfig();

        String endpoint = "https://%s-aiplatform.googleapis.com/v1/projects/%s/locations/%s/publishers/google/models/%s:generateContent"
                .formatted(properties.location(), properties.projectId(), properties.location(), model);

        Map<String, Object> body = buildRequestBody(prompt, imageRequest, referenceImageDataUrl);

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

    // [EN] Calls Vertex AI Imagen endpoint using :predict for image generation.
    // [JA] 画像生成時は Vertex AI Imagen の :predict エンドポイントを呼び出します。
    private JsonNode callVertexImagenPredict(String model, String prompt, String referenceImageDataUrl) {
        ensureVertexConfig();

        String endpoint = "https://%s-aiplatform.googleapis.com/v1/projects/%s/locations/%s/publishers/google/models/%s:predict"
                .formatted(properties.location(), properties.projectId(), properties.location(), model);

        String token = getVertexAccessToken();
        Map<String, Object> parameters = Map.of(
                "sampleCount", 1,
                "enhancePrompt", false
        );

        if (referenceImageDataUrl == null || referenceImageDataUrl.isBlank()) {
            return postVertexImagen(endpoint, token, Map.of(
                    "instances", List.of(Map.of("prompt", prompt)),
                    "parameters", parameters
            ), "Vertex Imagen response is empty");
        }

        try {
            // [EN] Prefer style-reference mode to avoid near-copy outputs.
            // [JA] 参照画像のほぼ複製を避けるため、まず style 参照を優先します。
            Map<String, Object> instance = new HashMap<>();
            instance.put("prompt", prompt);
            extractImagenReferenceImage(referenceImageDataUrl, "REFERENCE_TYPE_STYLE")
                    .ifPresent(referenceImage -> instance.put("referenceImages", List.of(referenceImage)));

            return postVertexImagen(endpoint, token, Map.of(
                    "instances", List.of(instance),
                    "parameters", parameters
            ), "Vertex Imagen response is empty");
        } catch (WebClientResponseException exStyle) {
            if (exStyle.getStatusCode().value() != 400) {
                throw exStyle;
            }

            try {
                // [EN] Fallback to raw-reference mode if style-reference is unsupported.
                // [JA] style 参照が未対応の場合は raw 参照へフォールバックします。
                Map<String, Object> instance = new HashMap<>();
                instance.put("prompt", prompt);
                extractImagenReferenceImage(referenceImageDataUrl, "REFERENCE_TYPE_RAW")
                        .ifPresent(referenceImage -> instance.put("referenceImages", List.of(referenceImage)));

                return postVertexImagen(endpoint, token, Map.of(
                        "instances", List.of(instance),
                        "parameters", parameters
                ), "Vertex Imagen fallback response is empty");
            } catch (WebClientResponseException exRaw) {
                // [EN] Some Imagen models may reject referenceImages in generation mode.
                // [JA] 一部の Imagen モデルは生成モードで referenceImages を受け付けない場合があります。
                if (exRaw.getStatusCode().value() == 400) {
                    return postVertexImagen(endpoint, token, Map.of(
                            "instances", List.of(Map.of("prompt", prompt)),
                            "parameters", parameters
                    ), "Vertex Imagen no-reference fallback response is empty");
                }
                throw exRaw;
            }
        }
    }

    // [EN] Posts a JSON body to Vertex Imagen predict endpoint.
    // [JA] Vertex Imagen の predict エンドポイントへ JSON ボディを送信します。
    private JsonNode postVertexImagen(String endpoint, String accessToken, Map<String, Object> body, String emptyMessage) {
        return webClient.post()
                .uri(endpoint)
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .blockOptional()
                .orElseThrow(() -> new IllegalStateException(emptyMessage));
    }

    // [EN] Converts data URL to Imagen referenceImages item when valid.
    // [JA] 妥当な data URL を Imagen の referenceImages 要素へ変換します。
    private Optional<Map<String, Object>> extractImagenReferenceImage(String referenceImageDataUrl, String referenceType) {
        if (referenceImageDataUrl == null || referenceImageDataUrl.isBlank()) {
            return Optional.empty();
        }

        Matcher matcher = DATA_URL_PATTERN.matcher(referenceImageDataUrl.trim());
        if (!matcher.matches()) {
            return Optional.empty();
        }

        String base64 = matcher.group(2).replaceAll("\\s", "");
        if (base64.isBlank()) {
            return Optional.empty();
        }

        return Optional.of(Map.of(
                "referenceType", referenceType,
                "referenceId", 1,
                "referenceImage", Map.of(
                        "bytesBase64Encoded", base64
                )
        ));
    }

    // [EN] Builds common request body for text/image generation.
    // [JA] テキスト/画像生成の共通リクエストボディを作成します。
    private Map<String, Object> buildRequestBody(String prompt, boolean imageRequest) {
        return buildRequestBody(prompt, imageRequest, null);
    }

    // [EN] Builds request body with optional inline reference image.
    // [JA] 任意の参照画像（inlineData）を含むリクエストボディを作成します。
    private Map<String, Object> buildRequestBody(String prompt, boolean imageRequest, String referenceImageDataUrl) {
        Map<String, Object> body = new HashMap<>();
        List<Map<String, Object>> parts = new ArrayList<>();
        parts.add(Map.of("text", prompt));

        if (imageRequest) {
            extractInlineImagePart(referenceImageDataUrl).ifPresent(parts::add);
        }

        body.put("contents", List.of(
                Map.of("role", "user", "parts", parts)
        ));

        if (imageRequest) {
            body.put("generationConfig", Map.of(
                    "responseModalities", List.of("TEXT", "IMAGE")
            ));
        }

        return body;
    }

    // [EN] Converts data URL string to Gemini inlineData part when valid.
    // [JA] 妥当な data URL 文字列を Gemini の inlineData パートへ変換します。
    private Optional<Map<String, Object>> extractInlineImagePart(String referenceImageDataUrl) {
        if (referenceImageDataUrl == null || referenceImageDataUrl.isBlank()) {
            return Optional.empty();
        }

        Matcher matcher = DATA_URL_PATTERN.matcher(referenceImageDataUrl.trim());
        if (!matcher.matches()) {
            return Optional.empty();
        }

        String mimeType = matcher.group(1);
        String base64 = matcher.group(2).replaceAll("\\s", "");
        if (base64.isBlank()) {
            return Optional.empty();
        }

        return Optional.of(Map.of(
                "inlineData", Map.of(
                        "mimeType", mimeType,
                        "data", base64
                )
        ));
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

    // [EN] Returns true when model name indicates Imagen family.
    // [JA] モデル名が Imagen 系の場合に true を返します。
    private boolean isImagenModel(String model) {
        if (model == null) {
            return false;
        }
        return model.startsWith("imagen-") || model.startsWith("imagegeneration@");
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
