export const state = {
    isLoading: false,
    isInitialized: false,
    isSignUpMode: false,
    userId: null,
    conversationId: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    conversationHistory: []
};
