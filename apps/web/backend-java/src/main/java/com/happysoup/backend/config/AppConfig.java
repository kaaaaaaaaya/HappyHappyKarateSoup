package com.happysoup.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.codec.ClientCodecConfigurer;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;

// [EN] Central configuration for beans such as WebClient and CORS.
// [JA] WebClient や CORS などの共通設定を定義します。
@Configuration
@EnableConfigurationProperties(GeminiProperties.class)
public class AppConfig {

    private static final int GEMINI_WEBCLIENT_MAX_IN_MEMORY_SIZE = 10 * 1024 * 1024;

    // [EN] Creates a WebClient used for Gemini API calls.
    // [JA] Gemini API 呼び出しに利用する WebClient を生成します。
    @Bean
    public WebClient geminiWebClient(GeminiProperties properties) {
        ExchangeStrategies strategies = ExchangeStrategies.builder()
                .codecs(this::configureCodecs)
                .build();

        return WebClient.builder()
                .baseUrl(properties.baseUrl())
                .exchangeStrategies(strategies)
                .build();
    }

    // [EN] Expands in-memory buffer to handle image inlineData responses from Gemini.
    // [JA] Gemini の画像 inlineData 応答を扱うため、メモリ内バッファ上限を拡張します。
    private void configureCodecs(ClientCodecConfigurer codecConfigurer) {
        codecConfigurer.defaultCodecs().maxInMemorySize(GEMINI_WEBCLIENT_MAX_IN_MEMORY_SIZE);
    }

    // [EN] Enables CORS for local frontend development.
    // [JA] ローカル開発用フロントエンドの CORS を許可します。
    @Bean
    public CorsFilter corsFilter(@Value("${app.cors.allowed-origins}") String allowedOrigins) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of(allowedOrigins.split(",")));
        config.setAllowedMethods(List.of("GET", "POST", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}
