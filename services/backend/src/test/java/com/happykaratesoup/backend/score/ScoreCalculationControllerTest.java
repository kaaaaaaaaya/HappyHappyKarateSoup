package com.happykaratesoup.backend.score;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ScoreCalculationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldReturnCalculatedScore() throws Exception {
        mockMvc.perform(post("/api/scores/calculate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "perfect": 5,
                                  "good": 2,
                                  "bad": 1
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalScore").value(600))
                .andExpect(jsonPath("$.counts.perfect").value(5))
                .andExpect(jsonPath("$.counts.good").value(2))
                .andExpect(jsonPath("$.counts.bad").value(1));
    }

    @Test
    void shouldReturnBadRequestWhenNegativeInputIsSent() throws Exception {
        mockMvc.perform(post("/api/scores/calculate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "perfect": -1,
                                  "good": 2,
                                  "bad": 1
                                }
                                """))
                .andExpect(status().isBadRequest());
    }
}
