package com.happykaratesoup.backend.chart;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.networknt.schema.InputFormat;
import com.networknt.schema.JsonSchema;
import com.networknt.schema.JsonSchemaFactory;
import com.networknt.schema.SpecVersion;
import com.networknt.schema.ValidationMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

import java.io.InputStream;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertTrue;

class ChartSchemaValidationTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private JsonSchema schema;

    @BeforeEach
    void setUp() throws Exception {
        JsonSchemaFactory factory = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V202012);
        try (InputStream stream = getClass().getClassLoader().getResourceAsStream("schema/chart-schema.json")) {
            JsonNode schemaNode = objectMapper.readTree(stream);
            schema = factory.getSchema(schemaNode);
        }
    }

    @Test
    void allChartFilesShouldMatchSchema() throws Exception {
        PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
        Resource[] charts = resolver.getResources("classpath:/charts/*.json");

        for (Resource chart : charts) {
            try (InputStream chartStream = chart.getInputStream()) {
                String json = new String(chartStream.readAllBytes());
                Set<ValidationMessage> errors = schema.validate(json, InputFormat.JSON);
                assertTrue(errors.isEmpty(), () -> "Schema validation failed for " + chart.getFilename() + ": " + errors);
            }
        }
    }
}
