package com.happysoup.backend.collection.dto;

import java.time.LocalDateTime;
import java.util.List;

public record CollectionItemResponse(
        Long id,
        String imageUrl,
        Integer totalScore,
        String rank,
        String comment,
        List<String> ingredients,
        FlavorProfileDto flavor,
        LocalDateTime createdAt
) {
}
