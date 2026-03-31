package com.happysoup.backend.collection.repository;

import com.happysoup.backend.collection.model.SoupCollection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface SoupCollectionRepository extends JpaRepository<SoupCollection, Long> {
    List<SoupCollection> findByUser_IdOrderByCreatedAtDesc(Long userId);

    long countByUser_Id(Long userId);

    long countByUser_IdAndCreatedAtBetween(Long userId, LocalDateTime from, LocalDateTime to);

    Optional<SoupCollection> findByIdAndUser_Id(Long id, Long userId);
}
