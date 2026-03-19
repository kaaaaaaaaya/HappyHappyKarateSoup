package com.happysoup.backend.auth.dto;

public record AuthResponse(
        String token,
        Long userId,
        String username,
        String email,
        String provider
) {
}
