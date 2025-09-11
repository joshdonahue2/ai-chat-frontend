import { createClient } from '@supabase/supabase-js';
import { state } from './state.js';
import { ui } from './ui.js';

const config = {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    webhookUrl: process.env.WEBHOOK_URL
};

let supabase;

export const api = {
    async initializeSupabase() {
        if (!config.supabaseUrl || !config.supabaseAnonKey) {
            throw new Error('Supabase URL or anonymous key not provided');
        }
        console.log('Initializing Supabase...');
        supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
        return supabase;
    },

    getSupabase() {
        return supabase;
    },

    async fetchUserProfile(userId) {
        console.log(`Fetching profile for user ${userId}...`);
        try {
            const { data, error, status } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', userId)
                .single();
            if (error && status !== 406) throw error;
            return data;
        } catch (error) {
            console.error('Exception while fetching profile:', error);
            return null;
        }
    },

    async sendMessage(message) {
        try {
            const response = await fetch(config.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    message,
                    user_id: state.userId,
                    conversation_id: state.conversationId,
                    conversation_history: state.conversationHistory.slice(-10)
                })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

            const data = await response.json();
            const responseText = data.response || 'Sorry, I received an empty response.';
            ui.addMessage('assistant', responseText);
            state.conversationHistory.push({ role: 'assistant', content: responseText });

            if (state.conversationHistory.length > 20) {
                state.conversationHistory = state.conversationHistory.slice(-20);
            }
        } catch (error) {
            console.error('Send message error:', error);
            ui.addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
            ui.showToast('Failed to get a response from the assistant.', 'error');
        }
    }
};
