package com.happysoup.backend.profile.model;

import com.happysoup.backend.auth.model.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "martial_sessions")
public class MartialSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Column(name = "played_at", nullable = false)
    private LocalDateTime playedAt;

    @Column(name = "punch_count", nullable = false)
    private Integer punchCount;

    @Column(name = "chop_count", nullable = false)
    private Integer chopCount;

    @Column(name = "used_energy_kcal")
    private Double usedEnergyKcal;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public AppUser getUser() {
        return user;
    }

    public void setUser(AppUser user) {
        this.user = user;
    }

    public LocalDateTime getPlayedAt() {
        return playedAt;
    }

    public void setPlayedAt(LocalDateTime playedAt) {
        this.playedAt = playedAt;
    }

    public Integer getPunchCount() {
        return punchCount;
    }

    public void setPunchCount(Integer punchCount) {
        this.punchCount = punchCount;
    }

    public Integer getChopCount() {
        return chopCount;
    }

    public void setChopCount(Integer chopCount) {
        this.chopCount = chopCount;
    }

    public Double getUsedEnergyKcal() {
        return usedEnergyKcal;
    }

    public void setUsedEnergyKcal(Double usedEnergyKcal) {
        this.usedEnergyKcal = usedEnergyKcal;
    }
}
