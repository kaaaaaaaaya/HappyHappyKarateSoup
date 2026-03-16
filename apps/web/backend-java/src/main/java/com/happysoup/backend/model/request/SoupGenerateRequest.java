package com.happysoup.backend.model.request;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

// [EN] Request payload sent from frontend with succeeded ingredients.
// [JA] フロントエンドから送信される、投入成功材料のリクエストです。
public record SoupGenerateRequest(
        @NotEmpty(message = "ingredients must not be empty")
        List<String> ingredients
        ) {

}
