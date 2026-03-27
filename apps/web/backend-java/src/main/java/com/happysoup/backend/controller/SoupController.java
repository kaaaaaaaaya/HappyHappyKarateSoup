package com.happysoup.backend.controller;

import com.happysoup.backend.model.request.SoupGenerateRequest;
import com.happysoup.backend.model.response.SoupGenerateResponse;
import com.happysoup.backend.service.SoupGenerationService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

// [EN] REST endpoints for soup generation flow.
// [JA] スープ生成フローを提供する REST エンドポイントです。
@RestController
@RequestMapping("/api/soup")
public class SoupController {

    private final SoupGenerationService soupGenerationService;

    public SoupController(SoupGenerationService soupGenerationService) {
        this.soupGenerationService = soupGenerationService;
    }

    // [EN] Health check endpoint.
    // [JA] ヘルスチェック用エンドポイントです。
    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }

    // [EN] Receives ingredients and returns generated soup outputs.
    // [JA] 材料を受け取り、生成結果を返します。
    @PostMapping("/generate")
    public SoupGenerateResponse generate(@Valid @RequestBody SoupGenerateRequest request) {
        return soupGenerationService.generate(
                request.ingredients(),
                request.referenceImageDataUrl(),
                request.selectedDifficulty()
        );
    }
}
