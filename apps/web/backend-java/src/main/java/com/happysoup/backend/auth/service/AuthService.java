package com.happysoup.backend.auth.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.happysoup.backend.auth.dto.AuthResponse;
import com.happysoup.backend.auth.dto.RegisterResponse;
import com.happysoup.backend.auth.model.AppUser;
import com.happysoup.backend.auth.model.AuthProvider;
import com.happysoup.backend.auth.repository.AppUserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class AuthService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailVerificationService emailVerificationService;
    private final String googleClientId;
    private final long verificationTokenHours;

    public AuthService(
            AppUserRepository appUserRepository,
            PasswordEncoder passwordEncoder,
            EmailVerificationService emailVerificationService,
            @Value("${auth.google.client-id:}") String googleClientId,
            @Value("${app.auth.email-verification-token-hours:24}") long verificationTokenHours
    ) {
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailVerificationService = emailVerificationService;
        this.googleClientId = googleClientId;
        this.verificationTokenHours = verificationTokenHours;
    }

    @Transactional
    public RegisterResponse register(String username, String email, String password) {
        String normalizedEmail = normalizeEmail(email);
        String normalizedUsername = username.trim();

        AppUser existingEmailUser = appUserRepository.findByEmail(normalizedEmail).orElse(null);
        if (existingEmailUser != null) {
            if (!isPendingLocalUser(existingEmailUser)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "email already registered");
            }

            AppUser existingUsernameUser = appUserRepository.findByUsername(normalizedUsername).orElse(null);
            if (existingUsernameUser != null && !existingUsernameUser.getId().equals(existingEmailUser.getId())) {
                clearPendingUsernameOrReject(existingUsernameUser);
            }

            existingEmailUser.setUsername(normalizedUsername);
            existingEmailUser.setPasswordHash(passwordEncoder.encode(password));
            existingEmailUser.setProvider(AuthProvider.LOCAL);
            existingEmailUser.setEmailVerified(false);

            String rawToken = refreshEmailVerificationToken(existingEmailUser);
            AppUser saved = appUserRepository.save(existingEmailUser);
            emailVerificationService.sendVerificationEmail(saved, rawToken);
            return buildRegisterResponse(saved, rawToken);
        }

        AppUser existingUsernameUser = appUserRepository.findByUsername(normalizedUsername).orElse(null);
        if (existingUsernameUser != null) {
            clearPendingUsernameOrReject(existingUsernameUser);
        }

        AppUser user = new AppUser();
        user.setUsername(normalizedUsername);
        user.setEmail(normalizedEmail);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setProvider(AuthProvider.LOCAL);
        user.setEmailVerified(false);

        String rawToken = refreshEmailVerificationToken(user);
        AppUser saved = appUserRepository.save(user);
        emailVerificationService.sendVerificationEmail(saved, rawToken);

        return buildRegisterResponse(saved, rawToken);
    }

    private RegisterResponse buildRegisterResponse(AppUser saved, String rawToken) {
        return new RegisterResponse(
                saved.getEmail(),
                true,
                "verification email sent",
                emailVerificationService.getDevVerificationUrl(rawToken)
        );
    }

    @Transactional(readOnly = true)
    public AuthResponse login(String email, String password) {
        String normalizedEmail = normalizeEmail(email);

        AppUser user = appUserRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid credentials"));

        if (user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "use google login for this account");
        }

        if (!user.isEmailVerified()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "email is not verified");
        }

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid credentials");
        }

        return toResponse(user);
    }

    @Transactional
    public AuthResponse loginWithGoogle(String idTokenString) {
        GoogleIdToken.Payload payload = verifyGoogleIdToken(idTokenString);

        String subject = payload.getSubject();
        if (subject == null || subject.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid google token subject");
        }
        if (!Boolean.TRUE.equals(payload.getEmailVerified())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "google email is not verified");
        }
        if (payload.getEmail() == null || payload.getEmail().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "google email is missing");
        }

        String email = normalizeEmail(payload.getEmail());
        String displayName = payload.get("name") instanceof String name && !name.isBlank()
                ? name
                : email.split("@")[0];

        AppUser user = appUserRepository.findByGoogleSubject(subject)
                .orElseGet(() -> linkOrCreateGoogleUser(email, displayName, subject));

        return toResponse(user);
    }

    private AppUser linkOrCreateGoogleUser(String email, String displayName, String subject) {
        AppUser existingEmailUser = appUserRepository.findByEmail(email).orElse(null);
        if (existingEmailUser != null) {
            existingEmailUser.setGoogleSubject(subject);
            existingEmailUser.setProvider(AuthProvider.GOOGLE);
            markEmailVerified(existingEmailUser);
            return appUserRepository.save(existingEmailUser);
        }

        AppUser newUser = new AppUser();
        newUser.setEmail(email);
        newUser.setProvider(AuthProvider.GOOGLE);
        newUser.setGoogleSubject(subject);
        markEmailVerified(newUser);
        newUser.setUsername(buildUniqueUsername(displayName, email));

        return appUserRepository.save(newUser);
    }

    @Transactional
    public AuthResponse verifyEmail(String rawToken) {
        String tokenHash = hashToken(rawToken.trim());
        AppUser user = appUserRepository.findByEmailVerificationTokenHash(tokenHash)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid verification token"));

        LocalDateTime expiresAt = user.getEmailVerificationTokenExpiresAt();
        if (expiresAt == null || expiresAt.isBefore(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.GONE, "verification token expired");
        }

        markEmailVerified(user);
        AppUser saved = appUserRepository.save(user);
        return toResponse(saved);
    }

    @Transactional
    public RegisterResponse resendEmailVerification(String email) {
        String normalizedEmail = normalizeEmail(email);
        AppUser user = appUserRepository.findByEmail(normalizedEmail).orElse(null);

        if (user == null) {
            return new RegisterResponse(normalizedEmail, true, "verification email sent if account exists", null);
        }

        if (user.isEmailVerified()) {
            return new RegisterResponse(user.getEmail(), false, "email is already verified", null);
        }

        String rawToken = refreshEmailVerificationToken(user);
        AppUser saved = appUserRepository.save(user);
        emailVerificationService.sendVerificationEmail(saved, rawToken);

        return new RegisterResponse(
                saved.getEmail(),
                true,
                "verification email sent",
                emailVerificationService.getDevVerificationUrl(rawToken)
        );
    }

    private String buildUniqueUsername(String displayName, String email) {
        String base = displayName.trim().isBlank() ? email.split("@")[0] : displayName.trim();
        String candidate = sanitizeUsername(base);
        if (candidate.length() < 3) {
            candidate = "user";
        }

        String unique = candidate;
        int count = 1;
        while (appUserRepository.findByUsername(unique).isPresent()) {
            unique = candidate + count;
            count += 1;
        }

        return unique;
    }

    private boolean isPendingLocalUser(AppUser user) {
        return user.getProvider() == AuthProvider.LOCAL && !user.isEmailVerified();
    }

    private void clearPendingUsernameOrReject(AppUser existingUsernameUser) {
        if (!isPendingLocalUser(existingUsernameUser)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "username already taken");
        }
        appUserRepository.delete(existingUsernameUser);
        appUserRepository.flush();
    }

    private String sanitizeUsername(String source) {
        String onlyAllowed = source.replaceAll("[^a-zA-Z0-9._-]", "");
        if (onlyAllowed.isBlank()) {
            return "user";
        }
        if (onlyAllowed.length() > 50) {
            return onlyAllowed.substring(0, 50);
        }
        return onlyAllowed;
    }

    private GoogleIdToken.Payload verifyGoogleIdToken(String idTokenString) {
        if (googleClientId == null || googleClientId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "GOOGLE_OAUTH_CLIENT_ID is not configured");
        }

        GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), JacksonFactory.getDefaultInstance())
                .setAudience(List.of(googleClientId))
                .build();

        try {
            GoogleIdToken idToken = verifier.verify(idTokenString);
            if (idToken == null || idToken.getPayload() == null) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid google token");
            }
            return idToken.getPayload();
        } catch (GeneralSecurityException | IOException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "google token verification failed");
        }
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String refreshEmailVerificationToken(AppUser user) {
        String rawToken = generateToken();
        user.setEmailVerificationTokenHash(hashToken(rawToken));
        user.setEmailVerificationTokenExpiresAt(LocalDateTime.now().plusHours(verificationTokenHours));
        return rawToken;
    }

    private void markEmailVerified(AppUser user) {
        user.setEmailVerified(true);
        user.setEmailVerifiedAt(LocalDateTime.now());
        user.setEmailVerificationTokenHash(null);
        user.setEmailVerificationTokenExpiresAt(null);
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(rawToken.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }

    private AuthResponse toResponse(AppUser user) {
        return new AuthResponse(
                UUID.randomUUID().toString(),
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getProvider().name(),
                user.isEmailVerified()
        );
    }
}
