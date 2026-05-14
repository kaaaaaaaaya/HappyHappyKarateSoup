package com.happysoup.backend.collection.controller;

import com.happysoup.backend.collection.dto.CollectionItemResponse;
import com.happysoup.backend.collection.dto.CollectionSaveRequest;
import com.happysoup.backend.collection.dto.BeltRankResponse;
import com.happysoup.backend.collection.service.CollectionService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/collections")
public class CollectionController {

    private final CollectionService collectionService;

    public CollectionController(CollectionService collectionService) {
        this.collectionService = collectionService;
    }

    @PostMapping
    public CollectionItemResponse save(@Valid @RequestBody CollectionSaveRequest request) {
        return collectionService.save(request);
    }

    @GetMapping
    public List<CollectionItemResponse> list(@RequestParam Long userId) {
        return collectionService.listByUserId(userId);
    }

    @GetMapping("/rank")
    public BeltRankResponse rank(@RequestParam Long userId) {
        return collectionService.getBeltRank(userId);
    }

    @GetMapping("/{collectionId}/image")
    public ResponseEntity<byte[]> image(@PathVariable Long collectionId, @RequestParam Long userId) {
        CollectionService.ImagePayload payload = collectionService.loadImage(collectionId, userId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(payload.contentType()))
                .body(payload.bytes());
    }
}
