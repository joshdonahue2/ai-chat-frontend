import { api } from './api.js';
import { ui } from './ui.js';
import { state } from './state.js';
import { initializeApp } from './app.js';

export const auth = {
    async handleAuthSubmit(e) {
        e.preventDefault();
        const email = ui.elements.email?.value?.trim();
        const password = ui.elements.password?.value;
        const fullName = ui.elements.fullName?.value?.trim();

        if (!email || !password || (state.isSignUpMode && !fullName)) {
            ui.showAuthError('Please fill in all required fields');
            return;
        }
        if (password.length < 6) {
            ui.showAuthError('Password must be at least 6 characters');
            return;
        }

        try {
            ui.setAuthLoading(true);
            ui.clearAuthError();
            if (state.isSignUpMode) {
                await this.handleSignUp(fullName, email, password);
            } else {
                await this.handleSignIn(email, password);
            }
        } catch (error) {
            ui.showAuthError(this.getFriendlyAuthError(error.message));
        } finally {
            ui.setAuthLoading(false);
        }
    },

    async handleSignIn(email, password) {
        const { error } = await api.getSupabase().auth.signInWithPassword({ email, password });
        if (error) throw error;
        ui.showToast('Successfully signed in!', 'success');
    },

    async handleSignUp(fullName, email, password) {
        const { error } = await api.getSupabase().auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName } }
        });
        if (error) throw error;
        ui.showToast('Account created! Please check your email to confirm.', 'success');
    },

    async handleLogout() {
        const { error } = await api.getSupabase().auth.signOut();
        if (error) {
            ui.showToast('Error logging out', 'error');
        } else {
            ui.showToast('Successfully logged out', 'success');
        }
    },

    getFriendlyAuthError(message) {
        if (message.includes('Invalid login credentials')) return 'Invalid email or password';
        if (message.includes('Email not confirmed')) return 'Please check your email and confirm your account';
        if (message.includes('User already registered')) return 'An account with this email already exists';
        return 'An unexpected error occurred during authentication.';
    },

    toggleAuthMode() {
        state.isSignUpMode = !state.isSignUpMode;
        ui.clearAuthError();
        const isSignUp = state.isSignUpMode;
        ui.elements.authTitle.textContent = isSignUp ? 'Sign Up' : 'Sign In';
        ui.elements.fullNameGroup.style.display = isSignUp ? 'block' : 'none';
        ui.elements.authButtonText.textContent = isSignUp ? 'Sign Up' : 'Sign In';
        ui.elements.authToggleLink.textContent = isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up';
        ui.elements.fullName.required = isSignUp;
    },

    async handleAuthStateChange(event, session) {
        console.log(`=== AUTH STATE CHANGE (post-init) === Event: ${event}`);
        if (event === 'SIGNED_IN') {
             console.log('User signed in manually. Initializing app UI.');
             try {
                 ui.forceShowAppScreen();
                 const profile = await api.fetchUserProfile(session.user.id);
                 await initializeApp(session.user, profile);
             } catch (error) {
                 console.error('❌ Error after sign-in:', error);
                 ui.showToast('Error loading app data', 'error');
             }
        } else if (event === 'SIGNED_OUT') {
            console.log('🔴 User signed out. Showing auth screen.');
            ui.forceShowAuthScreen();
            ui.hideLoading();
            state.userId = null;
            state.isInitialized = false;
        }
    }
};
