package com.happysoup.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

// [EN] Entry point for HappyHappyKarateSoup backend service.
// [JA] HappyHappyKarateSoup バックエンドサービスのエントリーポイントです。
@SpringBootApplication(scanBasePackages = {"com.happysoup.backend", "com.happykaratesoup.backend"})
public class BackendJavaApplication {

    // [EN] Bootstraps the Spring Boot application.
    // [JA] Spring Boot アプリケーションを起動します。
    public static void main(String[] args) {
        SpringApplication.run(BackendJavaApplication.class, args);
    }
}
