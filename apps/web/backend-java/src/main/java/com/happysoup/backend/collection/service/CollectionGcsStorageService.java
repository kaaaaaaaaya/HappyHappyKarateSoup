package com.happysoup.backend.collection.service;

import com.google.cloud.storage.Blob;
import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class CollectionGcsStorageService {

    private static final Pattern DATA_URL_PATTERN = Pattern.compile("^data:([\\w!#$&^_.+-]+/[\\w!#$&^_.+-]+);base64,(.+)$");

    private final Storage storage;
    private final String bucketName;
    private final String objectPrefix;

    public CollectionGcsStorageService(
            Storage storage,
            @Value("${app.gcs.bucket-name:}") String bucketName,
            @Value("${app.gcs.object-prefix:collections}") String objectPrefix
    ) {
        this.storage = storage;
        this.bucketName = bucketName;
        this.objectPrefix = objectPrefix;
    }

    public ImageUploadResult uploadImage(Long userId, String imageDataUrl, Map<String, String> metadata) {
        ensureBucketConfigured();

        ParsedDataUrl parsed = parseDataUrl(imageDataUrl);
        String extension = extensionFromContentType(parsed.contentType());
        String objectPath = normalizePrefix(objectPrefix) + "/user-" + userId + "/" + UUID.randomUUID() + extension;

        BlobInfo blobInfo = BlobInfo.newBuilder(BlobId.of(bucketName, objectPath))
                .setContentType(parsed.contentType())
                .setMetadata(metadata)
                .build();

        storage.create(blobInfo, parsed.rawBytes());
        return new ImageUploadResult(objectPath, parsed.contentType());
    }

    public String uploadPayload(Long userId, String jsonPayload) {
        ensureBucketConfigured();

        String objectPath = normalizePrefix(objectPrefix) + "/user-" + userId + "/" + UUID.randomUUID() + ".json";
        BlobInfo blobInfo = BlobInfo.newBuilder(BlobId.of(bucketName, objectPath))
                .setContentType("application/json")
                .build();

        storage.create(blobInfo, jsonPayload.getBytes(StandardCharsets.UTF_8));
        return objectPath;
    }

    public byte[] downloadImage(String imageObjectPath) {
        ensureBucketConfigured();

        Blob blob = storage.get(BlobId.of(bucketName, imageObjectPath));
        if (blob == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "image not found");
        }

        return blob.getContent();
    }

    private ParsedDataUrl parseDataUrl(String dataUrl) {
        Matcher matcher = DATA_URL_PATTERN.matcher(dataUrl);
        if (!matcher.matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid imageDataUrl format");
        }

        String contentType = matcher.group(1);
        String base64 = matcher.group(2);

        try {
            byte[] decoded = Base64.getDecoder().decode(base64);
            return new ParsedDataUrl(contentType, decoded);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid imageDataUrl payload");
        }
    }

    private String extensionFromContentType(String contentType) {
        return switch (contentType) {
            case "image/png" -> ".png";
            case "image/jpeg" -> ".jpg";
            case "image/webp" -> ".webp";
            default -> ".bin";
        };
    }

    private String normalizePrefix(String value) {
        if (value == null || value.isBlank()) {
            return "collections";
        }

        String trimmed = value.trim();
        while (trimmed.startsWith("/")) {
            trimmed = trimmed.substring(1);
        }
        while (trimmed.endsWith("/")) {
            trimmed = trimmed.substring(0, trimmed.length() - 1);
        }

        return trimmed.isBlank() ? "collections" : trimmed;
    }

    private void ensureBucketConfigured() {
        if (bucketName == null || bucketName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "app.gcs.bucket-name is not configured");
        }
    }

    public record ImageUploadResult(String objectPath, String contentType) {
    }

    private record ParsedDataUrl(String contentType, byte[] rawBytes) {
    }
}
