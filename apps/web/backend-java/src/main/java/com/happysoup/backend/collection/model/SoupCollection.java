package com.happysoup.backend.collection.model;

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
@Table(name = "soup_collections")
public class SoupCollection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Column(name = "gcs_image_path", nullable = false, length = 512)
    private String gcsImagePath;

    @Column(name = "gcs_payload_path", nullable = false, length = 512)
    private String gcsPayloadPath;

    @Column(name = "image_content_type", nullable = false, length = 100)
    private String imageContentType;

    @Column(name = "ingredients_json", columnDefinition = "TEXT")
    private String ingredientsJson;

    @Column(name = "flavor_json", columnDefinition = "TEXT")
    private String flavorJson;

    @Column(name = "comment_text", columnDefinition = "TEXT")
    private String commentText;

    @Column(name = "total_score")
    private Integer totalScore;

    @Column(name = "rank_value", length = 12)
    private String rankValue;

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

    public String getGcsImagePath() {
        return gcsImagePath;
    }

    public void setGcsImagePath(String gcsImagePath) {
        this.gcsImagePath = gcsImagePath;
    }

    public String getGcsPayloadPath() {
        return gcsPayloadPath;
    }

    public void setGcsPayloadPath(String gcsPayloadPath) {
        this.gcsPayloadPath = gcsPayloadPath;
    }

    public String getImageContentType() {
        return imageContentType;
    }

    public void setImageContentType(String imageContentType) {
        this.imageContentType = imageContentType;
    }

    public String getIngredientsJson() {
        return ingredientsJson;
    }

    public void setIngredientsJson(String ingredientsJson) {
        this.ingredientsJson = ingredientsJson;
    }

    public String getFlavorJson() {
        return flavorJson;
    }

    public void setFlavorJson(String flavorJson) {
        this.flavorJson = flavorJson;
    }

    public String getCommentText() {
        return commentText;
    }

    public void setCommentText(String commentText) {
        this.commentText = commentText;
    }

    public Integer getTotalScore() {
        return totalScore;
    }

    public void setTotalScore(Integer totalScore) {
        this.totalScore = totalScore;
    }

    public String getRankValue() {
        return rankValue;
    }

    public void setRankValue(String rankValue) {
        this.rankValue = rankValue;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
