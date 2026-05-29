package com.happysoup.backend.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ResendVerificationRequest(
        @NotBlank(message = "email is required")
        @Email(message = "email is invalid")
        String email
) {
}
