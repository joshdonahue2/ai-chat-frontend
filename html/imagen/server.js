require('dotenv').config();

/*
-- SQL to create the image_tasks table in Supabase
CREATE TABLE IF NOT EXISTS image_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'pending',
    prompt TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    image_data TEXT,
    error TEXT
);

-- Enable RLS
ALTER TABLE image_tasks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow users to manage their own image tasks"
ON image_tasks
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
*/

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

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// API Routes
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
        const trimmedPrompt = prompt.trim();

        // Insert task into Supabase
        const { data, error } = await supabase
            .from('image_tasks')
            .insert([
                {
                    task_id: taskId,
                    user_id: user.id,
                    prompt: trimmedPrompt,
                    status: 'pending'
                }
            ])
            .select();

        if (error) {
            console.error(`[${taskId}] Supabase insert error on generate:`, error.message);
            return res.status(500).json({ error: 'Failed to create task' });
        }

        console.log(`[${taskId}] Starting image generation for prompt: "${trimmedPrompt}" by user ${user.id}`);

        // Send request to n8n webhook (don't wait for response)
        sendToN8N(taskId, trimmedPrompt).catch(async (n8nError) => {
            console.error(`[${taskId}] Error sending to n8n:`, n8nError.message);
            // Update task in Supabase to reflect the error
            await supabase
                .from('image_tasks')
                .update({ status: 'error', error: `Failed to dispatch to n8n: ${n8nError.message}` })
                .eq('task_id', taskId);
        });

        res.json({ taskId, status: 'pending', message: 'Image generation started' });
    } catch (error) {
        console.error('Generate endpoint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Check task status endpoint
app.get('/api/status/:taskId', async (req, res) => {
    const { taskId } = req.params;

    if (!taskId) {
        return res.status(400).json({ error: 'Task ID is required' });
    }

    try {
        const { data: task, error } = await supabase
            .from('image_tasks')
            .select('task_id, status, image_data, error, created_at')
            .eq('task_id', taskId)
            .single();

        if (error || !task) {
            console.error(`[${taskId}] Task not found in Supabase:`, error?.message);
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json({
            taskId: task.task_id,
            status: task.status,
            imageData: task.image_data,
            error: task.error,
            createdAt: task.created_at
        });
    } catch (err) {
        console.error(`[${taskId}] Error fetching task status:`, err.message);
        res.status(500).json({ error: 'Internal server error' });
    }
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

        // Fetch the original task from Supabase to get user_id and prompt
        const { data: task, error: fetchError } = await supabase
            .from('image_tasks')
            .select('user_id, prompt')
            .eq('task_id', taskId)
            .single();

        if (fetchError || !task) {
            console.log(`[${taskId}] Task not found in Supabase for webhook.`, fetchError?.message);
            return res.status(404).json({ error: 'Task not found' });
        }

        if (success === 'true' && req.file) {
            const finalBase64 = req.file.buffer.toString('base64');
            const updatePayload = {
                status: 'completed',
                image_data: finalBase64,
                completed_at: new Date().toISOString(),
                error: null
            };

            // Update task in Supabase
            const { error: updateError } = await supabase
                .from('image_tasks')
                .update(updatePayload)
                .eq('task_id', taskId);

            if (updateError) {
                console.error(`[${taskId}] Supabase update error:`, updateError.message);
                // Don't stop; still try to save to history
            } else {
                 console.log(`[${taskId}] Image received and task updated successfully.`);
            }

            // Save to Supabase image_history table
            const { error: historyError } = await supabase
                .from('image_history')
                .insert([
                    {
                        task_id: taskId,
                        prompt: task.prompt,
                        image_data: finalBase64,
                        user_id: task.user_id
                    }
                ]);

            if (historyError && historyError.code !== '23505') { // Ignore duplicate key errors
                console.error(`[${taskId}] Supabase insert error for history:`, historyError.message);
            } else {
                console.log(`[${taskId}] Image history saved to Supabase.`);
            }

        } else {
            // Handle generation failure
            const updatePayload = {
                status: 'error',
                error: error || 'Unknown error occurred during generation',
                completed_at: new Date().toISOString()
            };
            await supabase.from('image_tasks').update(updatePayload).eq('task_id', taskId);
            console.log(`[${taskId}] Image generation failed: ${updatePayload.error}`);
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
app.get('/api/health', async (req, res) => {
    try {
        const { count, error } = await supabase
            .from('image_tasks')
            .select('*', { count: 'exact', head: true })
            .in('status', ['pending', 'processing']);

        if (error) {
            throw error;
        }

        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            activeTasks: count
        });
    } catch (error) {
        console.error('Health check failed:', error.message);
        res.status(503).json({
            status: 'unhealthy',
            reason: 'Failed to connect to database',
            error: error.message
        });
    }
});

// Frontend
app.use(express.static('public'));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Send request to n8n webhook
async function sendToN8N(taskId, prompt) {
    try {
        console.log(`[${taskId}] Sending to n8n webhook: ${N8N_WEBHOOK_URL}`);
        
        const response = await axios.post(N8N_WEBHOOK_URL, {
            taskId,
            prompt,
            callbackUrl: `${process.env.CALLBACK_BASE_URL}/api/webhook/result`
        }, {
            timeout: 30000, // 30 second timeout for the initial request
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'ImageGenerator/1.0'
            }
        });

        console.log(`[${taskId}] Successfully sent to n8n, status: ${response.status}`);
        
        // Update task status to processing in Supabase
        await supabase
            .from('image_tasks')
            .update({ status: 'processing' })
            .eq('task_id', taskId);

    } catch (error) {
        console.error(`[${taskId}] n8n request failed:`, error.message);
        
        // Update task with error in Supabase
        await supabase
            .from('image_tasks')
            .update({ status: 'error', error: `Failed to start generation: ${error.message}` })
            .eq('task_id', taskId);
        
        throw error;
    }
}

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
    console.log(`Frontend available at: ${process.env.CALLBACK_BASE_URL}`);
    console.log(`API health check: ${process.env.CALLBACK_BASE_URL}/api/health`);
    console.log(`n8n webhook URL: ${N8N_WEBHOOK_URL}`);
});

module.exports = app;