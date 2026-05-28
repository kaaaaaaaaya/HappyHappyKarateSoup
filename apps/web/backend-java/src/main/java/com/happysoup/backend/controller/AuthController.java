package com.happysoup.backend.controller;

import com.happysoup.backend.auth.dto.AuthResponse;
import com.happysoup.backend.auth.dto.GoogleLoginRequest;
import com.happysoup.backend.auth.dto.LoginRequest;
import com.happysoup.backend.auth.dto.RegisterResponse;
import com.happysoup.backend.auth.dto.RegisterRequest;
import com.happysoup.backend.auth.dto.ResendVerificationRequest;
import com.happysoup.backend.auth.dto.VerifyEmailRequest;
import com.happysoup.backend.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public RegisterResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request.username(), request.email(), request.password());
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request.email(), request.password());
    }

    @PostMapping("/google")
    public AuthResponse googleLogin(@Valid @RequestBody GoogleLoginRequest request) {
        return authService.loginWithGoogle(request.idToken());
    }

    @PostMapping("/verify-email")
    public AuthResponse verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        return authService.verifyEmail(request.token());
    }

    @PostMapping("/resend-verification")
    public RegisterResponse resendVerification(@Valid @RequestBody ResendVerificationRequest request) {
        return authService.resendEmailVerification(request.email());
    }
}
