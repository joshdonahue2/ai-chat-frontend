require('dotenv').config();

// Helper: get user from Supabase access token
async function getUserFromToken(token) {
    if (!token) return null;
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data || !data.user) return null;
    return data.user;
}

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const PORT = process.env.PORT || 3000;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://n8n.donahuenet.xyz/webhook/image';

// Supabase client setup
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// User registration endpoint
app.post('/api/register', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }
    try {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        res.json({ message: 'Registration successful. Please check your email to confirm.' });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// User login endpoint
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        res.json({ session: data.session, user: data.user });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// Store task status in memory (in production, use Redis or database)
const taskStore = new Map();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve the frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Generate image endpoint
app.post('/api/generate', async (req, res) => {
    try {
        const { prompt } = req.body;
        const authHeader = req.headers['authorization'];
        const token = authHeader ? authHeader.replace('Bearer ', '') : null;
        const user = await getUserFromToken(token);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized. Please log in.' });
        }
        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
            return res.status(400).json({ error: 'Prompt is required and must be a non-empty string' });
        }
        const taskId = uuidv4();
        // Initialize task status
        taskStore.set(taskId, {
            status: 'pending',
            prompt: prompt.trim(),
            createdAt: new Date(),
            imageData: null,
            error: null,
            user_id: user.id
        });
        console.log(`[${taskId}] Starting image generation for prompt: "${prompt.trim()}" by user ${user.id}`);
        // Send request to n8n webhook (don't wait for response)
        sendToN8N(taskId, prompt.trim()).catch(error => {
            console.error(`[${taskId}] Error sending to n8n:`, error.message);
            taskStore.set(taskId, {
                ...taskStore.get(taskId),
                status: 'error',
                error: `Failed to process request: ${error.message}`
            });
        });
        res.json({ taskId, status: 'pending', message: 'Image generation started' });
    } catch (error) {
        console.error('Generate endpoint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Check task status endpoint
app.get('/api/status/:taskId', (req, res) => {
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
app.post('/api/webhook/result', upload.single('imageData'), (req, res) => {
    try {
        // Data from the form fields comes from req.body
        const { taskId, success, error } = req.body;
        
        console.log(`[${taskId}] Received multipart webhook. Success: ${success}`);

        if (!taskId) {
            return res.status(400).json({ error: 'Task ID is required' });
        }

        const task = taskStore.get(taskId);
        if (!task) {
            console.log(`[${taskId}] Task not found in store for webhook.`);
            return res.status(404).json({ error: 'Task not found' });
        }

        // 'success' will be a string 'true' or 'false', so we check against 'true'
        if (success === 'true' && req.file) {
            // The file is now in req.file.buffer.
            // We perform the final, reliable conversion to base64 here.
            const finalBase64 = req.file.buffer.toString('base64');

            taskStore.set(taskId, {
                ...task,
                status: 'completed',
                imageData: finalBase64, // Use the reliably converted data
                completedAt: Date.now()
            });
            console.log(`[${taskId}] Image received and converted successfully.`);

            // Save to Supabase image_history table, handle duplicate key errors gracefully
            (async () => {
                try {
                    const { data: insertData, error: dbError, status, statusText } = await supabase
                        .from('image_history')
                        .insert([
                            {
                                task_id: taskId,
                                prompt: task.prompt,
                                image_data: finalBase64,
                                created_at: new Date().toISOString(),
                                user_id: task.user_id || null
                            }
                        ]);
                    if (dbError) {
                        // Check for duplicate key error (Postgres error code 23505)
                        if (dbError.code === '23505' || (dbError.message && dbError.message.includes('duplicate key')) ) {
                            console.log(`[${taskId}] Duplicate image history, not inserted.`);
                        } else {
                            console.error(`[${taskId}] Supabase insert error:`, dbError.message);
                        }
                    } else {
                        console.log(`[${taskId}] Image history saved to Supabase.`);
                    }
                } catch (e) {
                    console.error(`[${taskId}] Supabase error:`, e.message);
                }
            })();

        } else {
            taskStore.set(taskId, {
                ...task,
                status: 'error',
                error: error || 'Unknown error occurred during generation'
            });
            console.log(`[${taskId}] Image generation failed: ${error}`);
        }

        res.json({ success: true, message: 'Result processed' });

    } catch (err) {
        console.error('Webhook processing error:', err);
        res.status(500).json({ error: 'Failed to process webhook result' });
    }
    });
    // Image history endpoint (user-specific)
app.get('/api/history', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader ? authHeader.replace('Bearer ', '') : null;
        console.log('Auth token:', token ? 'Present' : 'Missing');
        
        const user = await getUserFromToken(token);
        console.log('User info:', user ? `ID: ${user.id}` : 'Not authenticated');
        
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized. Please log in.' });
        }
        
        try {
            console.log('Fetching history for user:', user.id);
            console.log('Supabase config:', {
                url: SUPABASE_URL ? 'Present' : 'Missing',
                key: SUPABASE_KEY ? 'Present' : 'Missing'
            });

            // First, let's try to get all records to debug
            // Test RLS setup
            console.log('Testing RLS policy...');
            const { error: rpcError } = await supabase.rpc('enable_rls_for_image_history');
            if (rpcError) {
                console.log('RLS setup error (this is okay if already set up):', rpcError.message);
            }

            // Create RLS policy if needed
            const { error: policyError } = await supabase.rpc('create_image_history_policy');
            if (policyError) {
                console.log('Policy setup error (this is okay if already set up):', policyError.message);
            }

            console.log('Querying all records to debug...');
            let { data: allData, error: allError } = await supabase
                .from('image_history')
                .select('id, task_id, prompt, image_data, created_at, user_id')
                .limit(10);
            
            if (allError) {
                console.error('Supabase query error (all records):', allError);
                throw new Error('Failed to fetch image history');
            }

            console.log('All records found:', {
                totalRecords: allData ? allData.length : 0,
                sampleUserIds: allData ? allData.slice(0, 3).map(img => ({
                    user_id: img.user_id,
                    has_data: !!img.image_data,
                    created: img.created_at
                })) : []
            });

            // Now filter for the current user
            const { data, error } = await supabase
                .from('image_history')
                .select('id, task_id, prompt, image_data, created_at, user_id')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('Supabase query error (user records):', error);
                throw new Error('Failed to fetch image history');
            }
            
            // Log what we found
            const images = data || [];
            console.log('User query result:', {
                success: true,
                userId: user.id,
                totalImages: images.length,
                imageInfo: images.map(img => ({
                    id: img.id,
                    task_id: img.task_id,
                    prompt: img.prompt,
                    created_at: img.created_at,
                    hasImageData: !!img.image_data,
                    userIdMatch: img.user_id === user.id
                }))
            });
            
            return res.json({ history: images });
        } catch (err) {
            console.error('Image history endpoint error:', err.message);
            return res.status(500).json({ error: err.message });
        }
        console.log('Images for this user:', userImages.length);
        
        res.json({ history: data });
    } catch (err) {
        console.error('Image history endpoint error:', err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        activeTasks: taskStore.size
    });
});

// Send request to n8n webhook
async function sendToN8N(taskId, prompt) {
    try {
        console.log(`[${taskId}] Sending to n8n webhook: ${N8N_WEBHOOK_URL}`);
        
        const response = await axios.post(N8N_WEBHOOK_URL, {
            taskId,
            prompt,
            callbackUrl: `https://imagen.donahuenet.xyz/api/webhook/result`
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
}, 60 * 60 * 1000); // Run every hour

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ 
        error: 'Internal server error' 
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'Endpoint not found' 
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Frontend available at: https://imagen.donahuenet.xyz`);
    console.log(`API health check: https://imagen.donahuenet.xyz/api/health`);
    console.log(`n8n webhook URL: ${N8N_WEBHOOK_URL}`);
});

module.exports = app;