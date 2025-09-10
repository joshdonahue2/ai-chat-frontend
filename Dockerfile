# Simple Dockerfile that should work immediately
FROM nginx:1.25-alpine

# Install build tools and curl for health checks
RUN apk add --no-cache esbuild curl

# Copy your application files
COPY ./html /usr/share/nginx/html
COPY build.sh /usr/share/nginx/

# Make the build script executable and run it
RUN chmod +x /usr/share/nginx/build.sh
RUN /usr/share/nginx/build.sh

# Copy the main nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy the server block configuration
COPY default.conf /etc/nginx/conf.d/default.conf

# Expose port 8080 (as defined in default.conf)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/ || exit 1

# Start nginx (default command is already set in base image)
