package com.happysoup.backend.config;

import com.happysoup.backend.client.GeminiClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
@Profile("test")
public class TestGeminiConfig {

    @Bean
    public GeminiClient geminiClient() {
        GeminiProperties properties = new GeminiProperties(
                "",
                "https://example.com",
                true,
                "test-project",
                "us-central1",
                "gemini-2.5-flash",
                "gemini-2.5-flash-image"
        );
        return new GeminiClient(WebClient.builder().baseUrl("https://example.com").build(), properties);
    }
}
