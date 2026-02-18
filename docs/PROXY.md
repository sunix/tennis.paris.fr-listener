# Tennis Paris CORS Proxy

A Quarkus-based HTTP proxy service that enables the GitHub Pages frontend to communicate with tennis.paris.fr by handling CORS restrictions.

## Overview

This proxy service:

- Receives requests from the GitHub Pages frontend at `/api/*`
- Forwards them to `https://tennis.paris.fr/*`
- Returns responses with proper CORS headers
- Handles CORS preflight (`OPTIONS`) requests
- Includes optional token-based authentication

## Configuration

The proxy is configured via environment variables:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ALLOWED_ORIGIN` | The origin allowed to access the proxy (GitHub Pages URL) | `https://sunix.github.io` | No |
| `PROXY_TOKEN` | Optional security token for authentication | Empty (disabled) | No |

### Example Configuration

```bash
# Allow requests from your GitHub Pages site
ALLOWED_ORIGIN=https://sunix.github.io

# Optional: Require a token for authentication
PROXY_TOKEN=your-secret-token-here
```

## API Usage

### Endpoint Pattern

All requests to the proxy follow this pattern:

```
https://<your-proxy-url>/api/<path> → https://tennis.paris.fr/<path>
```

Query parameters are automatically preserved.

### Example: POST Request

```javascript
// From your GitHub Pages frontend
fetch("https://your-proxy.onrender.com/api/some/endpoint", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Proxy-Token": "your-secret-token-here"  // Optional, if enabled
  },
  body: JSON.stringify({ 
    // Your request data
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Error:', error));
```

### Example: GET Request

```javascript
fetch("https://your-proxy.onrender.com/api/path/to/resource?param=value", {
  method: "GET",
  headers: {
    "X-Proxy-Token": "your-secret-token-here"  // Optional, if enabled
  }
})
.then(response => response.json())
.then(data => console.log(data));
```

### Testing with curl

```bash
# POST request
curl -X POST https://your-proxy.onrender.com/api/some/endpoint \
  -H "Content-Type: application/json" \
  -H "X-Proxy-Token: your-secret-token-here" \
  -d '{"key": "value"}'

# GET request
curl https://your-proxy.onrender.com/api/some/endpoint?param=value \
  -H "X-Proxy-Token: your-secret-token-here"

# Health check
curl https://your-proxy.onrender.com/q/health
```

## Local Development

### Prerequisites

- Java 17 or later
- Maven 3.9+

### Running Locally

1. **Build the project:**

   ```bash
   mvn clean package
   ```

2. **Run in development mode:**

   ```bash
   mvn quarkus:dev
   ```

   The proxy will be available at `http://localhost:8080`

3. **Set environment variables:**

   ```bash
   export ALLOWED_ORIGIN=http://localhost:3000
   export PROXY_TOKEN=test-token
   mvn quarkus:dev
   ```

### Running Tests

```bash
mvn test
```

## Docker Deployment

### Building the Docker Image

```bash
docker build -t tennis-paris-proxy .
```

### Running with Docker

```bash
docker run -p 8080:8080 \
  -e ALLOWED_ORIGIN=https://sunix.github.io \
  -e PROXY_TOKEN=your-secret-token \
  tennis-paris-proxy
```

## Render Deployment

This service is designed to run on [Render](https://render.com) using the free tier.

### Deployment Steps

1. **Create a new Web Service on Render:**
   - Go to https://dashboard.render.com
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

2. **Configure the service:**
   - **Name:** `tennis-paris-proxy` (or your preferred name)
   - **Environment:** `Docker`
   - **Branch:** `main` (or your deployment branch)
   - **Instance Type:** `Free`

3. **Add environment variables:**
   - Go to the "Environment" tab
   - Add:
     - `ALLOWED_ORIGIN` = `https://sunix.github.io` (or your GitHub Pages URL)
     - `PROXY_TOKEN` = `your-secret-token` (optional but recommended)

4. **Deploy:**
   - Click "Create Web Service"
   - Render will automatically build and deploy your application
   - Your proxy will be available at `https://<service-name>.onrender.com`

### Health Check

Render automatically uses the health check endpoint at `/q/health` to monitor the service.

### Free Tier Considerations

- The free tier spins down after 15 minutes of inactivity
- The first request after spin-down may take 30-60 seconds to wake up
- This is sufficient for most use cases

## Security

### Built-in Protections

1. **Domain Restriction:**
   - The proxy only forwards requests to `https://tennis.paris.fr`
   - It cannot be used as an open proxy to other domains

2. **CORS Protection:**
   - Only requests from the configured `ALLOWED_ORIGIN` are permitted
   - Preflight requests are properly handled

3. **Optional Token Authentication:**
   - When `PROXY_TOKEN` is set, all requests must include a matching `X-Proxy-Token` header
   - Unauthorized requests receive a 403 Forbidden response

### Best Practices

- **Always set a PROXY_TOKEN** in production to prevent unauthorized usage
- Keep your token secret and don't commit it to version control
- Rotate the token periodically
- Monitor your Render logs for suspicious activity

## Troubleshooting

### CORS Errors

If you see CORS errors in the browser console:

1. Verify `ALLOWED_ORIGIN` matches your GitHub Pages URL exactly
2. Check that the frontend includes all required headers
3. Ensure the proxy is running and accessible

### 403 Forbidden

If you receive 403 errors:

1. Verify the `X-Proxy-Token` header is included in your request
2. Check that the token value matches the `PROXY_TOKEN` environment variable
3. Ensure the token doesn't have extra spaces or characters

### 502 Bad Gateway

If you receive 502 errors:

1. Check that `https://tennis.paris.fr` is accessible
2. Verify the path you're requesting exists on the target server
3. Check Render logs for detailed error messages

### Render Spin-Down

If the proxy is slow to respond:

- This is expected on the free tier after inactivity
- The service will wake up after the first request
- Consider upgrading to a paid tier for always-on service

## Architecture

```
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│  GitHub Pages    │         │   Render Proxy   │         │  tennis.paris.fr │
│   (Frontend)     │────────▶│   (Quarkus)      │────────▶│   (Backend)      │
│                  │  CORS   │                  │  HTTP   │                  │
│  sunix.github.io │  OK     │  /api/* → /*     │         │  tennis.paris.fr │
└──────────────────┘         └──────────────────┘         └──────────────────┘
```

## Technical Details

- **Framework:** Quarkus 3.6.4
- **Runtime:** Java 17
- **HTTP Client:** Java 11+ HttpClient
- **Health Checks:** SmallRye Health
- **Deployment:** Docker container on Render

## License

See [LICENSE](../LICENSE) file for details.
