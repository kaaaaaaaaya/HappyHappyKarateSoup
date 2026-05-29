package com.happysoup.backend.auth.dto;

public record RegisterResponse(
        String email,
        boolean emailVerificationRequired,
        String message,
        String devVerificationUrl
) {
}
