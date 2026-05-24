package com.happysoup.backend.profile.service;

import com.happysoup.backend.auth.model.AppUser;
import com.happysoup.backend.auth.repository.AppUserRepository;
import com.happysoup.backend.collection.repository.SoupCollectionRepository;
import com.happysoup.backend.profile.dto.MartialSessionResponse;
import com.happysoup.backend.profile.dto.MartialSessionSaveRequest;
import com.happysoup.backend.profile.dto.ProfileMartialDataResponse;
import com.happysoup.backend.profile.model.MartialSession;
import com.happysoup.backend.profile.repository.MartialSessionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ProfileMartialService {

    private static final BeltThreshold[] BELT_THRESHOLDS = {
            new BeltThreshold(1, 0, "白"),
            new BeltThreshold(2, 10, "紫"),
            new BeltThreshold(3, 25, "緑"),
            new BeltThreshold(4, 40, "黄"),
            new BeltThreshold(5, 60, "赤"),
            new BeltThreshold(6, 80, "茶"),
            new BeltThreshold(7, 100, "黒"),
    };

    private final AppUserRepository appUserRepository;
    private final MartialSessionRepository martialSessionRepository;
    private final SoupCollectionRepository soupCollectionRepository;

    public ProfileMartialService(
            AppUserRepository appUserRepository,
            MartialSessionRepository martialSessionRepository,
            SoupCollectionRepository soupCollectionRepository
    ) {
        this.appUserRepository = appUserRepository;
        this.martialSessionRepository = martialSessionRepository;
        this.soupCollectionRepository = soupCollectionRepository;
    }

    @Transactional
    public MartialSessionResponse saveMartialSession(MartialSessionSaveRequest request) {
        AppUser user = appUserRepository.findById(request.userId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "user not found"));

        MartialSession entity = new MartialSession();
        entity.setUser(user);
        entity.setPlayedAt(request.playedAt());
        entity.setPunchCount(request.punchCount());
        entity.setChopCount(request.chopCount());
        entity.setUsedEnergyKcal(sanitizeNonNegative(request.usedEnergyKcal()));

        MartialSession saved = martialSessionRepository.save(entity);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public ProfileMartialDataResponse getMartialData(Long userId, int days) {
        if (!appUserRepository.existsById(userId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "user not found");
        }

        int safeDays = Math.max(7, Math.min(days, 180));
        LocalDate today = LocalDate.now();
        LocalDate fromDate = today.minusDays(safeDays - 1L);
        LocalDateTime from = fromDate.atStartOfDay();
        LocalDateTime to = today.atTime(LocalTime.MAX);

        List<MartialSession> sessions = martialSessionRepository
                .findByUser_IdAndPlayedAtBetweenOrderByPlayedAtAsc(userId, from, to);

        int todayPunchCount = 0;
        int todayChopCount = 0;
        double todayUsedEnergyKcal = 0.0;
        double weeklyUsedEnergyKcal = 0.0;

        Map<LocalDate, Double> dailyEnergyMap = new LinkedHashMap<>();
        for (int i = safeDays - 1; i >= 0; i--) {
            dailyEnergyMap.put(today.minusDays(i), 0.0);
        }

        for (MartialSession session : sessions) {
            LocalDate day = session.getPlayedAt().toLocalDate();
            double energy = zeroIfNull(session.getUsedEnergyKcal());
            dailyEnergyMap.put(day, zeroIfNull(dailyEnergyMap.get(day)) + energy);
            weeklyUsedEnergyKcal += energy;

            if (day.equals(today)) {
                todayPunchCount += zeroIfNull(session.getPunchCount());
                todayChopCount += zeroIfNull(session.getChopCount());
                todayUsedEnergyKcal += energy;
            }
        }

        List<ProfileMartialDataResponse.DailyEnergyPoint> weeklyDailyEnergyTrend = new ArrayList<>();
        for (Map.Entry<LocalDate, Double> entry : dailyEnergyMap.entrySet()) {
            weeklyDailyEnergyTrend.add(new ProfileMartialDataResponse.DailyEnergyPoint(
                    entry.getKey().toString(),
                    round1(entry.getValue())
            ));
        }

        long totalSoupCount = soupCollectionRepository.countByUser_Id(userId);
        long todayGeneratedSoupCount = soupCollectionRepository.countByUser_IdAndCreatedAtBetween(
                userId,
                today.atStartOfDay(),
                today.atTime(LocalTime.MAX)
        );
        long weeklyGeneratedSoupCount = soupCollectionRepository.countByUser_IdAndCreatedAtBetween(
                userId,
                fromDate.atStartOfDay(),
                today.atTime(LocalTime.MAX)
        );

        BeltRank beltRank = resolveBeltRank(totalSoupCount);

        return new ProfileMartialDataResponse(
                userId,
                beltRank.level(),
                beltRank.color(),
                totalSoupCount,
                todayGeneratedSoupCount,
                round1(todayUsedEnergyKcal),
                todayPunchCount,
                todayChopCount,
                weeklyGeneratedSoupCount,
                round1(weeklyUsedEnergyKcal),
                weeklyDailyEnergyTrend
        );
    }

    private BeltRank resolveBeltRank(long totalSoupCount) {
        BeltThreshold current = BELT_THRESHOLDS[0];
        for (BeltThreshold threshold : BELT_THRESHOLDS) {
            if (totalSoupCount >= threshold.threshold()) {
                current = threshold;
            }
        }
        return new BeltRank(current.level(), current.color());
    }

    private MartialSessionResponse toResponse(MartialSession session) {
        return new MartialSessionResponse(
                session.getId(),
                session.getUser().getId(),
                session.getPlayedAt(),
                session.getPunchCount(),
                session.getChopCount(),
                session.getUsedEnergyKcal()
        );
    }

    private int zeroIfNull(Integer value) {
        return value == null ? 0 : value;
    }

    private Double sanitizeNonNegative(Double value) {
        if (value == null) {
            return null;
        }
        if (Double.isNaN(value) || Double.isInfinite(value) || value < 0) {
            return null;
        }
        return value;
    }

    private double zeroIfNull(Double value) {
        return value == null ? 0.0 : value;
    }

    private double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private record BeltThreshold(int level, int threshold, String color) {}

    private record BeltRank(int level, String color) {
    }
}
