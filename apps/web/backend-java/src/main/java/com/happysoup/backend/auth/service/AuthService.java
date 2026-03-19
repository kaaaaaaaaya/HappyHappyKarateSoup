package com.happysoup.backend.auth.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.happysoup.backend.auth.dto.AuthResponse;
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
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class AuthService {

    private final AppUserRepository appUserRepository;
    private final PasswordEncoder passwordEncoder;
    private final String googleClientId;

    public AuthService(
            AppUserRepository appUserRepository,
            PasswordEncoder passwordEncoder,
            @Value("${auth.google.client-id:}") String googleClientId
    ) {
        this.appUserRepository = appUserRepository;
        this.passwordEncoder = passwordEncoder;
        this.googleClientId = googleClientId;
    }

    @Transactional
    public AuthResponse register(String username, String email, String password) {
        String normalizedEmail = normalizeEmail(email);
        String normalizedUsername = username.trim();

        if (appUserRepository.findByEmail(normalizedEmail).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "email already registered");
        }

        if (appUserRepository.findByUsername(normalizedUsername).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "username already taken");
        }

        AppUser user = new AppUser();
        user.setUsername(normalizedUsername);
        user.setEmail(normalizedEmail);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setProvider(AuthProvider.LOCAL);

        AppUser saved = appUserRepository.save(user);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(String email, String password) {
        String normalizedEmail = normalizeEmail(email);

        AppUser user = appUserRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid credentials"));

        if (user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "use google login for this account");
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
            return appUserRepository.save(existingEmailUser);
        }

        AppUser newUser = new AppUser();
        newUser.setEmail(email);
        newUser.setProvider(AuthProvider.GOOGLE);
        newUser.setGoogleSubject(subject);
        newUser.setUsername(buildUniqueUsername(displayName, email));

        return appUserRepository.save(newUser);
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

    private AuthResponse toResponse(AppUser user) {
        return new AuthResponse(
                UUID.randomUUID().toString(),
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getProvider().name()
        );
    }
}
