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
        // Direct element queries with debugging
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

        // Debug logging
        Object.entries(this.elements).forEach(([key, element]) => {
            console.log(`${key}: ${element ? 'FOUND' : 'MISSING'}`);
        });

        // Log current states
        console.log('Current element states:');
        console.log('Auth container display:', this.elements.authContainer?.style.display);
        console.log('App container display:', this.elements.appContainer?.style.display);
        console.log('Auth container classes:', this.elements.authContainer?.className);
        console.log('App container classes:', this.elements.appContainer?.className);
        console.log('=== END CACHING ===');
    }

    bindEvents() {
        // Auth form
        this.elements.authForm?.addEventListener('submit', (e) => this.handleAuthSubmit(e));
        this.elements.authToggleLink?.addEventListener('click', () => this.toggleAuthMode());

        // Chat
        this.elements.sendButton?.addEventListener('click', () => this.sendMessage());
        this.elements.messageInput?.addEventListener('keydown', (e) => this.handleMessageInputKeydown(e));
        this.elements.messageInput?.addEventListener('input', () => this.autoResizeInput());

        // Logout
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

        // Set up auth state listener first
        this.supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`=== AUTH STATE CHANGE ===`);
            console.log(`Event: ${event}`);
            console.log('User ID:', session?.user?.id);
            
            if (session?.user) {
                console.log('🟢 User session found. Initializing app...');
                try {
                    // Force immediate screen transition for debugging
                    console.log('🔄 Forcing screen transition...');
                    this.forceShowAppScreen();
                    
                    const profile = await this.fetchUserProfile(session.user.id);
                    await this.initializeApp(session.user, profile);
                } catch (error) {
                    console.error('❌ Error during app initialization:', error);
                    this.showToast('Error loading app', 'error');
                    // Still try to show the app screen
                    this.forceShowAppScreen();
                }
            } else {
                console.log('🔴 No user session. Showing auth screen.');
                this.forceShowAuthScreen();
                this.hideLoading();
                this.state.userId = null;
                this.state.isInitialized = false;
            }
            console.log('=== END AUTH STATE CHANGE ===');
        });

        // Check for initial session
        console.log('Checking for initial session...');
        const { data: { session } } = await this.supabase.auth.getSession();
        if (!session) {
            console.log('No initial session found.');
            this.forceShowAuthScreen();
            this.hideLoading();
        }
    }

    // FORCE METHODS FOR DEBUGGING
    forceShowAuthScreen() {
        console.log('🔧 FORCE SHOWING AUTH SCREEN');
        
        // Remove all classes and set direct styles
        if (this.elements.authContainer) {
            this.elements.authContainer.style.display = 'block';
            this.elements.authContainer.style.visibility = 'visible';
            this.elements.authContainer.style.opacity = '1';
            this.elements.authContainer.classList.remove('hidden');
            console.log('✅ Auth container forced visible');
        } else {
            console.error('❌ Auth container not found!');
        }
        
        if (this.elements.appContainer) {
            this.elements.appContainer.style.display = 'none';
            this.elements.appContainer.style.visibility = 'hidden';
            this.elements.appContainer.classList.remove('show');
            console.log('✅ App container forced hidden');
        } else {
            console.error('❌ App container not found!');
        }

        if (this.elements.loadingContainer) {
            this.elements.loadingContainer.style.display = 'none';
            this.elements.loadingContainer.classList.remove('show');
            console.log('✅ Loading container hidden');
        }
    }

    forceShowAppScreen() {
        console.log('🔧 FORCE SHOWING APP SCREEN');
        
        // Remove all classes and set direct styles
        if (this.elements.authContainer) {
            this.elements.authContainer.style.display = 'none';
            this.elements.authContainer.style.visibility = 'hidden';
            this.elements.authContainer.classList.add('hidden');
            console.log('✅ Auth container forced hidden');
        } else {
            console.error('❌ Auth container not found!');
        }
        
        if (this.elements.appContainer) {
            this.elements.appContainer.style.display = 'flex';
            this.elements.appContainer.style.visibility = 'visible';
            this.elements.appContainer.style.opacity = '1';
            this.elements.appContainer.classList.add('show');
            console.log('✅ App container forced visible');
        } else {
            console.error('❌ App container not found!');
        }

        if (this.elements.loadingContainer) {
            this.elements.loadingContainer.style.display = 'none';
            this.elements.loadingContainer.classList.remove('show');
            console.log('✅ Loading container hidden');
        }

        // Log final states
        console.log('Final element states:');
        console.log('Auth container display:', this.elements.authContainer?.style.display);
        console.log('App container display:', this.elements.appContainer?.style.display);
        console.log('Auth container classes:', this.elements.authContainer?.className);
        console.log('App container classes:', this.elements.appContainer?.className);
    }

    async fetchUserProfile(userId) {
        console.log(`Fetching profile for user ${userId}...`);
        try {
            const { data, error, status } = await this.supabase
                .from('profiles')
                .select('full_name')
                .eq('id', userId)
                .single();
            
            if (error && status !== 406) {
                console.error('Error fetching profile:', error);
                return null;
            }
            
            if (data) {
                console.log('Profile found:', data);
            } else {
                console.log('No profile found for user.');
            }
            return data;
        } catch (error) {
            console.error('Exception while fetching profile:', error);
            return null;
        }
    }

    // Auth Methods
    async handleAuthSubmit(e) {
        e.preventDefault();
        
        const email = this.elements.email?.value?.trim();
        const password = this.elements.password?.value;
        const fullName = this.elements.fullName?.value?.trim();

        if (!email || !password) {
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
            console.error('Auth error:', error);
            this.showAuthError('An unexpected error occurred');
        } finally {
            this.setAuthLoading(false);
        }
    }

    async handleSignIn(email, password) {
        console.log('Attempting sign in for:', email);
        const { error } = await this.supabase.auth.signInWithPassword({ email, password });
        
        if (error) {
            console.error('Sign in error:', error);
            this.showAuthError(this.getFriendlyAuthError(error.message));
            return;
        }
        
        console.log('Sign in successful');
        this.showToast('Successfully signed in!', 'success');
    }

    async handleSignUp(fullName, email, password) {
        if (!fullName) {
            this.showAuthError('Full name is required for sign up');
            return;
        }

        const { error } = await this.supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } }
        });

        if (error) {
            this.showAuthError(this.getFriendlyAuthError(error.message));
            return;
        }

        this.showToast('Account created! Please check your email to confirm.', 'success');
    }

    async handleLogout() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;
            this.showToast('Successfully logged out', 'success');
        } catch (error) {
            console.error('Logout error:', error);
            this.showToast('Error logging out', 'error');
        }
    }

    getFriendlyAuthError(errorMessage) {
        const errorMap = {
            'Invalid login credentials': 'Invalid email or password',
            'Email not confirmed': 'Please check your email and confirm your account',
            'User already registered': 'An account with this email already exists'
        };
        
        return errorMap[errorMessage] || errorMessage;
    }

    toggleAuthMode() {
        this.state.isSignUpMode = !this.state.isSignUpMode;
        this.clearAuthError();

        if (this.state.isSignUpMode) {
            this.elements.authTitle.textContent = 'Sign Up';
            this.elements.fullNameGroup.style.display = 'block';
            this.elements.authButtonText.textContent = 'Sign Up';
            this.elements.authToggleLink.textContent = 'Already have an account? Sign In';
            this.elements.fullName?.setAttribute('required', 'required');
        } else {
            this.elements.authTitle.textContent = 'Sign In';
            this.elements.fullNameGroup.style.display = 'none';
            this.elements.authButtonText.textContent = 'Sign In';
            this.elements.authToggleLink.textContent = 'Need an account? Sign Up';
            this.elements.fullName?.removeAttribute('required');
        }

        setTimeout(() => {
            if (this.state.isSignUpMode) {
                this.elements.fullName?.focus();
            } else {
                this.elements.email?.focus();
            }
        }, 100);
    }

    // Chat Methods
    async initializeApp(user, profile) {
        if (!user) {
            console.log('initializeApp called with no user.');
            return;
        }

        console.log('=== INITIALIZING APP ===');
        console.log('User:', user.id);
        console.log('Profile:', profile);

        this.state.userId = user.id;
        const displayName = this.getDisplayName(user, profile);
        
        if (this.elements.userDisplayName) {
            this.elements.userDisplayName.textContent = displayName;
            console.log('✅ Updated display name element');
        } else {
            console.error('❌ userDisplayName element not found!');
        }

        if (!this.state.isInitialized) {
            if (this.elements.messages) {
                this.elements.messages.innerHTML = '';
                this.addMessage('assistant', `👋 Hello ${displayName}! I'm your AI assistant with long-term memory. What can I help you with today?`);
                console.log('✅ Added welcome message');
            } else {
                console.error('❌ messages element not found!');
            }
            this.state.isInitialized = true;
        }
        
        console.log('=== APP INITIALIZATION COMPLETE ===');
    }

    getDisplayName(user, profile) {
        if (profile?.full_name?.trim()) {
            return profile.full_name;
        }
        if (user.user_metadata?.full_name?.trim()) {
            return user.user_metadata.full_name;
        }
        return user.email;
    }

    async sendMessage() {
        const message = this.elements.messageInput?.value?.trim();
        
        if (!message || this.state.isLoading || !this.state.userId) {
            return;
        }

        if (message.length > 4000) {
            this.showToast('Message is too long (max 4000 characters)', 'error');
            return;
        }

        this.elements.messageInput.value = '';
        this.autoResizeInput();
        this.addMessage('user', message);
        
        this.setLoading(true);
        const loadingMessage = this.addMessage('assistant', 'Thinking...', true);

        try {
            const response = await fetch(this.config.webhookUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    message,
                    user_id: this.state.userId,
                    conversation_id: this.state.conversationId,
                    conversation_history: this.state.conversationHistory.slice(-10)
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const responseText = data.response || 'Sorry, I received an empty response.';
            
            const contentDiv = loadingMessage.querySelector('.message-content');
            if (contentDiv) {
                contentDiv.textContent = responseText;
                contentDiv.classList.remove('loading');
            }
            
            this.state.conversationHistory.push(
                { role: 'user', content: message },
                { role: 'assistant', content: responseText }
            );

            if (this.state.conversationHistory.length > 20) {
                this.state.conversationHistory = this.state.conversationHistory.slice(-20);
            }

        } catch (error) {
            console.error('Send message error:', error);
            const errorText = `Sorry, I encountered an error: ${error.message}`;

            const contentDiv = loadingMessage.querySelector('.message-content');
            if (contentDiv) {
                contentDiv.textContent = errorText;
                contentDiv.classList.remove('loading');
            }
            this.showToast('Failed to send message', 'error');
        } finally {
            this.setLoading(false);
            this.elements.messageInput?.focus();
        }
    }

    addMessage(sender, content, isLoading = false) {
        if (!this.elements.messages) {
            console.warn('Messages container not found');
            return null;
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        messageDiv.setAttribute('data-sender', sender);
        
        const contentDiv = document.createElement('div');
        contentDiv.className = `message-content ${isLoading ? 'loading' : ''}`;
        
        if (isLoading) {
            contentDiv.innerHTML = '<span>Thinking...</span>';
        } else {
            contentDiv.textContent = content;
        }
        
        messageDiv.appendChild(contentDiv);
        this.elements.messages.appendChild(messageDiv);
        
        requestAnimationFrame(() => {
            this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
        });

        return messageDiv;
    }

    handleMessageInputKeydown(e) {
        if (e.key === 'Enter') {
            if (e.shiftKey) {
                return;
            } else {
                e.preventDefault();
                this.sendMessage();
            }
        }
    }

    autoResizeInput() {
        const input = this.elements.messageInput;
        if (!input) return;

        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    }

    // Simplified UI State Management
    showLoading() {
        console.log('Showing loading screen');
        if (this.elements.loadingContainer) {
            this.elements.loadingContainer.style.display = 'flex';
            this.elements.loadingContainer.classList.add('show');
        }
    }

    hideLoading() {
        console.log('Hiding loading screen');
        if (this.elements.loadingContainer) {
            this.elements.loadingContainer.style.display = 'none';
            this.elements.loadingContainer.classList.remove('show');
        }
    }

    showAuthScreen() {
        console.log('⚠️  Using legacy showAuthScreen - use forceShowAuthScreen instead');
        this.forceShowAuthScreen();
    }

    showAppScreen() {
        console.log('⚠️  Using legacy showAppScreen - use forceShowAppScreen instead');
        this.forceShowAppScreen();
    }

    setLoading(loading) {
        this.state.isLoading = loading;
        
        if (this.elements.sendButton) {
            this.elements.sendButton.disabled = loading;
        }
        if (this.elements.messageInput) {
            this.elements.messageInput.disabled = loading;
        }
    }

    setAuthLoading(loading) {
        if (this.elements.authSubmitButton) {
            this.elements.authSubmitButton.disabled = loading;
        }
        
        if (this.elements.authButtonText) {
            this.elements.authButtonText.textContent = loading 
                ? (this.state.isSignUpMode ? 'Signing up...' : 'Signing in...') 
                : (this.state.isSignUpMode ? 'Sign Up' : 'Sign In');
        }
    }

    showAuthError(message) {
        if (this.elements.authError) {
            this.elements.authError.textContent = message;
        }
        
        [this.elements.email, this.elements.password, this.elements.fullName]
            .filter(Boolean)
            .forEach(input => input.classList.add('error'));
        
        setTimeout(() => {
            [this.elements.email, this.elements.password, this.elements.fullName]
                .filter(Boolean)
                .forEach(input => input.classList.remove('error'));
        }, 3000);
    }

    clearAuthError() {
        if (this.elements.authError) {
            this.elements.authError.textContent = '';
        }
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        const container = document.getElementById('toast-container') || document.body;
        container.appendChild(toast);
        
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (container.contains(toast)) {
                    container.removeChild(toast);
                }
            }, 300);
        }, 4000);
    }

    generateConversationId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `conv_${timestamp}_${random}`;
    }

    handleGlobalError(error) {
        console.error('Global error:', error);
        this.showToast('An unexpected error occurred', 'error');
    }
}

// Global error handling
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
});

// Initialize app
let app;

async function initializeApp() {
    try {
        app = new AIMemoryAgent();
    } catch (error) {
        console.error('Failed to initialize app:', error);
        document.body.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #ef4444;">
                <h2>Application Error</h2>
                <p>Failed to initialize the application. Please refresh the page.</p>
                <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 10px; background: #4a90e2; color: white; border: none; border-radius: 5px; cursor: pointer;">
                    Refresh Page
                </button>
            </div>
        `;
    }
}

initializeApp();

if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('ServiceWorker registered successfully:', registration.scope);
        } catch (error) {
            console.log('ServiceWorker registration failed:', error);
        }
    });
}