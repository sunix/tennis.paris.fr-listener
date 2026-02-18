package io.github.sunix.proxy;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.*;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Optional;

@Path("/api")
@ApplicationScoped
public class ProxyResource {

    private static final Logger LOG = Logger.getLogger(ProxyResource.class);

    @ConfigProperty(name = "proxy.target.url")
    String targetUrl;

    @ConfigProperty(name = "proxy.token")
    Optional<String> proxyToken;

    private final HttpClient httpClient;

    public ProxyResource() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    @OPTIONS
    @Path("{path:.*}")
    public Response handlePreflight(@PathParam("path") String path) {
        LOG.infof("Handling OPTIONS preflight for path: %s", path);
        return Response.noContent()
                .header("Access-Control-Allow-Origin", "*")
                .header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
                .header("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Proxy-Token")
                .header("Access-Control-Max-Age", "86400")
                .build();
    }

    @GET
    @Path("{path:.*}")
    public Response proxyGet(
            @PathParam("path") String path,
            @Context UriInfo uriInfo,
            @Context HttpHeaders headers) {
        return proxyRequest("GET", path, null, uriInfo, headers);
    }

    @POST
    @Path("{path:.*}")
    public Response proxyPost(
            @PathParam("path") String path,
            String body,
            @Context UriInfo uriInfo,
            @Context HttpHeaders headers) {
        return proxyRequest("POST", path, body, uriInfo, headers);
    }

    @PUT
    @Path("{path:.*}")
    public Response proxyPut(
            @PathParam("path") String path,
            String body,
            @Context UriInfo uriInfo,
            @Context HttpHeaders headers) {
        return proxyRequest("PUT", path, body, uriInfo, headers);
    }

    @PATCH
    @Path("{path:.*}")
    public Response proxyPatch(
            @PathParam("path") String path,
            String body,
            @Context UriInfo uriInfo,
            @Context HttpHeaders headers) {
        return proxyRequest("PATCH", path, body, uriInfo, headers);
    }

    @DELETE
    @Path("{path:.*}")
    public Response proxyDelete(
            @PathParam("path") String path,
            @Context UriInfo uriInfo,
            @Context HttpHeaders headers) {
        return proxyRequest("DELETE", path, null, uriInfo, headers);
    }

    private Response proxyRequest(String method, String path, String body, UriInfo uriInfo, HttpHeaders headers) {
        // Validate proxy token if configured
        if (proxyToken.isPresent() && !proxyToken.get().isEmpty()) {
            String requestToken = headers.getHeaderString("X-Proxy-Token");
            if (requestToken == null || !proxyToken.get().equals(requestToken)) {
                LOG.warnf("Unauthorized request - missing or invalid X-Proxy-Token");
                return Response.status(Response.Status.FORBIDDEN)
                        .entity("Forbidden: Invalid or missing X-Proxy-Token")
                        .build();
            }
        }

        try {
            // Build target URL
            String queryString = uriInfo.getRequestUri().getQuery();
            String targetUri = targetUrl + "/" + path;
            if (queryString != null && !queryString.isEmpty()) {
                targetUri += "?" + queryString;
            }

            LOG.infof("Proxying %s request to: %s", method, targetUri);

            // Build HTTP request
            HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(targetUri))
                    .timeout(Duration.ofSeconds(30));

            // Copy relevant headers
            String contentType = headers.getHeaderString("Content-Type");
            if (contentType != null) {
                requestBuilder.header("Content-Type", contentType);
            }

            String authorization = headers.getHeaderString("Authorization");
            if (authorization != null) {
                requestBuilder.header("Authorization", authorization);
            }

            // Set method and body
            if ("GET".equals(method)) {
                requestBuilder.GET();
            } else if ("POST".equals(method)) {
                requestBuilder.POST(HttpRequest.BodyPublishers.ofString(body != null ? body : ""));
            } else if ("PUT".equals(method)) {
                requestBuilder.PUT(HttpRequest.BodyPublishers.ofString(body != null ? body : ""));
            } else if ("PATCH".equals(method)) {
                requestBuilder.method("PATCH", HttpRequest.BodyPublishers.ofString(body != null ? body : ""));
            } else if ("DELETE".equals(method)) {
                requestBuilder.DELETE();
            }

            HttpRequest request = requestBuilder.build();

            // Send request
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            LOG.infof("Received response with status: %d", response.statusCode());

            // Build response
            Response.ResponseBuilder responseBuilder = Response.status(response.statusCode())
                    .entity(response.body());

            // Copy response content-type if present
            response.headers().firstValue("Content-Type").ifPresent(ct ->
                    responseBuilder.header("Content-Type", ct));

            return responseBuilder.build();

        } catch (Exception e) {
            LOG.errorf(e, "Error proxying request to %s/%s", targetUrl, path);
            return Response.status(Response.Status.BAD_GATEWAY)
                    .entity("Error proxying request: " + e.getMessage())
                    .build();
        }
    }
}
