package com.happysoup.backend.collection.repository;

import com.happysoup.backend.collection.model.SoupCollection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SoupCollectionRepository extends JpaRepository<SoupCollection, Long> {
    List<SoupCollection> findByUser_IdOrderByCreatedAtDesc(Long userId);

    Optional<SoupCollection> findByIdAndUser_Id(Long id, Long userId);
}
