package com.happysoup.backend.profile.controller;

import com.happysoup.backend.profile.dto.MartialSessionResponse;
import com.happysoup.backend.profile.dto.MartialSessionSaveRequest;
import com.happysoup.backend.profile.dto.ProfileMartialDataResponse;
import com.happysoup.backend.profile.service.ProfileMartialService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final ProfileMartialService profileMartialService;

    public ProfileController(ProfileMartialService profileMartialService) {
        this.profileMartialService = profileMartialService;
    }

    @PostMapping("/martial-sessions")
    public MartialSessionResponse saveMartialSession(@Valid @RequestBody MartialSessionSaveRequest request) {
        return profileMartialService.saveMartialSession(request);
    }

    @GetMapping("/martial-data")
    public ProfileMartialDataResponse getMartialData(
            @RequestParam Long userId,
            @RequestParam(defaultValue = "7") Integer days
    ) {
        int safeDays = days == null ? 7 : days;
        return profileMartialService.getMartialData(userId, safeDays);
    }
}
