import { state } from './state.js';

export const ui = {
    elements: {},

    screenElements: [
        'appContainer',
        'historyContainer',
        'settingsContainer',
        'imagenContainer',
    ],

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
        this.elements.navSettings = document.getElementById('nav-settings');
        this.elements.settingsContainer = document.getElementById('settings-container');
        this.elements.backButton = document.getElementById('back-button');
        this.elements.logoutButton = document.getElementById('logout-button');
        this.elements.historyContainer = document.getElementById('history-container');
        this.elements.historyList = document.getElementById('history-list');
        this.elements.bottomNav = document.querySelector('.bottom-nav');
        this.elements.navImagen = document.getElementById('nav-imagen');
        this.elements.imagenContainer = document.getElementById('imagen-container');
        this.elements.imageModal = document.getElementById('imageModal');
        this.elements.modalImage = document.getElementById('modalImage');
        this.elements.imageForm = document.getElementById('imageForm');
        this.elements.generateBtn = document.getElementById('generateBtn');
        this.elements.btnText = document.getElementById('btnText');
        this.elements.loadingSpinner = document.querySelector('.loading-spinner');
        this.elements.status = document.getElementById('status');
        this.elements.resultSection = document.getElementById('resultSection');
        this.elements.generatedImage = document.getElementById('generatedImage');
        this.elements.downloadBtn = document.getElementById('downloadBtn');
        this.elements.progressBar = document.getElementById('progressBar');
        this.elements.progressFill = document.getElementById('progressFill');
        this.elements.imagenHistoryPage = document.getElementById('historyPage');
        this.elements.imagenHistoryList = document.getElementById('historyList');

        Object.entries(this.elements).forEach(([key, element]) => {
            console.log(`${key}: ${element ? 'FOUND' : 'MISSING'}`);
        });
        console.log('=== END CACHING ===');
    },

    showScreen(screenId) {
        this.screenElements.forEach(key => {
            const element = this.elements[key];
            if (element) {
                element.classList.add('hidden');
            }
        });

        const screenToShow = this.elements[screenId];
        if (screenToShow) {
            screenToShow.classList.remove('hidden');
        }

        this.elements.navChat?.classList.toggle('active', screenId === 'appContainer');
        this.elements.navImagen?.classList.toggle('active', screenId === 'imagenContainer');
        this.elements.navHistory?.classList.toggle('active', screenId === 'historyContainer');
        this.elements.navSettings?.classList.toggle('active', screenId === 'settingsContainer');
    },

    forceShowAuthScreen() {
        this.elements.authContainer?.classList.remove('hidden');
        this.elements.bottomNav?.classList.add('hidden');
        this.screenElements.forEach(key => this.elements[key]?.classList.add('hidden'));
        this.elements.loadingContainer?.classList.add('hidden');
    },

    forceShowAppScreen() {
        this.elements.authContainer?.classList.add('hidden');
        this.elements.bottomNav?.classList.remove('hidden');
        this.elements.loadingContainer?.classList.add('hidden');
        this.showScreen('appContainer');
    },

    showSettingsPage() {
        this.showScreen('settingsContainer');
    },

    hideSettingsPage() {
        this.showScreen('appContainer');
    },
    
    showHistoryPage() {
        this.showScreen('historyContainer');
    },

    hideHistoryPage() {
        this.showScreen('appContainer');
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
        this.elements.loadingContainer?.classList.remove('hidden');
    },

    hideLoading() {
        this.elements.loadingContainer?.classList.add('hidden');
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