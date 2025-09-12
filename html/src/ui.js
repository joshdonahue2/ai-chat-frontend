import { state } from './state.js';

export const ui = {
    elements: {},

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
        this.elements.settingsButton = document.getElementById('settings-button');
        this.elements.micButton = document.getElementById('mic-button');
        this.elements.messages = document.getElementById('messages');
        this.elements.messageInput = document.getElementById('messageInput');
        this.elements.sendButton = document.getElementById('sendButton');
        this.elements.thinkingIndicator = document.getElementById('thinking-indicator');
        this.elements.navChat = document.getElementById('nav-chat');
        this.elements.navHistory = document.getElementById('nav-history');
        this.elements.navProfile = document.getElementById('nav-profile');
        this.elements.settingsContainer = document.getElementById('settings-container');
        this.elements.backButton = document.getElementById('back-button');
        this.elements.logoutButton = document.getElementById('logout-button');

        Object.entries(this.elements).forEach(([key, element]) => {
            console.log(`${key}: ${element ? 'FOUND' : 'MISSING'}`);
        });
        console.log('=== END CACHING ===');
    },

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
    },

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
    },

    showSettingsPage() {
        if (this.elements.appContainer) {
            this.elements.appContainer.style.display = 'none';
        }
        if (this.elements.settingsContainer) {
            this.elements.settingsContainer.style.display = 'flex';
        }
    },

    hideSettingsPage() {
        if (this.elements.settingsContainer) {
            this.elements.settingsContainer.style.display = 'none';
        }
        if (this.elements.appContainer) {
            this.elements.appContainer.style.display = 'flex';
        }
    },

    addMessage(sender, content) {
        if (!this.elements.messages) return;
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;

        const avatar = document.createElement('img');
        avatar.className = 'avatar';
        avatar.src = sender === 'user' ? 'user-avatar.png' : 'assistant-avatar.png';
        avatar.alt = sender;
        messageDiv.appendChild(avatar);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;
        messageDiv.appendChild(contentDiv);

        this.elements.messages.insertBefore(messageDiv, this.elements.thinkingIndicator);
        this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
    },

    autoResizeInput() {
        const input = this.elements.messageInput;
        if (!input) return;
        input.style.height = 'auto';
        input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
    },

    showLoading() {
        if (this.elements.loadingContainer) this.elements.loadingContainer.style.display = 'flex';
    },

    hideLoading() {
        if (this.elements.loadingContainer) this.elements.loadingContainer.style.display = 'none';
    },

    setLoading(loading) {
        state.isLoading = loading;
        if (this.elements.sendButton) this.elements.sendButton.disabled = loading;
        if (this.elements.messageInput) this.elements.messageInput.disabled = loading;
        if (this.elements.thinkingIndicator) {
            this.elements.thinkingIndicator.style.display = loading ? 'flex' : 'none';
            if (loading) {
                this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
            }
        }
    },

    setAuthLoading(loading) {
        this.elements.authSubmitButton.disabled = loading;
        const isSignUp = state.isSignUpMode;
        this.elements.authButtonText.textContent = loading
            ? (isSignUp ? 'Signing up...' : 'Signing in...')
            : (isSignUp ? 'Sign Up' : 'Sign In');
    },

    showAuthError(message) {
        if (this.elements.authError) this.elements.authError.textContent = message;
    },

    clearAuthError() {
        if (this.elements.authError) this.elements.authError.textContent = '';
    },

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
};
