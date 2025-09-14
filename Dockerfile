# Use a Node.js base image to get npm
FROM node:18-alpine AS builder

# Set the working directory
WORKDIR /app

# Accept build arguments for Supabase and Webhook URLs
ARG SUPABASE_URL
ARG SUPABASE_ANON_KEY
ARG WEBHOOK_URL
ARG IMAGE_URL
ARG CALLBACK_BASE_URL

# Set environment variables from the build arguments
ENV SUPABASE_URL=$SUPABASE_URL
ENV SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
ENV WEBHOOK_URL=$WEBHOOK_URL
ENV IMAGE_URL=$IMAGE_URL
ENV CALLBACK_BASE_URL=$CALLBACK_BASE_URL

# Copy the html directory
COPY html/ /app/html/

# Set the working directory to the html folder
WORKDIR /app/html

# Install dependencies
RUN npm install

# Copy the build script
COPY build.sh /app/html/

# Make the build script executable and run it
RUN chmod +x build.sh
RUN ./build.sh

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
