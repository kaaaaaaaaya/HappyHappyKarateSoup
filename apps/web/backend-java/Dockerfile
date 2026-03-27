# syntax=docker/dockerfile:1

FROM maven:3.9.9-eclipse-temurin-17 AS build
WORKDIR /workspace

COPY pom.xml ./
RUN mvn -q -DskipTests dependency:go-offline

COPY src ./src
RUN mvn -q -DskipTests package \
  && cp /workspace/target/backend-java-0.0.1-SNAPSHOT.jar /workspace/app.jar

FROM eclipse-temurin:17-jre
WORKDIR /app

COPY --from=build /workspace/app.jar /app/app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
