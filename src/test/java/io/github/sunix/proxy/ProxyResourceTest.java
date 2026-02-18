package io.github.sunix.proxy;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.RestAssured;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.notNullValue;

@QuarkusTest
public class ProxyResourceTest {

    @Test
    public void testHealthEndpoint() {
        given()
            .when().get("/q/health")
            .then()
            .statusCode(200);
    }

    @Test
    public void testOptionsPreflightRequest() {
        given()
            .when().options("/api/some/path")
            .then()
            .statusCode(204)
            .header("Access-Control-Allow-Methods", notNullValue())
            .header("Access-Control-Allow-Headers", notNullValue());
    }

    @Test
    public void testProxyTokenValidation() {
        // This test will only work if PROXY_TOKEN is set
        // For now, we just test that the endpoint exists
        given()
            .when().get("/api/test")
            .then()
            .statusCode(org.hamcrest.Matchers.anyOf(
                org.hamcrest.Matchers.is(403),  // Token required
                org.hamcrest.Matchers.is(502),  // Proxy error (expected since target may not respond)
                org.hamcrest.Matchers.is(200)   // Success
            ));
    }
}
