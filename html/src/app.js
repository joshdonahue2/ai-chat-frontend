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
    ui.elements.navImagen?.addEventListener('click', () => ui.showScreen('imagenContainer'));
    ui.elements.navHistory?.addEventListener('click', () => {
        ui.showScreen('historyContainer');
        loadHistory();
    });
    ui.elements.navSettings?.addEventListener('click', () => ui.showScreen('settingsContainer'));

    ui.elements.micButton?.addEventListener('click', () => console.log('Mic button clicked'));

    // Imagen events
    ui.elements.imageForm?.addEventListener('submit', (e) => handleImageGeneration(e));

    console.log('Events bound successfully');
}

async function handleImageGeneration(e) {
    e.preventDefault();
    const prompt = ui.elements.imageForm.prompt.value.trim();
    if (!prompt) return;

    setImagenLoading(true);
    hideImagenResult();
    showImagenStatus('Sending your request to the AI...', 'loading');
    showImagenProgress(10);

    try {
        const data = await api.generateImage(prompt);
        showImagenProgress(30);
        showImagenStatus('Your image is being generated...', 'loading');
        await pollForImageResult(data.taskId);
    } catch (error) {
        console.error('Generation error:', error);
        showImagenStatus(`Error: ${error.message}`, 'error');
    } finally {
        setImagenLoading(false);
        hideImagenProgress();
    }
}

async function pollForImageResult(taskId) {
    let attempts = 0;
    const maxAttempts = 120;
    let lastStatus = 'pending';

    const poll = async (resolve, reject) => {
        attempts++;
        if (attempts > maxAttempts) {
            clearInterval(state.pollInterval);
            showImagenStatus('Generation timed out after 10 minutes.', 'error');
            return reject(new Error('Generation timed out'));
        }

        try {
            const data = await api.getImageStatus(taskId);
            if (data.status !== lastStatus) {
                lastStatus = data.status;
                updateImagenStatusMessage(data.status, attempts);
            }

            if (data.status === 'completed' && data.imageData) {
                clearInterval(state.pollInterval);
                showImagenProgress(100);
                await displayImagenResult(data.imageData);
                resolve();
            } else if (data.status === 'error') {
                clearInterval(state.pollInterval);
                showImagenStatus(`Generation failed: ${data.error || 'Unknown error'}`, 'error');
                reject(new Error(data.error || 'Unknown error'));
            } else {
                let progress = 30;
                if (data.status === 'processing') {
                    progress = Math.min(40 + (attempts * 1), 85);
                } else {
                    progress = Math.min(30 + (attempts * 0.5), 70);
                }
                showImagenProgress(progress);
                state.pollInterval = setTimeout(() => poll(resolve, reject), 5000);
            }
        } catch (error) {
            console.error('Polling error:', error);
            // Don't reject on polling error, just keep trying
        }
    };

    return new Promise((resolve, reject) => {
        state.pollInterval = setTimeout(() => poll(resolve, reject), 5000);
    });
}

function updateImagenStatusMessage(status, attempts) {
    const elapsed = Math.floor(attempts * 5 / 60);
    const minutes = elapsed > 0 ? ` (${elapsed}m elapsed)` : '';
    switch (status) {
        case 'pending':
            showImagenStatus(`Sending request to n8n...${minutes}`, 'loading');
            break;
        case 'processing':
            showImagenStatus(`AI is generating your image...${minutes}`, 'loading');
            break;
        default:
            showImagenStatus(`Processing your request...${minutes}`, 'loading');
    }
}

async function displayImagenResult(base64Data) {
    const existingImage = ui.elements.generatedImage;
    try {
        if (!base64Data || typeof base64Data !== 'string') {
            throw new Error('Invalid or missing base64 data.');
        }
        const imageUrl = `data:image/png;base64,${base64Data.replace(/\s/g, '')}`;
        const preloader = new Image();
        preloader.onload = () => {
            existingImage.src = preloader.src;
            showImagenResult();
            showImagenStatus('Image generated successfully!', 'success');
        };
        preloader.onerror = () => {
            showImagenStatus('Error: The generated image data was corrupt.', 'error');
        };
        preloader.src = imageUrl;
    } catch (error) {
        showImagenStatus(`Failed to display image: ${error.message}`, 'error');
    }
}

function hideImagenResult() {
    ui.elements.resultSection.style.display = 'none';
    ui.elements.generatedImage.src = '';
}

function showImagenResult() {
    ui.elements.resultSection.style.display = 'block';
}

function setImagenLoading(loading) {
    ui.elements.generateBtn.disabled = loading;
    ui.elements.loadingSpinner.style.display = loading ? 'inline-block' : 'none';
    ui.elements.btnText.textContent = loading ? 'Generating...' : 'Generate Image';
}

function showImagenStatus(message, type) {
    ui.elements.status.textContent = message;
    ui.elements.status.className = `status ${type}`;
    ui.elements.status.style.display = 'block';
}

function showImagenProgress(percentage) {
    ui.elements.progressBar.style.display = 'block';
    ui.elements.progressFill.style.width = `${percentage}%`;
}

function hideImagenProgress() {
    ui.elements.progressBar.style.display = 'none';
    ui.elements.progressFill.style.width = '0%';
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
