package com.happysoup.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

// [EN] Configuration values for Gemini API access.
// [JA] Gemini API 連携のための設定値です。
@ConfigurationProperties(prefix = "gemini")
public record GeminiProperties(
        String apiKey,
        String baseUrl,
        Boolean useVertexAi,
        String projectId,
        String location,
        String textModel,
        String imageModel
        ) {

}
