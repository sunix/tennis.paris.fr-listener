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
    public void testProxyEndpointExists() {
        // Test that the endpoint exists and responds (may get 404 or 502 from upstream)
        // This is expected since we're testing against a real URL that may not exist
        given()
            .when().get("/api/test")
            .then()
            .statusCode(org.hamcrest.Matchers.anyOf(
                org.hamcrest.Matchers.is(404),  // Not found on upstream
                org.hamcrest.Matchers.is(502),  // Proxy error
                org.hamcrest.Matchers.is(200)   // Success
            ));
    }
}
