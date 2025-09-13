import { api } from './api.js';
import { auth } from './auth.js';
import { ui } from './ui.js';
import { state } from './state.js';

function getDisplayName(user, profile) {
    return profile?.full_name?.trim() || user.user_metadata?.full_name?.trim() || user.email;
}

export async function initializeApp(user, profile) {
    if (!user) return;
    state.userId = user.id;
    const displayName = getDisplayName(user, profile);

    if (!state.isInitialized) {
        if (ui.elements.messages) {
            Array.from(ui.elements.messages.children).forEach(child => {
                if (child.id !== 'thinking-indicator') {
                    ui.elements.messages.removeChild(child);
                }
            });

            ui.addMessage('assistant', `👋 Hello ${displayName}! I'm your AI assistant with long-term memory. What can I help you with today?`);
        }
        state.isInitialized = true;
    }
}

async function handleMessageSend() {
    const message = ui.elements.messageInput?.value?.trim();
    if (!message || state.isLoading || !state.userId) return;

    if (message.length > 4000) {
        ui.showToast('Message is too long (max 4000 characters)', 'error');
        return;
    }

    ui.elements.messageInput.value = '';
    ui.autoResizeInput();
    ui.addMessage('user', message);
    state.conversationHistory.push({ role: 'user', content: message });

    ui.setLoading(true);

    try {
        await api.sendMessage(message);
    } finally {
        ui.setLoading(false);
        ui.elements.messageInput?.focus();
    }
}

function handleMessageInputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleMessageSend();
    }
}

async function loadHistory() {
    if (!ui.elements.historyList) return;
    ui.elements.historyList.innerHTML = '<li>Loading history...</li>';

    try {
        const history = await api.fetchHistory();
        ui.elements.historyList.innerHTML = ''; // Clear loading message

        if (history.length === 0) {
            ui.elements.historyList.innerHTML = '<li>No history found.</li>';
            return;
        }

        history.forEach(message => {
            const li = document.createElement('li');
            li.className = `history-item history-item-${message.role}`;
            li.textContent = message.content;
            ui.elements.historyList.appendChild(li);
        });
    } catch (error) {
        console.error('Failed to load history:', error);
        ui.elements.historyList.innerHTML = '<li>Error loading history.</li>';
        ui.showToast('Failed to load chat history.', 'error');
    }
}

function bindEvents() {
    ui.elements.authForm?.addEventListener('submit', (e) => auth.handleAuthSubmit(e));
    ui.elements.authToggleLink?.addEventListener('click', () => auth.toggleAuthMode());
    ui.elements.sendButton?.addEventListener('click', () => handleMessageSend());
    ui.elements.messageInput?.addEventListener('keydown', (e) => handleMessageInputKeydown(e));
    ui.elements.messageInput?.addEventListener('input', () => ui.autoResizeInput());
    ui.elements.logoutButton?.addEventListener('click', () => auth.handleLogout());

    // Navigation events
    ui.elements.backButton?.addEventListener('click', () => ui.showScreen('appContainer'));
    ui.elements.settingsButton?.addEventListener('click', () => ui.showScreen('settingsContainer'));
    ui.elements.navChat?.addEventListener('click', () => ui.showScreen('appContainer'));
    ui.elements.navHistory?.addEventListener('click', () => {
        ui.showScreen('historyContainer');
        loadHistory();
    });
    ui.elements.navSettings?.addEventListener('click', () => ui.showScreen('settingsContainer'));
    ui.elements.navImagen?.addEventListener('click', () => loadImagenApp());

    ui.elements.micButton?.addEventListener('click', () => console.log('Mic button clicked'));

    console.log('Events bound successfully');
}

async function loadImagenApp() {
    ui.showScreen('imagenContainer');
    const imagenContainer = ui.elements.imagenContainer;
    if (imagenContainer.innerHTML.trim() === '') {
        imagenContainer.innerHTML = '<p>Loading Imagen app...</p>';
        try {
            const response = await fetch('/imagen/');
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Clear the container
            imagenContainer.innerHTML = '';

            // Append styles
            const styles = doc.head.querySelectorAll('style');
            styles.forEach(style => {
                imagenContainer.appendChild(style.cloneNode(true));
            });

            // Append body content
            const bodyContent = doc.body.innerHTML;
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = bodyContent;
            Array.from(tempDiv.children).forEach(child => {
                imagenContainer.appendChild(child);
            });

            // Execute scripts
            const scripts = doc.body.querySelectorAll('script');
            scripts.forEach(script => {
                const newScript = document.createElement('script');
                if (script.src) {
                    // Adjust script src if it's relative
                    const scriptUrl = new URL(script.src, window.location.origin + '/imagen/');
                    newScript.src = scriptUrl.href;
                } else {
                    newScript.textContent = script.textContent;
                }
                document.body.appendChild(newScript).remove(); // Append and remove to execute
            });
        } catch (error) {
            console.error('Failed to load Imagen app:', error);
            imagenContainer.innerHTML = '<p>Failed to load Imagen app. Please try again later.</p>';
        }
    }
}

async function init() {
    try {
        await new Promise(resolve => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });

        ui.cacheElements();
        bindEvents();
        const supabase = await api.initializeSupabase();

        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
            console.log('🟢 Initial session found. Initializing app UI...');
            try {
                ui.forceShowAppScreen();
                const profile = await api.fetchUserProfile(session.user.id);
                await initializeApp(session.user, profile);
            } catch (error) {
                console.error('❌ Error during initial app initialization:', error);
                ui.showToast('Error loading app data', 'error');
                ui.forceShowAuthScreen();
            }
        } else {
            console.log('🔴 No initial session found. Showing auth screen.');
            ui.forceShowAuthScreen();
            ui.hideLoading();
        }

        supabase.auth.onAuthStateChange(auth.handleAuthStateChange);

        console.log('App initialized successfully');
    } catch (error) {
        console.error('Failed to initialize app:', error);
        ui.showToast('Failed to initialize app', 'error');
    }
}

// Global error handlers
window.addEventListener('error', (e) => console.error('Global error:', e.error));
window.addEventListener('unhandledrejection', (e) => console.error('Unhandled promise rejection:', e.reason));

// PWA Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('ServiceWorker registered:', reg.scope))
            .catch(err => console.log('ServiceWorker registration failed:', err));
    });
}

// Start the app
init();
