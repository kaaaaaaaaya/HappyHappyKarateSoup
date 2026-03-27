package com.happysoup.backend.model.request;

import java.util.List;

import jakarta.validation.constraints.NotEmpty;

// [EN] Request payload sent from frontend with succeeded ingredients.
// [JA] フロントエンドから送信される、投入成功材料のリクエストです。
public record SoupGenerateRequest(
        @NotEmpty(message = "ingredients must not be empty")
        List<String> ingredients,
        String referenceImageDataUrl,
        String selectedDifficulty
        ) {

}
