"use strict";

// Enhanced App Class with enhanced debugging
class AIMemoryAgent {
    constructor() {
        this.config = {
            supabaseUrl: 'https://supabase.donahuenet.xyz',
            supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE',
            webhookUrl: 'https://n8n.donahuenet.xyz/webhook/ai-chat'
        };

        this.state = {
            isLoading: false,
            isInitialized: false,
            isSignUpMode: false,
            userId: null,
            conversationId: this.generateConversationId(),
            conversationHistory: []
        };

        this.supabase = null;
        this.elements = {};
        this.init();
    }

    async init() {
        try {
            await this.waitForDOM();
            this.cacheElements();
            this.bindEvents();
            await this.initSupabase();
            console.log('App initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showToast('Failed to initialize app', 'error');
        }
    }

    waitForDOM() {
        return new Promise(resolve => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }

    cacheElements() {
        console.log('=== CACHING ELEMENTS ===');
        this.elements.authContainer = document.getElementById('auth-container');
        this.elements.appContainer = document.getElementById('app-container');
        this.elements.loadingContainer = document.getElementById('loading-container');
        this.elements.authForm = document.getElementById('auth-form');
        this.elements.authError = document.getElementById('auth-error');
        this.elements.authTitle = document.getElementById('auth-title');
        this.elements.fullNameGroup = document.getElementById('full-name-group');
        this.elements.fullName = document.getElementById('full_name');
        this.elements.email = document.getElementById('email');
        this.elements.password = document.getElementById('password');
        this.elements.authSubmitButton = document.getElementById('auth-submit-button');
        this.elements.authButtonText = document.getElementById('auth-button-text');
        this.elements.authToggleLink = document.getElementById('auth-toggle-link');
        this.elements.userDisplayName = document.getElementById('user-display-name');
        this.elements.logoutButton = document.getElementById('logout-button');
        this.elements.messages = document.getElementById('messages');
        this.elements.messageInput = document.getElementById('messageInput');
        this.elements.sendButton = document.getElementById('sendButton');
        this.elements.thinkingIndicator = document.getElementById('thinking-indicator');

        Object.entries(this.elements).forEach(([key, element]) => {
            console.log(`${key}: ${element ? 'FOUND' : 'MISSING'}`);
        });
        console.log('=== END CACHING ===');
    }

    bindEvents() {
        this.elements.authForm?.addEventListener('submit', (e) => this.handleAuthSubmit(e));
        this.elements.authToggleLink?.addEventListener('click', () => this.toggleAuthMode());
        this.elements.sendButton?.addEventListener('click', () => this.sendMessage());
        this.elements.messageInput?.addEventListener('keydown', (e) => this.handleMessageInputKeydown(e));
        this.elements.messageInput?.addEventListener('input', () => this.autoResizeInput());
        this.elements.logoutButton?.addEventListener('click', () => this.handleLogout());
        console.log('Events bound successfully');
    }

    async initSupabase() {
        if (typeof supabase === 'undefined') {
            throw new Error('Supabase library not loaded');
        }

        console.log('Initializing Supabase...');
        const { createClient } = supabase;
        this.supabase = createClient(this.config.supabaseUrl, this.config.supabaseAnonKey);

        const { data: { session } } = await this.supabase.auth.getSession();

        if (session?.user) {
            console.log('🟢 Initial session found. Initializing app UI...');
            try {
                this.forceShowAppScreen();
                const profile = await this.fetchUserProfile(session.user.id);
                await this.initializeApp(session.user, profile);
            } catch (error) {
                console.error('❌ Error during initial app initialization:', error);
                this.showToast('Error loading app data', 'error');
                this.forceShowAuthScreen();
            }
        } else {
            console.log('🔴 No initial session found. Showing auth screen.');
            this.forceShowAuthScreen();
            this.hideLoading();
        }

        this.supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`=== AUTH STATE CHANGE (post-init) === Event: ${event}`);
            if (event === 'SIGNED_IN') {
                 console.log('User signed in manually. Initializing app UI.');
                 try {
                     this.forceShowAppScreen();
                     const profile = await this.fetchUserProfile(session.user.id);
                     await this.initializeApp(session.user, profile);
                 } catch (error) {
                     console.error('❌ Error after sign-in:', error);
                     this.showToast('Error loading app data', 'error');
                 }
            } else if (event === 'SIGNED_OUT') {
                console.log('🔴 User signed out. Showing auth screen.');
                this.forceShowAuthScreen();
                this.hideLoading();
                this.state.userId = null;
                this.state.isInitialized = false;
            }
        });
    }

    forceShowAuthScreen() {
        if (this.elements.authContainer) {
            this.elements.authContainer.style.display = 'block';
            this.elements.authContainer.classList.remove('hidden');
        }
        if (this.elements.appContainer) {
            this.elements.appContainer.style.display = 'none';
            this.elements.appContainer.classList.remove('show');
        }
        if (this.elements.loadingContainer) {
            this.elements.loadingContainer.style.display = 'none';
        }
    }

    forceShowAppScreen() {
        if (this.elements.authContainer) {
            this.elements.authContainer.style.display = 'none';
            this.elements.authContainer.classList.add('hidden');
        }
        if (this.elements.appContainer) {
            this.elements.appContainer.style.display = 'flex';
            this.elements.appContainer.classList.add('show');
        }
        if (this.elements.loadingContainer) {
            this.elements.loadingContainer.style.display = 'none';
        }
    }

    async fetchUserProfile(userId) {
        console.log(`Fetching profile for user ${userId}...`);
        try {
            const { data, error, status } = await this.supabase
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
    }

    async handleAuthSubmit(e) {
        e.preventDefault();
        const email = this.elements.email?.value?.trim();
        const password = this.elements.password?.value;
        const fullName = this.elements.fullName?.value?.trim();

        if (!email || !password || (this.state.isSignUpMode && !fullName)) {
            this.showAuthError('Please fill in all required fields');
            return;
        }
        if (password.length < 6) {
            this.showAuthError('Password must be at least 6 characters');
            return;
        }

        try {
            this.setAuthLoading(true);
            this.clearAuthError();
            if (this.state.isSignUpMode) {
                await this.handleSignUp(fullName, email, password);
            } else {
                await this.handleSignIn(email, password);
            }
        } catch (error) {
            this.showAuthError(this.getFriendlyAuthError(error.message));
        } finally {
            this.setAuthLoading(false);
        }
    }

    async handleSignIn(email, password) {
        const { error } = await this.supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        this.showToast('Successfully signed in!', 'success');
    }

    async handleSignUp(fullName, email, password) {
        const { error } = await this.supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } }
        });
        if (error) throw error;
        this.showToast('Account created! Please check your email to confirm.', 'success');
    }

    async handleLogout() {
        const { error } = await this.supabase.auth.signOut();
        if (error) {
            this.showToast('Error logging out', 'error');
        } else {
            this.showToast('Successfully logged out', 'success');
        }
    }

    getFriendlyAuthError(message) {
        if (message.includes('Invalid login credentials')) return 'Invalid email or password';
        if (message.includes('Email not confirmed')) return 'Please check your email and confirm your account';
        if (message.includes('User already registered')) return 'An account with this email already exists';
        return 'An unexpected error occurred during authentication.';
    }

    toggleAuthMode() {
        this.state.isSignUpMode = !this.state.isSignUpMode;
        this.clearAuthError();
        const isSignUp = this.state.isSignUpMode;
        this.elements.authTitle.textContent = isSignUp ? 'Sign Up' : 'Sign In';
        this.elements.fullNameGroup.style.display = isSignUp ? 'block' : 'none';
        this.elements.authButtonText.textContent = isSignUp ? 'Sign Up' : 'Sign In';
        this.elements.authToggleLink.textContent = isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up';
        this.elements.fullName.required = isSignUp;
    }

    async initializeApp(user, profile) {
        if (!user) return;
        this.state.userId = user.id;
        const displayName = this.getDisplayName(user, profile);
        this.elements.userDisplayName.textContent = displayName;

        if (!this.state.isInitialized) {
            if (this.elements.messages) {
                Array.from(this.elements.messages.children).forEach(child => {
                    if (child.id !== 'thinking-indicator') {
                        this.elements.messages.removeChild(child);
                    }
                });
                this.addMessage('assistant', `👋 Hello ${displayName}! I'm your AI assistant with long-term memory. What can I help you with today?`);
            }
            this.state.isInitialized = true;
        }
    }

    getDisplayName(user, profile) {
        return profile?.full_name?.trim() || user.user_metadata?.full_name?.trim() || user.email;
    }

    async sendMessage() {
        const message = this.elements.messageInput?.value?.trim();
        if (!message || this.state.isLoading || !this.state.userId) return;

        if (message.length > 4000) {
            this.showToast('Message is too long (max 4000 characters)', 'error');
            return;
        }

        this.elements.messageInput.value = '';
        this.autoResizeInput();
        this.addMessage('user', message);
        this.state.conversationHistory.push({ role: 'user', content: message });

        this.setLoading(true);

        try {
            const response = await fetch(this.config.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    message,
                    user_id: this.state.userId,
                    conversation_id: this.state.conversationId,
                    conversation_history: this.state.conversationHistory.slice(-10)
                })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

            const data = await response.json();
            const responseText = data.response || 'Sorry, I received an empty response.';
            this.addMessage('assistant', responseText);
            this.state.conversationHistory.push({ role: 'assistant', content: responseText });

            if (this.state.conversationHistory.length > 20) {
                this.state.conversationHistory = this.state.conversationHistory.slice(-20);
            }
        } catch (error) {
            console.error('Send message error:', error);
            this.addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
            this.showToast('Failed to get a response from the assistant.', 'error');
        } finally {
            this.setLoading(false);
            this.elements.messageInput?.focus();
        }
    }

    addMessage(sender, content) {
        if (!this.elements.messages) return;
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;
        messageDiv.appendChild(contentDiv);
        this.elements.messages.insertBefore(messageDiv, this.elements.thinkingIndicator);
        this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
    }

    handleMessageInputKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
        }
    }

    autoResizeInput() {
        const input = this.elements.messageInput;
        if (!input) return;
        input.style.height = 'auto';
        input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
    }

    showLoading() {
        if (this.elements.loadingContainer) this.elements.loadingContainer.style.display = 'flex';
    }

    hideLoading() {
        if (this.elements.loadingContainer) this.elements.loadingContainer.style.display = 'none';
    }

    setLoading(loading) {
        this.state.isLoading = loading;
        if (this.elements.sendButton) this.elements.sendButton.disabled = loading;
        if (this.elements.messageInput) this.elements.messageInput.disabled = loading;
        if (this.elements.thinkingIndicator) {
            this.elements.thinkingIndicator.style.display = loading ? 'flex' : 'none';
            if (loading) {
                this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
            }
        }
    }

    setAuthLoading(loading) {
        this.elements.authSubmitButton.disabled = loading;
        const isSignUp = this.state.isSignUpMode;
        this.elements.authButtonText.textContent = loading 
            ? (isSignUp ? 'Signing up...' : 'Signing in...') 
            : (isSignUp ? 'Sign Up' : 'Sign In');
    }

    showAuthError(message) {
        if (this.elements.authError) this.elements.authError.textContent = message;
    }

    clearAuthError() {
        if (this.elements.authError) this.elements.authError.textContent = '';
    }

    showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type} show`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    generateConversationId() {
        return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

window.addEventListener('error', (e) => console.error('Global error:', e.error));
window.addEventListener('unhandledrejection', (e) => console.error('Unhandled promise rejection:', e.reason));

let app;
try {
    app = new AIMemoryAgent();
} catch (error) {
    console.error('Failed to initialize app:', error);
    document.body.innerHTML = '<div style="color: red; text-align: center; padding: 20px;"><h2>Application Error</h2><p>Could not initialize the application. Please refresh.</p></div>';
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('ServiceWorker registered:', reg.scope))
            .catch(err => console.log('ServiceWorker registration failed:', err));
    });
}
