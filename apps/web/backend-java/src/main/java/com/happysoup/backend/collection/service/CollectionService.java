package com.happysoup.backend.collection.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.happysoup.backend.auth.model.AppUser;
import com.happysoup.backend.auth.repository.AppUserRepository;
import com.happysoup.backend.collection.dto.BeltRankResponse;
import com.happysoup.backend.collection.dto.CollectionItemResponse;
import com.happysoup.backend.collection.dto.CollectionSaveRequest;
import com.happysoup.backend.collection.dto.FlavorProfileDto;
import com.happysoup.backend.collection.model.SoupCollection;
import com.happysoup.backend.collection.repository.SoupCollectionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class CollectionService {
    private static final BeltThreshold[] BELT_THRESHOLDS = {
            new BeltThreshold(0, "白"),
            new BeltThreshold(10, "紫"),
            new BeltThreshold(25, "緑"),
            new BeltThreshold(40, "黄"),
            new BeltThreshold(60, "赤"),
            new BeltThreshold(80, "茶"),
            new BeltThreshold(100, "黒"),
    };

    private final AppUserRepository appUserRepository;
    private final SoupCollectionRepository soupCollectionRepository;
    private final CollectionGcsStorageService storageService;
    private final ObjectMapper objectMapper;

    public CollectionService(
            AppUserRepository appUserRepository,
            SoupCollectionRepository soupCollectionRepository,
            CollectionGcsStorageService storageService,
            ObjectMapper objectMapper
    ) {
        this.appUserRepository = appUserRepository;
        this.soupCollectionRepository = soupCollectionRepository;
        this.storageService = storageService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public CollectionItemResponse save(CollectionSaveRequest request) {
        AppUser user = appUserRepository.findById(request.userId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "user not found"));

        String rank = request.rank() != null ? request.rank().trim() : "C";
        Integer totalScore = request.totalScore() != null ? request.totalScore() : 0;
        List<String> ingredients = request.ingredients() != null ? request.ingredients() : List.of();
        FlavorProfileDto flavor = request.flavor() != null
                ? request.flavor()
                : new FlavorProfileDto(0, 0, 0, 0, 0, 0);

        Map<String, String> objectMetadata = Map.of(
                "userId", String.valueOf(user.getId()),
                "rank", rank,
                "totalScore", String.valueOf(totalScore)
        );

        CollectionGcsStorageService.ImageUploadResult image = storageService.uploadImage(user.getId(), request.imageDataUrl(), objectMetadata);

        String payloadJson = buildPayloadJson(
                ingredients,
                flavor,
                request.comment(),
                totalScore,
                rank
        );
        String payloadPath = storageService.uploadPayload(user.getId(), payloadJson);

        SoupCollection entity = new SoupCollection();
        entity.setUser(user);
        entity.setGcsImagePath(image.objectPath());
        entity.setGcsPayloadPath(payloadPath);
        entity.setImageContentType(image.contentType());
        entity.setIngredientsJson(writeJson(ingredients));
        entity.setFlavorJson(writeJson(flavor));
        entity.setCommentText(request.comment());
        entity.setTotalScore(totalScore);
        entity.setRankValue(rank);

        SoupCollection saved = soupCollectionRepository.save(entity);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<CollectionItemResponse> listByUserId(Long userId) {
        if (!appUserRepository.existsById(userId)) {
            return List.of();
        }

        return soupCollectionRepository.findByUser_IdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public ImagePayload loadImage(Long collectionId, Long userId) {
        SoupCollection collection = soupCollectionRepository.findByIdAndUser_Id(collectionId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "collection not found"));

        byte[] imageBytes = storageService.downloadImage(collection.getGcsImagePath());
        return new ImagePayload(collection.getImageContentType(), imageBytes);
    }

    @Transactional(readOnly = true)
    public BeltRankResponse getBeltRank(Long userId) {
        if (!appUserRepository.existsById(userId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "user not found");
        }

        long soupCount = soupCollectionRepository.countByUser_Id(userId);
        BeltThreshold current = BELT_THRESHOLDS[0];
        BeltThreshold next = null;

        for (int i = 0; i < BELT_THRESHOLDS.length; i++) {
            BeltThreshold candidate = BELT_THRESHOLDS[i];
            if (soupCount >= candidate.threshold()) {
                current = candidate;
                next = (i + 1 < BELT_THRESHOLDS.length) ? BELT_THRESHOLDS[i + 1] : null;
            }
        }

        Integer nextThreshold = next != null ? next.threshold() : null;
        Integer remainingToNext = next != null ? (int) Math.max(0, next.threshold() - soupCount) : null;

        return new BeltRankResponse(
                userId,
                soupCount,
                current.color(),
                current.threshold(),
                next != null ? next.color() : null,
                nextThreshold,
                remainingToNext
        );
    }

    private CollectionItemResponse toResponse(SoupCollection collection) {
        Long userId = collection.getUser().getId();
        String imageUrl = "/api/collections/" + collection.getId() + "/image?userId=" + userId;

        return new CollectionItemResponse(
                collection.getId(),
                imageUrl,
                collection.getTotalScore(),
                collection.getRankValue(),
                collection.getCommentText(),
                readIngredients(collection.getIngredientsJson()),
                readFlavor(collection.getFlavorJson()),
                collection.getCreatedAt()
        );
    }

    private String buildPayloadJson(
            List<String> ingredients,
            FlavorProfileDto flavor,
            String comment,
            Integer totalScore,
            String rank
    ) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("ingredients", ingredients);
        payload.put("flavor", flavor);
        payload.put("comment", comment);
        payload.put("totalScore", totalScore);
        payload.put("rank", rank);
        payload.put("savedAt", LocalDateTime.now().toString());
        return writeJson(payload);
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "failed to serialize collection");
        }
    }

    private List<String> readIngredients(String ingredientsJson) {
        if (ingredientsJson == null || ingredientsJson.isBlank()) {
            return List.of();
        }

        try {
            return objectMapper.readValue(ingredientsJson, new TypeReference<List<String>>() {
            });
        } catch (JsonProcessingException e) {
            return List.of();
        }
    }

    private FlavorProfileDto readFlavor(String flavorJson) {
        if (flavorJson == null || flavorJson.isBlank()) {
            return new FlavorProfileDto(0, 0, 0, 0, 0, 0);
        }

        try {
            return objectMapper.readValue(flavorJson, FlavorProfileDto.class);
        } catch (JsonProcessingException e) {
            return new FlavorProfileDto(0, 0, 0, 0, 0, 0);
        }
    }

    public record ImagePayload(String contentType, byte[] bytes) {
    }

    private record BeltThreshold(int threshold, String color) {
    }
}
