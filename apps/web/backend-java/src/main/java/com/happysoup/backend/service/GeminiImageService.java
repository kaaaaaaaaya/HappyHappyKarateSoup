package com.happysoup.backend.service;

import com.happysoup.backend.client.GeminiClient;
import com.happysoup.backend.config.GeminiProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.util.StreamUtils;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Iterator;
import java.util.List;

// [EN] Uses Gemini to generate final soup image as data URL.
// [JA] 完成スープ画像を Gemini で生成し Data URL 形式で返します。
@Service
public class GeminiImageService {

    private static final Logger LOG = LoggerFactory.getLogger(GeminiImageService.class);
    private static final int MAX_IMAGE_SIZE = 512;
    private static final float JPEG_QUALITY = 0.75f;

    private final GeminiClient geminiClient;
    private final GeminiProperties properties;
    private final Resource imagePromptResource;

    public GeminiImageService(
            GeminiClient geminiClient,
            GeminiProperties properties,
            @Value("classpath:prompts/image_prompt.txt") Resource imagePromptResource
    ) {
        this.geminiClient = geminiClient;
        this.properties = properties;
        this.imagePromptResource = imagePromptResource;
    }

    // [EN] Generates image prompt and image data URL.
    // [JA] 画像プロンプトを作り、画像 Data URL を生成します。
    public GeneratedImage generateSoupImage(List<String> ingredients) {
        return generateSoupImage(ingredients, null, null);
    }

    // [EN] Generates image prompt and image data URL with optional reference image.
    // [JA] 任意の参照画像を使って、画像プロンプトと画像 Data URL を生成します。
    public GeneratedImage generateSoupImage(List<String> ingredients, String referenceImageDataUrl) {
        return generateSoupImage(ingredients, referenceImageDataUrl, null);
    }

    // [EN] Generates image prompt and image data URL with optional reference image and difficulty.
    // [JA] 任意の参照画像と難易度を使って、画像プロンプトと画像 Data URL を生成します。
    public GeneratedImage generateSoupImage(List<String> ingredients, String referenceImageDataUrl, String selectedDifficulty) {
        String promptTemplate = readPromptTemplate();
        DifficultyProfile difficulty = DifficultyProfile.from(selectedDifficulty, ingredients);
        String imagePrompt = promptTemplate
                .replace("{{ingredients}}", String.join(", ", ingredients))
                .replace("{{selectedDifficulty}}", difficulty.difficultyLabel)
                .replace("{{baseIngredient}}", difficulty.baseIngredientLabel);

        String base64;
        try {
            base64 = geminiClient.generateImageBase64(properties.imageModel(), imagePrompt, referenceImageDataUrl);
        } catch (RuntimeException ex) {
            // [EN] Fallback for unavailable image model: continue API response without image.
            // [JA] 画像モデルが利用不可の場合は、画像なしでAPIレスポンスを継続します。
            String message = ex.getMessage() == null ? "" : ex.getMessage();
            if (message.contains("404 Not Found") || message.contains("400 Bad Request")) {
                LOG.warn("Gemini image generation fallback: model={} message={}", properties.imageModel(), message);
                base64 = "";
            } else {
                throw ex;
            }
        }

        if (base64.isBlank()) {
            LOG.warn("Gemini image inline data is empty: model={}", properties.imageModel());
        }

        OptimizedImage optimized = optimizeImage(base64);
        String dataUrl = optimized.base64().isBlank()
                ? ""
                : "data:%s;base64,%s".formatted(optimized.mimeType(), optimized.base64());

        return new GeneratedImage(dataUrl, imagePrompt);
    }

    // [EN] Lightweight helper carrying difficulty/base labels for prompt interpolation.
    // [JA] プロンプト置換用の難易度/ベース情報を保持する補助オブジェクトです。
    private static final class DifficultyProfile {
        private final String difficultyLabel;
        private final String baseIngredientLabel;

        private DifficultyProfile(String difficultyLabel, String baseIngredientLabel) {
            this.difficultyLabel = difficultyLabel;
            this.baseIngredientLabel = baseIngredientLabel;
        }

        private static DifficultyProfile from(String selectedDifficulty, List<String> ingredients) {
            String normalizedDifficulty = normalize(selectedDifficulty);
            if (normalizedDifficulty.isBlank()) {
                normalizedDifficulty = inferDifficultyFromIngredients(ingredients);
            }

            return switch (normalizedDifficulty) {
                case "easy" -> new DifficultyProfile("easy", "miso");
                case "hard" -> new DifficultyProfile("hard", "mala");
                default -> new DifficultyProfile("normal", "tomato");
            };
        }

        private static String inferDifficultyFromIngredients(List<String> ingredients) {
            if (ingredients == null || ingredients.isEmpty()) {
                return "normal";
            }
            for (String ingredient : ingredients) {
                String token = normalize(ingredient);
                if (token.contains("mala") || token.contains("麻辣") || token.contains("malatang")) {
                    return "hard";
                }
                if (token.contains("miso") || token.contains("味噌")) {
                    return "easy";
                }
                if (token.contains("tomato") || token.contains("トマト")) {
                    return "normal";
                }
            }
            return "normal";
        }

        private static String normalize(String value) {
            return value == null ? "" : value.trim().toLowerCase();
        }
    }

    // [EN] Optimizes generated image for transport by resizing and JPEG compression.
    // [JA] 転送量削減のため、画像をリサイズし JPEG 圧縮します。
    private OptimizedImage optimizeImage(String base64) {
        if (base64 == null || base64.isBlank()) {
            return new OptimizedImage("image/png", "");
        }

        byte[] originalBytes;
        try {
            originalBytes = Base64.getDecoder().decode(base64);
        } catch (IllegalArgumentException ex) {
            LOG.warn("Failed to decode Gemini image base64", ex);
            return new OptimizedImage("image/png", "");
        }

        try {
            BufferedImage originalImage = ImageIO.read(new ByteArrayInputStream(originalBytes));
            if (originalImage == null) {
                return new OptimizedImage(detectMimeType(originalBytes), base64);
            }

            BufferedImage resized = resizeIfNeeded(originalImage, MAX_IMAGE_SIZE);
            byte[] jpegBytes = writeJpeg(resized, JPEG_QUALITY);

            if (jpegBytes.length < originalBytes.length) {
                LOG.info("Gemini image optimized: {} -> {} bytes", originalBytes.length, jpegBytes.length);
                return new OptimizedImage("image/jpeg", Base64.getEncoder().encodeToString(jpegBytes));
            }

            return new OptimizedImage(detectMimeType(originalBytes), base64);
        } catch (IOException | RuntimeException ex) {
            LOG.warn("Failed to optimize generated image; using original bytes", ex);
            return new OptimizedImage(detectMimeType(originalBytes), base64);
        }
    }

    // [EN] Resizes image while preserving aspect ratio when larger than max size.
    // [JA] 最大辺が上限を超える場合にアスペクト比を維持して縮小します。
    private BufferedImage resizeIfNeeded(BufferedImage source, int maxSize) {
        int srcW = source.getWidth();
        int srcH = source.getHeight();
        int longest = Math.max(srcW, srcH);
        if (longest <= maxSize) {
            return source;
        }

        double scale = (double) maxSize / longest;
        int dstW = Math.max(1, (int) Math.round(srcW * scale));
        int dstH = Math.max(1, (int) Math.round(srcH * scale));

        BufferedImage resized = new BufferedImage(dstW, dstH, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = resized.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.drawImage(source, 0, 0, dstW, dstH, null);
        } finally {
            g.dispose();
        }
        return resized;
    }

    // [EN] Writes image to JPEG bytes with specified compression quality.
    // [JA] 指定品質で JPEG バイト列へエンコードします。
    private byte[] writeJpeg(BufferedImage image, float quality) throws IOException {
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpeg");
        if (!writers.hasNext()) {
            throw new IllegalStateException("JPEG writer is not available");
        }

        ImageWriter writer = writers.next();
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        try (ImageOutputStream ios = ImageIO.createImageOutputStream(baos)) {
            writer.setOutput(ios);
            ImageWriteParam param = writer.getDefaultWriteParam();
            if (param.canWriteCompressed()) {
                param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                param.setCompressionQuality(quality);
            }
            writer.write(null, new IIOImage(image, null, null), param);
        } finally {
            writer.dispose();
        }
        return baos.toByteArray();
    }

    // [EN] Detects common image MIME type from magic bytes.
    // [JA] マジックバイトから代表的な画像MIMEタイプを判定します。
    private String detectMimeType(byte[] bytes) {
        if (bytes.length >= 3
                && (bytes[0] & 0xFF) == 0xFF
                && (bytes[1] & 0xFF) == 0xD8
                && (bytes[2] & 0xFF) == 0xFF) {
            return "image/jpeg";
        }
        if (bytes.length >= 8
                && (bytes[0] & 0xFF) == 0x89
                && bytes[1] == 0x50
                && bytes[2] == 0x4E
                && bytes[3] == 0x47) {
            return "image/png";
        }
        return "image/png";
    }

    // [EN] Reads prompt template text from classpath resource.
    // [JA] classpath 上のプロンプトテンプレートを読み込みます。
    private String readPromptTemplate() {
        try {
            return StreamUtils.copyToString(imagePromptResource.getInputStream(), StandardCharsets.UTF_8);
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to read image prompt template", ex);
        }
    }

    // [EN] Value object containing generated image outputs.
    // [JA] 画像生成結果をまとめる値オブジェクトです。
    public record GeneratedImage(String imageDataUrl, String imagePrompt) {

    }

    // [EN] Internal value object for image payload and MIME type.
    // [JA] 画像データとMIMEタイプを保持する内部用値オブジェクトです。
    private record OptimizedImage(String mimeType, String base64) {

    }
}
