package com.happysoup.backend.profile.repository;

import com.happysoup.backend.profile.model.MartialSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface MartialSessionRepository extends JpaRepository<MartialSession, Long> {

    List<MartialSession> findByUser_IdAndPlayedAtBetweenOrderByPlayedAtAsc(
            Long userId,
            LocalDateTime from,
            LocalDateTime to
    );
}
