package com.happysoup.backend.service;

import com.happysoup.backend.client.GeminiClient;
import com.happysoup.backend.config.GeminiProperties;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.StreamUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

// [EN] Uses Gemini to generate a short soup comment.
// [JA] 完成スープへの短いコメントを Gemini で生成します。
@Service
public class GeminiCommentService {

    private final GeminiClient geminiClient;
    private final GeminiProperties properties;
    private final Resource commentPromptResource;

    public GeminiCommentService(
            GeminiClient geminiClient,
            GeminiProperties properties,
            @Value("classpath:prompts/comment_prompt.txt") Resource commentPromptResource
    ) {
        this.geminiClient = geminiClient;
        this.properties = properties;
        this.commentPromptResource = commentPromptResource;
    }

    // [EN] Generates a playful Japanese comment for the final soup.
    // [JA] 完成スープへの遊び心ある日本語コメントを生成します。
    public String generateComment(List<String> ingredients) {
        String promptTemplate = readPromptTemplate();
        String prompt = promptTemplate.replace("{{ingredients}}", String.join(", ", ingredients));

        return geminiClient.generateText(properties.textModel(), prompt).trim();
    }

    // [EN] Reads prompt template text from classpath resource.
    // [JA] classpath 上のプロンプトテンプレートを読み込みます。
    private String readPromptTemplate() {
        try {
            return StreamUtils.copyToString(commentPromptResource.getInputStream(), StandardCharsets.UTF_8);
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to read comment prompt template", ex);
        }
    }
}
