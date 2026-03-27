package com.happykaratesoup.backend.chart;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

import java.io.InputStream;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ChartSchemaValidationTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void allPlayChartFilesShouldMatchTupleFormat() throws Exception {
        PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
        Resource[] charts = resolver.getResources("classpath*:charts/play/*/*.json");
        assertFalse(charts.length == 0, "No play chart files found under classpath*:charts/play/*/*.json");

        for (Resource chart : charts) {
            try (InputStream chartStream = chart.getInputStream()) {
                JsonNode root = objectMapper.readTree(chartStream);
                String name = chart.getFilename();
                assertTrue(root.isArray(), "Chart root must be array: " + name);
                assertTrue(root.size() > 0, "Chart must not be empty: " + name);

                for (int i = 0; i < root.size(); i++) {
                    JsonNode note = root.get(i);
                    assertTrue(note.isArray(), "Note must be array at " + name + ":" + i);
                    assertTrue(note.size() == 4, "Note must have 4 items at " + name + ":" + i);

                    JsonNode timing = note.get(0);
                    JsonNode action = note.get(1);
                    JsonNode ingredient = note.get(2);
                    JsonNode lane = note.get(3);

                    assertTrue(timing.isNumber(), "timing must be number at " + name + ":" + i);
                    assertTrue(timing.asInt() >= 0, "timing must be >= 0 at " + name + ":" + i);

                    assertTrue(action.isTextual(), "action must be string at " + name + ":" + i);
                    String actionValue = action.asText();
                    assertTrue("punch".equals(actionValue) || "chop".equals(actionValue),
                            "action must be punch/chop at " + name + ":" + i);

                    assertTrue(ingredient.isNumber() || ingredient.isTextual(),
                            "ingredient must be number or string at " + name + ":" + i);

                    assertTrue(lane.isNumber(), "lane must be number at " + name + ":" + i);
                    int laneValue = lane.asInt();
                    assertTrue(laneValue >= -100 && laneValue <= 100,
                            "lane must be between -100 and 100 at " + name + ":" + i);
                }
            }
        }
    }
}
