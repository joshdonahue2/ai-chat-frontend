# Use a Node.js base image to get npm
FROM node:18-alpine AS builder

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY html/package.json html/package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application files
COPY ./html /app/html
COPY build.sh /app/

# Make the build script executable and run it
RUN chmod +x /app/build.sh
RUN /app/build.sh

# Use a new stage for the production environment
FROM nginx:1.25-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Copy the built application from the builder stage
COPY --from=builder /app/html/public /usr/share/nginx/html

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
