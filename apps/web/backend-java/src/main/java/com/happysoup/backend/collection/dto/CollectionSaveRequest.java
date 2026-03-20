package com.happysoup.backend.collection.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CollectionSaveRequest(
        @NotNull Long userId,
        @NotBlank String imageDataUrl,
        List<String> ingredients,
        FlavorProfileDto flavor,
        String comment,
        Integer totalScore,
        String rank
) {
}
