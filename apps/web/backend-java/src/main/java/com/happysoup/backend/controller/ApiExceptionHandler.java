package com.happysoup.backend.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

// [EN] Converts internal exceptions into API-friendly JSON errors.
// [JA] 例外を API で扱いやすい JSON エラーに変換します。
@RestControllerAdvice
public class ApiExceptionHandler {

    // [EN] Handles validation failures.
    // [JA] バリデーションエラーを処理します。
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
        return ResponseEntity.badRequest().body(Map.of(
                "error", "INVALID_REQUEST",
                "message", ex.getBindingResult().getAllErrors().stream()
                        .findFirst()
                        .map(err -> err.getDefaultMessage() == null ? "Validation failed" : err.getDefaultMessage())
                        .orElse("Validation failed")
        ));
    }

    // [EN] Handles unexpected failures.
    // [JA] 想定外エラーを処理します。
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGeneric(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "INTERNAL_ERROR",
                "message", ex.getMessage() == null ? "Unexpected error" : ex.getMessage()
        ));
    }
}
