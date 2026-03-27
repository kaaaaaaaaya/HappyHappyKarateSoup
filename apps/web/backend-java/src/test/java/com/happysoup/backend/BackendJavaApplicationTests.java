package com.happysoup.backend;

import com.google.cloud.storage.Storage;
import com.happysoup.backend.client.GeminiClient;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class BackendJavaApplicationTests {

    @MockBean
    private Storage storage;

    @MockBean
    private GeminiClient geminiClient;

    @Test
    void contextLoads() {
    }
}
