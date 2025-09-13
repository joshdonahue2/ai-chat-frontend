#!/bin/bash

# Debug script for AI Image Generator timeout issues
# This script helps diagnose common timeout problems

echo "🔍 AI Image Generator Timeout Diagnostic"
echo "========================================"
echo

# Check if the app is running
echo "1. Checking if the application is running..."
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "✅ Application is responding"
    curl -s http://localhost:3000/api/health | jq . 2>/dev/null || curl -s http://localhost:3000/api/health
else
    echo "❌ Application is not responding at http://localhost:3000"
    echo "   Check if Docker container is running: docker ps"
    exit 1
fi

echo

# Check n8n connectivity
echo "2. Testing n8n webhook connectivity..."
N8N_URL=${N8N_WEBHOOK_URL:-"http://localhost:5678/webhook/generate-image"}
echo "   Testing: $N8N_URL"

if curl -s -m 10 -X POST -H "Content-Type: application/json" \
   -d '{"test": "connectivity"}' "$N8N_URL" > /dev/null 2>&1; then
    echo "✅ n8n webhook is reachable"
else
    echo "❌ Cannot reach n8n webhook at $N8N_URL"
    echo "   Common issues:"
    echo "   - n8n is not running"
    echo "   - Webhook URL is incorrect"
    echo "   - Network connectivity issues"
    echo "   - n8n webhook is not activated"
fi

echo

# Check Docker logs for errors
echo "3. Recent application logs (last 20 lines)..."
echo "   Looking for errors and timeout issues:"
docker logs --tail 20 ai-image-generator 2>/dev/null || echo "Cannot access Docker logs. Container might not be named 'ai-image-generator'"

echo
echo "4. Environment check..."
echo "   PORT: ${PORT:-3000}"
echo "   N8N_WEBHOOK_URL: ${N8N_WEBHOOK_URL:-'not set'}"
echo "   CALLBACK_BASE_URL: ${CALLBACK_BASE_URL:-'not set'}"

echo
echo "5. Testing a generation request..."
echo "   Sending test prompt to check timeout behavior..."

# Generate a test request
TASK_RESPONSE=$(curl -s -X POST http://localhost:3000/api/generate \
    -H "Content-Type: application/json" \
    -d '{"prompt": "test image for debugging timeout issues"}')

if echo "$TASK_RESPONSE" | jq . > /dev/null 2>&1; then
    TASK_ID=$(echo "$TASK_RESPONSE" | jq -r '.taskId')
    echo "✅ Test request sent successfully"
    echo "   Task ID: $TASK_ID"
    
    # Monitor the task for 2 minutes
    echo "   Monitoring task progress for 2 minutes..."
    
    for i in {1..24}; do
        sleep 5
        STATUS_RESPONSE=$(curl -s "http://localhost:3000/api/status/$TASK_ID")
        STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.status' 2>/dev/null || echo "unknown")
        ELAPSED=$(echo "$STATUS_RESPONSE" | jq -r '.elapsedTime.minutes' 2>/dev/null || echo "?")
        
        echo "   [$i] Status: $STATUS (${ELAPSED}m elapsed)"
        
        if [ "$STATUS" = "completed" ]; then
            echo "✅ Task completed successfully!"
            break
        elif [ "$STATUS" = "error" ]; then
            ERROR=$(echo "$STATUS_RESPONSE" | jq -r '.error' 2>/dev/null || echo "unknown error")
            echo "❌ Task failed with error: $ERROR"
            break
        elif [ $i -eq 24 ]; then
            echo "⏰ Task still running after 2 minutes - this suggests a timeout issue"
            echo "   Current status: $STATUS"
            echo "   Full response: $STATUS_RESPONSE"
        fi
    done
else
    echo "❌ Failed to send test request"
    echo "   Response: $TASK_RESPONSE"
fi

echo
echo "🔧 Troubleshooting recommendations:"
echo
echo "If you're experiencing timeouts:"
echo "1. Check your n8n workflow is working correctly"
echo "2. Verify ComfyUI is responding and generating images"
echo "3. Ensure the callback URL is reachable from n8n"
echo "4. Check n8n logs for errors"
echo "5. Consider increasing timeout values if generation takes >10 minutes"
echo
echo "Common n8n workflow issues:"
echo "- Webhook not activated"
echo "- ComfyUI node not properly configured"
echo "- HTTP request nodes timing out"
echo "- Missing error handling in workflow"
echo
echo "To check n8n logs:"
echo "  docker logs n8n  # if running n8n in Docker"
echo
echo "To increase timeout in the frontend:"
echo "  Edit the maxAttempts value in the polling function"
echo "  Current: 120 attempts (10 minutes)"
echo
echo "For more verbose logging, set NODE_ENV=development"