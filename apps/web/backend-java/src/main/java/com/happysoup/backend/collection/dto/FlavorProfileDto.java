package com.happysoup.backend.collection.dto;

public record FlavorProfileDto(
        int sweet,
        int sour,
        int salty,
        int bitter,
        int umami,
        int spicy
) {
}
