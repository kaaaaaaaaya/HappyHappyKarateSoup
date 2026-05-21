package com.happysoup.backend.ranking.service;

import com.happysoup.backend.auth.model.AppUser;
import com.happysoup.backend.auth.repository.AppUserRepository;
import com.happysoup.backend.collection.model.SoupCollection;
import com.happysoup.backend.collection.repository.SoupCollectionRepository;
import com.happysoup.backend.profile.model.MartialSession;
import com.happysoup.backend.profile.repository.MartialSessionRepository;
import com.happysoup.backend.ranking.dto.WeeklyCaloriesRankingEntry;
import com.happysoup.backend.ranking.dto.WeeklyScoreRankingEntry;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class RankingService {

    private final AppUserRepository appUserRepository;
    private final SoupCollectionRepository soupCollectionRepository;
    private final MartialSessionRepository martialSessionRepository;

    public RankingService(
            AppUserRepository appUserRepository,
            SoupCollectionRepository soupCollectionRepository,
            MartialSessionRepository martialSessionRepository
    ) {
        this.appUserRepository = appUserRepository;
        this.soupCollectionRepository = soupCollectionRepository;
        this.martialSessionRepository = martialSessionRepository;
    }

    @Transactional(readOnly = true)
    public List<WeeklyScoreRankingEntry> getWeeklyBestScoreRanking(Long viewerUserId, String difficulty, int days) {
        requireViewer(viewerUserId);

        int safeDays = Math.max(7, Math.min(days, 180));
        LocalDate today = LocalDate.now();
        LocalDate fromDate = today.minusDays(safeDays - 1L);
        LocalDateTime from = fromDate.atStartOfDay();
        LocalDateTime to = today.atTime(LocalTime.MAX);

        String normalizedDifficulty = normalizeDifficulty(difficulty);

        Map<Long, Integer> bestScoreByUserId = new HashMap<>();
        List<SoupCollection> collections = soupCollectionRepository.findByCreatedAtBetween(from, to);
        for (SoupCollection collection : collections) {
            Long userId = collection.getUser().getId();
            String diffValue = normalizeDifficulty(collection.getDifficultyValue());
            if (!normalizedDifficulty.equals(diffValue)) {
                continue;
            }
            int score = collection.getTotalScore() == null ? 0 : collection.getTotalScore();
            bestScoreByUserId.merge(userId, score, Math::max);
        }

        Map<Long, String> iconUrlByUserId = buildLatestSoupIconUrlByUserId();
        Map<Long, String> beltColorByUserId = buildBeltColorByUserId();

        List<AppUser> users = appUserRepository.findAll();
        List<WeeklyScoreRankingEntry> sorted = users.stream()
                .map(user -> new WeeklyScoreRankingEntry(
                        user.getId(),
                        user.getUsername(),
                        iconUrlByUserId.get(user.getId()),
                        beltColorByUserId.get(user.getId()),
                        0,
                        normalizedDifficulty,
                        bestScoreByUserId.getOrDefault(user.getId(), 0)
                ))
                .sorted(Comparator.comparingInt(WeeklyScoreRankingEntry::weeklyBestScore).reversed()
                        .thenComparing(WeeklyScoreRankingEntry::username))
                .toList();

        List<WeeklyScoreRankingEntry> ranked = applyDenseRankingForScores(sorted);
        return pinViewerFirst(ranked, viewerUserId);
    }

    @Transactional(readOnly = true)
    public List<WeeklyCaloriesRankingEntry> getWeeklyCaloriesRanking(Long viewerUserId, int days) {
        requireViewer(viewerUserId);

        int safeDays = Math.max(7, Math.min(days, 180));
        LocalDate today = LocalDate.now();
        LocalDate fromDate = today.minusDays(safeDays - 1L);
        LocalDateTime from = fromDate.atStartOfDay();
        LocalDateTime to = today.atTime(LocalTime.MAX);

        Map<Long, Double> energyByUserId = new HashMap<>();
        List<MartialSession> sessions = martialSessionRepository.findByPlayedAtBetween(from, to);
        for (MartialSession session : sessions) {
            Long userId = session.getUser().getId();
            double energy = session.getUsedEnergyKcal() == null ? 0.0 : session.getUsedEnergyKcal();
            energyByUserId.merge(userId, energy, Double::sum);
        }

        Map<Long, String> iconUrlByUserId = buildLatestSoupIconUrlByUserId();
        Map<Long, String> beltColorByUserId = buildBeltColorByUserId();

        List<AppUser> users = appUserRepository.findAll();
        List<WeeklyCaloriesRankingEntry> sorted = users.stream()
                .map(user -> new WeeklyCaloriesRankingEntry(
                        user.getId(),
                        user.getUsername(),
                        iconUrlByUserId.get(user.getId()),
                        beltColorByUserId.get(user.getId()),
                        0,
                        round1(energyByUserId.getOrDefault(user.getId(), 0.0))
                ))
                .sorted(Comparator.comparingDouble(WeeklyCaloriesRankingEntry::weeklyUsedEnergyKcal).reversed()
                        .thenComparing(WeeklyCaloriesRankingEntry::username))
                .toList();

        List<WeeklyCaloriesRankingEntry> ranked = applyDenseRankingForCalories(sorted);
        return pinViewerFirst(ranked, viewerUserId);
    }

    private void requireViewer(Long viewerUserId) {
        if (viewerUserId == null || !appUserRepository.existsById(viewerUserId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "user not found");
        }
    }

    private Map<Long, String> buildLatestSoupIconUrlByUserId() {
        Map<Long, String> iconUrlByUserId = new HashMap<>();
        // Reuse existing collection image endpoint for icons. Latest soup per user.
        // This is intentionally not week-limited.
        List<AppUser> users = appUserRepository.findAll();
        for (AppUser user : users) {
            List<SoupCollection> collections = soupCollectionRepository.findTop1ByUser_IdOrderByCreatedAtDesc(user.getId());
            if (collections.isEmpty()) {
                continue;
            }
            SoupCollection latest = collections.get(0);
            String url = "/api/collections/" + latest.getId() + "/image?userId=" + user.getId();
            iconUrlByUserId.put(user.getId(), url);
        }
        return iconUrlByUserId;
    }

    private Map<Long, String> buildBeltColorByUserId() {
        Map<Long, String> beltColorByUserId = new HashMap<>();
        List<AppUser> users = appUserRepository.findAll();
        for (AppUser user : users) {
            long soupCount = soupCollectionRepository.countByUser_Id(user.getId());
            beltColorByUserId.put(user.getId(), resolveBeltColor(soupCount));
        }
        return beltColorByUserId;
    }

    private String resolveBeltColor(long soupCount) {
        if (soupCount >= 100) return "黒";
        if (soupCount >= 80) return "茶";
        if (soupCount >= 60) return "赤";
        if (soupCount >= 40) return "黄";
        if (soupCount >= 25) return "緑";
        if (soupCount >= 10) return "紫";
        return "白";
    }

    private String normalizeDifficulty(String raw) {
        if (raw == null) {
            return "normal";
        }
        String trimmed = raw.trim().toLowerCase();
        return switch (trimmed) {
            case "easy", "normal", "hard" -> trimmed;
            default -> "normal";
        };
    }

    private double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private List<WeeklyScoreRankingEntry> applyDenseRankingForScores(List<WeeklyScoreRankingEntry> sorted) {
        int rank = 0;
        Integer prev = null;
        Map<Long, Integer> rankByUserId = new LinkedHashMap<>();
        for (WeeklyScoreRankingEntry entry : sorted) {
            int value = entry.weeklyBestScore();
            if (prev == null || value != prev) {
                rank += 1;
                prev = value;
            }
            rankByUserId.put(entry.userId(), rank);
        }

        return sorted.stream()
                .map(entry -> new WeeklyScoreRankingEntry(
                        entry.userId(),
                        entry.username(),
                        entry.soupIconUrl(),
                        entry.beltColor(),
                        rankByUserId.getOrDefault(entry.userId(), 0),
                        entry.difficulty(),
                        entry.weeklyBestScore()
                ))
                .toList();
    }

    private List<WeeklyCaloriesRankingEntry> applyDenseRankingForCalories(List<WeeklyCaloriesRankingEntry> sorted) {
        int rank = 0;
        Double prev = null;
        Map<Long, Integer> rankByUserId = new LinkedHashMap<>();
        for (WeeklyCaloriesRankingEntry entry : sorted) {
            double value = entry.weeklyUsedEnergyKcal();
            if (prev == null || Double.compare(value, prev) != 0) {
                rank += 1;
                prev = value;
            }
            rankByUserId.put(entry.userId(), rank);
        }

        return sorted.stream()
                .map(entry -> new WeeklyCaloriesRankingEntry(
                        entry.userId(),
                        entry.username(),
                        entry.soupIconUrl(),
                        entry.beltColor(),
                        rankByUserId.getOrDefault(entry.userId(), 0),
                        entry.weeklyUsedEnergyKcal()
                ))
                .toList();
    }

    private <T> List<T> pinViewerFirst(List<T> ranked, Long viewerUserId) {
        int index = -1;
        for (int i = 0; i < ranked.size(); i++) {
            T entry = ranked.get(i);
            long uid = entry instanceof WeeklyScoreRankingEntry e ? e.userId()
                    : entry instanceof WeeklyCaloriesRankingEntry e ? e.userId()
                    : -1;
            if (uid == viewerUserId) {
                index = i;
                break;
            }
        }
        if (index <= 0) {
            return ranked;
        }
        T viewer = ranked.get(index);
        return java.util.stream.Stream.concat(
                java.util.stream.Stream.of(viewer),
                ranked.stream().filter(e -> e != viewer)
        ).toList();
    }
}
