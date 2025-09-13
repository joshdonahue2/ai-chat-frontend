const express = require('express');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://n8n.donahuenet.xyz/webhook/image';

// Store task status in memory (in production, use Redis or database)
const taskStore = new Map();

// Generate image endpoint
router.post('/generate', async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
            return res.status(400).json({
                error: 'Prompt is required and must be a non-empty string'
            });
        }

        const taskId = uuidv4();

        // Initialize task status
        taskStore.set(taskId, {
            status: 'pending',
            prompt: prompt.trim(),
            createdAt: new Date(),
            imageData: null,
            error: null
        });

        console.log(`[${taskId}] Starting image generation for prompt: "${prompt.trim()}"`);

        // Send request to n8n webhook (don't wait for response)
        sendToN8N(taskId, prompt.trim()).catch(error => {
            console.error(`[${taskId}] Error sending to n8n:`, error.message);
            taskStore.set(taskId, {
                ...taskStore.get(taskId),
                status: 'error',
                error: `Failed to process request: ${error.message}`
            });
        });

        res.json({
            taskId,
            status: 'pending',
            message: 'Image generation started'
        });

    } catch (error) {
        console.error('Generate endpoint error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
});

// Check task status endpoint
router.get('/status/:taskId', (req, res) => {
    const { taskId } = req.params;

    const task = taskStore.get(taskId);
    if (!task) {
        return res.status(404).json({
            error: 'Task not found'
        });
    }

    // Calculate elapsed time
    const elapsed = Date.now() - new Date(task.createdAt).getTime();
    const elapsedMinutes = Math.floor(elapsed / (1000 * 60));
    const elapsedSeconds = Math.floor((elapsed % (1000 * 60)) / 1000);

    // Clean up old completed tasks (optional)
    if (task.status === 'completed' && task.completedAt) {
        const hoursSinceCompletion = (Date.now() - task.completedAt) / (1000 * 60 * 60);
        if (hoursSinceCompletion > 24) {
            taskStore.delete(taskId);
            return res.status(404).json({
                error: 'Task expired'
            });
        }
    }

    // Log status check for long-running tasks
    if (elapsedMinutes > 2 && task.status !== 'completed') {
        console.log(`[${taskId}] Status check - ${task.status} for ${elapsedMinutes}m${elapsedSeconds}s`);
    }

    const response = {
        taskId,
        status: task.status,
        imageData: task.imageData,
        error: task.error,
        createdAt: task.createdAt,
        elapsedTime: {
            minutes: elapsedMinutes,
            seconds: elapsedSeconds,
            total: elapsed
        }
    };

    // Add additional debug info for non-completed tasks
    if (task.status !== 'completed') {
        response.debug = {
            sentToN8n: !!task.sentToN8nAt,
            n8nResponse: task.n8nResponse ? 'received' : 'none'
        };
    }

    res.json(response);
});

// Webhook endpoint for n8n to send results back
router.post('/webhook/result', (req, res) => {
    try {
        const { taskId, success, imageData, error } = req.body;

        console.log(`[${taskId}] Received webhook result - Success: ${success}`);

        if (!taskId) {
            return res.status(400).json({
                error: 'Task ID is required'
            });
        }

        const task = taskStore.get(taskId);
        if (!task) {
            console.log(`[${taskId}] Task not found in store`);
            return res.status(404).json({
                error: 'Task not found'
            });
        }

        if (success && imageData) {
            // Validate base64 image data
            if (typeof imageData !== 'string') {
                throw new Error('Image data must be a base64 string');
            }

            taskStore.set(taskId, {
                ...task,
                status: 'completed',
                imageData: imageData,
                completedAt: Date.now()
            });

            console.log(`[${taskId}] Image generation completed successfully`);
        } else {
            taskStore.set(taskId, {
                ...task,
                status: 'error',
                error: error || 'Unknown error occurred during generation'
            });

            console.log(`[${taskId}] Image generation failed: ${error}`);
        }

        res.json({
            success: true,
            message: 'Result processed'
        });

    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({
            error: 'Failed to process webhook result'
        });
    }
});

// Send request to n8n webhook
async function sendToN8N(taskId, prompt) {
    try {
        console.log(`[${taskId}] Sending to n8n webhook: ${N8N_WEBHOOK_URL}`);

        const response = await axios.post(N8N_WEBHOOK_URL, {
            taskId,
            prompt,
            callbackUrl: `https://imagen.donahuenet.xyz/api/image-generator/webhook/result`
        }, {
            timeout: 30000, // 30 second timeout for the initial request
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'ImageGenerator/1.0'
            }
        });

        console.log(`[${taskId}] Successfully sent to n8n, status: ${response.status}`);

        // Update task status to processing
        const task = taskStore.get(taskId);
        if (task) {
            taskStore.set(taskId, {
                ...task,
                status: 'processing'
            });
        }

    } catch (error) {
        console.error(`[${taskId}] n8n request failed:`, error.message);

        // Update task with error
        const task = taskStore.get(taskId);
        if (task) {
            taskStore.set(taskId, {
                ...task,
                status: 'error',
                error: `Failed to start generation: ${error.message}`
            });
        }

        throw error;
    }
}

// Cleanup old tasks periodically (runs every hour)
setInterval(() => {
    const now = Date.now();
    let cleaned = 0;

    for (const [taskId, task] of taskStore.entries()) {
        const ageHours = (now - new Date(task.createdAt).getTime()) / (1000 * 60 * 60);

        // Remove tasks older than 24 hours
        if (ageHours > 24) {
            taskStore.delete(taskId);
            cleaned++;
        }
    }

    if (cleaned > 0) {
        console.log(`Cleaned up ${cleaned} old tasks. Active tasks: ${taskStore.size}`);
    }
}, 60 * 60 * 1000);

function getActiveTasks() {
    return taskStore.size;
}

module.exports = { router, getActiveTasks };
