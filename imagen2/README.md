# AI Image Generator

A modern web application for generating AI images through n8n workflows integrated with ComfyUI. Features a beautiful glassmorphic UI with real-time progress tracking and seamless Docker deployment.

## Features

- 🎨 **Modern UI**: Glassmorphic design with smooth animations and responsive layout
- 🔄 **Real-time Progress**: Live status updates and progress tracking
- 🚀 **n8n Integration**: Seamless webhook integration with n8n workflows
- 🖼️ **ComfyUI Backend**: Powerful AI image generation through ComfyUI
- 📱 **Responsive Design**: Works perfectly on desktop and mobile devices
- 🐳 **Docker Ready**: Easy deployment with Docker and Docker Compose
- 💾 **Auto Download**: Generated images can be viewed and downloaded instantly
- ⚡ **Fast & Reliable**: Asynchronous processing with robust error handling

## Architecture

```
User Input → Frontend → Node.js API → n8n Webhook → Prompt Optimizer → ComfyUI → Image Generation
                ↑                                                                              ↓
         Result Display ← Webhook Callback ← n8n Processing ← Binary Download ← Generated Image
```

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- n8n instance with webhook workflow configured
- ComfyUI instance accessible from n8n

### 1. Clone and Setup

```bash
git clone <repository-url>
cd ai-image-generator
```

### 2. Configure Environment

Copy the environment template and configure your settings:

```bash
cp .env.template .env
```

Edit `.env` file with your specific configuration:

```bash
# Your n8n webhook URL
N8N_WEBHOOK_URL=http://your-n8n-instance:5678/webhook/generate-image

# Public URL where n8n can reach your app
CALLBACK_BASE_URL=https://your-domain.com
```

### 3. Project Structure

Create the following directory structure:

```
ai-image-generator/
├── server.js                 # Main backend server
├── package.json             # Node.js dependencies
├── Dockerfile              # Docker configuration
├── docker-compose.yml      # Docker Compose setup
├── .env                    # Environment variables
├── .dockerignore          # Docker ignore file
├── public/                # Frontend files directory
│   └── index.html        # Frontend application
└── README.md             # This file
```

### 4. Build and Run

Using Docker Compose (recommended):

```bash
docker-compose up --build
```

Or using Docker directly:

```bash
docker build -t ai-image-generator .
docker run -p 3000:3000 --env-file .env ai-image-generator
```

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **API Health Check**: http://localhost:3000/api/health
- **API Documentation**: See API Endpoints section below

## n8n Workflow Configuration

Your n8n workflow should:

### 1. Webhook Trigger
- Create a webhook trigger that accepts POST requests
- Configure to receive: `{ "taskId": "string", "prompt": "string", "callbackUrl": "string" }`

### 2. Prompt Optimization
- Add your prompt optimization logic (optional but recommended)
- Transform the user's simple prompt into a detailed, optimized prompt

### 3. ComfyUI Integration
- Send the optimized prompt to your ComfyUI instance
- Wait for image generation to complete
- Download the generated image as binary data

### 4. Result Callback
- Convert the image binary to base64
- Send results back to the callback URL with this payload:

```json
{
  "taskId": "uuid-from-original-request",
  "success": true,
  "imageData": "base64-encoded-image-string",
  "error": null
}
```

For errors:

```json
{
  "taskId": "uuid-from-original-request", 
  "success": false,
  "imageData": null,
  "error": "Error description"
}
```

## API Endpoints

### POST `/api/generate`
Start image generation process.

**Request Body:**
```json
{
  "prompt": "A beautiful landscape with mountains and lakes"
}
```

**Response:**
```json
{
  "taskId": "uuid-v4",
  "status": "pending",
  "message": "Image generation started"
}
```

### GET `/api/status/:taskId`
Check generation status.

**Response:**
```json
{
  "taskId": "uuid-v4",
  "status": "completed|pending|processing|error",
  "imageData": "base64-string-or-null",
  "error": "error-message-or-null",
  "createdAt": "iso-date-string"
}
```

### POST `/api/webhook/result`
Callback endpoint for n8n to send results.

**Request Body:**
```json
{
  "taskId": "uuid-v4",
  "success": true,
  "imageData": "base64-encoded-image",
  "error": null
}
```

### GET `/api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "iso-date-string",
  "activeTasks": 42
}
```

## Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Server port | `3000` | No |
| `NODE_ENV` | Environment | `production` | No |
| `N8N_WEBHOOK_URL` | n8n webhook endpoint | `http://localhost:5678/webhook/generate-image` | Yes |
| `CALLBACK_BASE_URL` | Public URL of your app | `http://localhost:3000` | Yes |

## Development

### Local Development Setup

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Start production server
npm start
```

### File Structure

```
public/
└── index.html          # Complete frontend application

server.js               # Express.js backend server
package.json           # Node.js project configuration
```

## Docker Configuration

### Dockerfile Features
- Multi-stage build for optimization
- Non-root user for security
- Health checks included
- Alpine Linux base for smaller image size

### Docker Compose Features  
- Automatic restart policies
- Health check monitoring
- Network isolation
- Optional n8n service inclusion
- Volume persistence (when n8n included)

## Security Considerations

- ✅ Non-root user in Docker container
- ✅ Input validation and sanitization
- ✅ Request size limits (50MB for large images)
- ✅ Error handling without information leakage
- ✅ CORS configuration
- ⚠️ Consider adding rate limiting for production
- ⚠️ Consider adding authentication for production use

## Troubleshooting

### Common Issues

**1. "Task not found" errors**
- Tasks are stored in memory and cleaned up after 24 hours
- Ensure n8n is sending the correct taskId in callbacks

**2. n8n webhook not receiving requests**
- Verify `N8N_WEBHOOK_URL` in environment variables
- Check network connectivity between containers
- Ensure n8n webhook is active and properly configured

**3. Images not displaying**
- Verify the base64 data is valid PNG/JPEG format
- Check that ComfyUI is generating images successfully
- Ensure the callback URL is reachable from n8n

**4. Docker container won't start**
- Check Docker logs: `docker logs ai-image-generator`
- Verify environment variables are set correctly
- Ensure port 3000 is not already in use

### Logging

The application provides detailed console logging:

```bash
# View real-time logs
docker-compose logs -f ai-image-generator

# View n8n logs (if included)  
docker-compose logs -f n8n
```

### Health Monitoring

Monitor application health:

```bash
# Check API health
curl http://localhost:3000/api/health

# Check Docker container health
docker ps
```

## Production Deployment

### Recommended Production Setup

1. **Use a reverse proxy** (nginx/traefik) for SSL termination
2. **Add rate limiting** to prevent abuse
3. **Use Redis** instead of in-memory storage for task tracking
4. **Set up monitoring** with health checks
5. **Configure log aggregation**
6. **Use environment-specific configurations**

### Example nginx configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have questions:

1. Check the troubleshooting section above
2. Review the Docker and application logs
3. Ensure your n8n workflow is correctly configured
4. Verify all environment variables are set properly

For additional support, please open an issue in the repository.