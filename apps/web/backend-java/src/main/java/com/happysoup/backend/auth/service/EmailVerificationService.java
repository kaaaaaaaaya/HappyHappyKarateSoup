package com.happysoup.backend.auth.service;

import com.happysoup.backend.auth.model.AppUser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Properties;

@Service
public class EmailVerificationService {

    private static final Logger log = LoggerFactory.getLogger(EmailVerificationService.class);

    private final String webBaseUrl;
    private final String fromAddress;
    private final String smtpHost;
    private final int smtpPort;
    private final String smtpUsername;
    private final String smtpPassword;
    private final boolean smtpStartTls;
    private final boolean smtpSsl;
    private final boolean exposeVerificationLink;

    public EmailVerificationService(
            @Value("${app.web.base-url:http://localhost:8081}") String webBaseUrl,
            @Value("${app.mail.from:noreply@happy-happy-karate-soup.local}") String fromAddress,
            @Value("${app.mail.smtp.host:}") String smtpHost,
            @Value("${app.mail.smtp.port:587}") String smtpPort,
            @Value("${app.mail.smtp.username:}") String smtpUsername,
            @Value("${app.mail.smtp.password:}") String smtpPassword,
            @Value("${app.mail.smtp.starttls:true}") String smtpStartTls,
            @Value("${app.mail.smtp.ssl:false}") String smtpSsl,
            @Value("${app.auth.expose-verification-link:false}") String exposeVerificationLink
    ) {
        this.webBaseUrl = stripTrailingSlash(webBaseUrl);
        this.fromAddress = fromAddress == null || fromAddress.isBlank()
                ? "noreply@happy-happy-karate-soup.local"
                : fromAddress;
        this.smtpHost = smtpHost;
        this.smtpPort = parsePort(smtpPort);
        this.smtpUsername = smtpUsername;
        this.smtpPassword = smtpPassword;
        this.smtpStartTls = parseBoolean(smtpStartTls, true);
        this.smtpSsl = parseBoolean(smtpSsl, false);
        this.exposeVerificationLink = parseBoolean(exposeVerificationLink, false);
    }

    public void sendVerificationEmail(AppUser user, String rawToken) {
        String verificationUrl = buildVerificationUrl(rawToken);
        if (smtpHost == null || smtpHost.isBlank()) {
            log.warn("SMTP is not configured. Email verification link for {}: {}", user.getEmail(), verificationUrl);
            return;
        }

        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(smtpHost);
        sender.setPort(smtpPort);
        sender.setDefaultEncoding(StandardCharsets.UTF_8.name());
        if (smtpUsername != null && !smtpUsername.isBlank()) {
            sender.setUsername(smtpUsername);
            sender.setPassword(smtpPassword);
        }

        Properties properties = sender.getJavaMailProperties();
        properties.put("mail.smtp.auth", Boolean.toString(smtpUsername != null && !smtpUsername.isBlank()));
        properties.put("mail.smtp.starttls.enable", Boolean.toString(smtpStartTls));
        properties.put("mail.smtp.ssl.enable", Boolean.toString(smtpSsl));

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(user.getEmail());
        message.setSubject("Happy Happy Karate Soup email verification");
        message.setText("""
                Happy Happy Karate Soup に登録してくれてありがとうございます。

                以下のリンクを開いてメールアドレスを確認してください。
                %s

                このリンクは24時間で期限切れになります。
                """.formatted(verificationUrl));
        sender.send(message);
    }

    public String getDevVerificationUrl(String rawToken) {
        if (!exposeVerificationLink) {
            return null;
        }
        return buildVerificationUrl(rawToken);
    }

    private String buildVerificationUrl(String rawToken) {
        String encodedToken = URLEncoder.encode(rawToken, StandardCharsets.UTF_8);
        return webBaseUrl + "/verify-email?token=" + encodedToken;
    }

    private String stripTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return "http://localhost:8081";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private int parsePort(String raw) {
        if (raw == null || raw.isBlank()) {
            return 587;
        }
        return Integer.parseInt(raw);
    }

    private boolean parseBoolean(String raw, boolean defaultValue) {
        if (raw == null || raw.isBlank()) {
            return defaultValue;
        }
        return Boolean.parseBoolean(raw);
    }
}
