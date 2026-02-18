####
# This Dockerfile is used to build a container image for the tennis.paris.fr CORS proxy
# It uses a multi-stage build to produce a minimal JVM-based image
####

# Build stage
FROM maven:3.9.5-eclipse-temurin-17 AS build
WORKDIR /build

# Update CA certificates to fix SSL issues
RUN apt-get update && apt-get install -y ca-certificates && update-ca-certificates

COPY pom.xml .
COPY src ./src
RUN mvn package -DskipTests -Dmaven.wagon.http.ssl.insecure=false

# Runtime stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Copy the built artifact from build stage
COPY --from=build /build/target/quarkus-app/lib/ /app/lib/
COPY --from=build /build/target/quarkus-app/*.jar /app/
COPY --from=build /build/target/quarkus-app/app/ /app/app/
COPY --from=build /build/target/quarkus-app/quarkus/ /app/quarkus/

# Set environment variables
ENV JAVA_OPTS="-Dquarkus.http.host=0.0.0.0 -Djava.util.logging.manager=org.jboss.logmanager.LogManager"

# Expose port
EXPOSE 8080

# Run the application
ENTRYPOINT ["java", "-jar", "/app/quarkus-run.jar"]
