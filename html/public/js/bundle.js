(() => {
  // html/src/config.js
  var config = {
    supabaseUrl: "https://supabase.donahuenet.xyz",
    supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE",
    webhookUrl: "https://n8n.donahuenet.xyz/webhook/ai-chat"
  };

  // html/src/state.js
  var state2 = {
    isLoading: false,
    isInitialized: false,
    isSignUpMode: false,
    userId: null,
    conversationId: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    conversationHistory: []
  };

  // html/src/ui.js
  var ui = {
    elements: {},
    cacheElements() {
      console.log("=== CACHING ELEMENTS ===");
      this.elements.authContainer = document.getElementById("auth-container");
      this.elements.appContainer = document.getElementById("app-container");
      this.elements.loadingContainer = document.getElementById("loading-container");
      this.elements.authForm = document.getElementById("auth-form");
      this.elements.authError = document.getElementById("auth-error");
      this.elements.authTitle = document.getElementById("auth-title");
      this.elements.fullNameGroup = document.getElementById("full-name-group");
      this.elements.fullName = document.getElementById("full_name");
      this.elements.email = document.getElementById("email");
      this.elements.password = document.getElementById("password");
      this.elements.authSubmitButton = document.getElementById("auth-submit-button");
      this.elements.authButtonText = document.getElementById("auth-button-text");
      this.elements.authToggleLink = document.getElementById("auth-toggle-link");
      this.elements.userDisplayName = document.getElementById("user-display-name");
      this.elements.logoutButton = document.getElementById("logout-button");
      this.elements.messages = document.getElementById("messages");
      this.elements.messageInput = document.getElementById("messageInput");
      this.elements.sendButton = document.getElementById("sendButton");
      this.elements.thinkingIndicator = document.getElementById("thinking-indicator");
      Object.entries(this.elements).forEach(([key, element]) => {
        console.log(`${key}: ${element ? "FOUND" : "MISSING"}`);
      });
      console.log("=== END CACHING ===");
    },
    forceShowAuthScreen() {
      if (this.elements.authContainer) {
        this.elements.authContainer.style.display = "block";
        this.elements.authContainer.classList.remove("hidden");
      }
      if (this.elements.appContainer) {
        this.elements.appContainer.style.display = "none";
        this.elements.appContainer.classList.remove("show");
      }
      if (this.elements.loadingContainer) {
        this.elements.loadingContainer.style.display = "none";
      }
    },
    forceShowAppScreen() {
      if (this.elements.authContainer) {
        this.elements.authContainer.style.display = "none";
        this.elements.authContainer.classList.add("hidden");
      }
      if (this.elements.appContainer) {
        this.elements.appContainer.style.display = "flex";
        this.elements.appContainer.classList.add("show");
      }
      if (this.elements.loadingContainer) {
        this.elements.loadingContainer.style.display = "none";
      }
    },
    addMessage(sender, content) {
      if (!this.elements.messages) return;
      const messageDiv = document.createElement("div");
      messageDiv.className = `message ${sender}`;
      const contentDiv = document.createElement("div");
      contentDiv.className = "message-content";
      contentDiv.textContent = content;
      messageDiv.appendChild(contentDiv);
      this.elements.messages.insertBefore(messageDiv, this.elements.thinkingIndicator);
      this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
    },
    autoResizeInput() {
      const input = this.elements.messageInput;
      if (!input) return;
      input.style.height = "auto";
      input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
    },
    showLoading() {
      if (this.elements.loadingContainer) this.elements.loadingContainer.style.display = "flex";
    },
    hideLoading() {
      if (this.elements.loadingContainer) this.elements.loadingContainer.style.display = "none";
    },
    setLoading(loading) {
      state.isLoading = loading;
      if (this.elements.sendButton) this.elements.sendButton.disabled = loading;
      if (this.elements.messageInput) this.elements.messageInput.disabled = loading;
      if (this.elements.thinkingIndicator) {
        this.elements.thinkingIndicator.style.display = loading ? "flex" : "none";
        if (loading) {
          this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
        }
      }
    },
    setAuthLoading(loading) {
      this.elements.authSubmitButton.disabled = loading;
      const isSignUp = state.isSignUpMode;
      this.elements.authButtonText.textContent = loading ? isSignUp ? "Signing up..." : "Signing in..." : isSignUp ? "Sign Up" : "Sign In";
    },
    showAuthError(message) {
      if (this.elements.authError) this.elements.authError.textContent = message;
    },
    clearAuthError() {
      if (this.elements.authError) this.elements.authError.textContent = "";
    },
    showToast(message, type = "success") {
      const toastContainer = document.getElementById("toast-container");
      if (!toastContainer) return;
      const toast = document.createElement("div");
      toast.className = `toast ${type} show`;
      toast.textContent = message;
      toastContainer.appendChild(toast);
      setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
      }, 4e3);
    }
  };

  // html/src/api.js
  var supabase;
  var api = {
    async initializeSupabase() {
      if (typeof window.supabase === "undefined") {
        throw new Error("Supabase library not loaded");
      }
      console.log("Initializing Supabase...");
      const { createClient } = window.supabase;
      supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
      return supabase;
    },
    getSupabase() {
      return supabase;
    },
    async fetchUserProfile(userId) {
      console.log(`Fetching profile for user ${userId}...`);
      try {
        const { data, error, status } = await supabase.from("profiles").select("full_name").eq("id", userId).single();
        if (error && status !== 406) throw error;
        return data;
      } catch (error) {
        console.error("Exception while fetching profile:", error);
        return null;
      }
    },
    async sendMessage(message) {
      try {
        const response = await fetch(config.webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({
            message,
            user_id: state2.userId,
            conversation_id: state2.conversationId,
            conversation_history: state2.conversationHistory.slice(-10)
          })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const data = await response.json();
        const responseText = data.response || "Sorry, I received an empty response.";
        ui.addMessage("assistant", responseText);
        state2.conversationHistory.push({ role: "assistant", content: responseText });
        if (state2.conversationHistory.length > 20) {
          state2.conversationHistory = state2.conversationHistory.slice(-20);
        }
      } catch (error) {
        console.error("Send message error:", error);
        ui.addMessage("assistant", "Sorry, I encountered an error. Please try again.");
        ui.showToast("Failed to get a response from the assistant.", "error");
      }
    }
  };

  // html/src/auth.js
  var auth = {
    async handleAuthSubmit(e) {
      e.preventDefault();
      const email = ui.elements.email?.value?.trim();
      const password = ui.elements.password?.value;
      const fullName = ui.elements.fullName?.value?.trim();
      if (!email || !password || state2.isSignUpMode && !fullName) {
        ui.showAuthError("Please fill in all required fields");
        return;
      }
      if (password.length < 6) {
        ui.showAuthError("Password must be at least 6 characters");
        return;
      }
      try {
        ui.setAuthLoading(true);
        ui.clearAuthError();
        if (state2.isSignUpMode) {
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
      ui.showToast("Successfully signed in!", "success");
    },
    async handleSignUp(fullName, email, password) {
      const { error } = await api.getSupabase().auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      });
      if (error) throw error;
      ui.showToast("Account created! Please check your email to confirm.", "success");
    },
    async handleLogout() {
      const { error } = await api.getSupabase().auth.signOut();
      if (error) {
        ui.showToast("Error logging out", "error");
      } else {
        ui.showToast("Successfully logged out", "success");
      }
    },
    getFriendlyAuthError(message) {
      if (message.includes("Invalid login credentials")) return "Invalid email or password";
      if (message.includes("Email not confirmed")) return "Please check your email and confirm your account";
      if (message.includes("User already registered")) return "An account with this email already exists";
      return "An unexpected error occurred during authentication.";
    },
    toggleAuthMode() {
      state2.isSignUpMode = !state2.isSignUpMode;
      ui.clearAuthError();
      const isSignUp = state2.isSignUpMode;
      ui.elements.authTitle.textContent = isSignUp ? "Sign Up" : "Sign In";
      ui.elements.fullNameGroup.style.display = isSignUp ? "block" : "none";
      ui.elements.authButtonText.textContent = isSignUp ? "Sign Up" : "Sign In";
      ui.elements.authToggleLink.textContent = isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up";
      ui.elements.fullName.required = isSignUp;
    },
    async handleAuthStateChange(event, session) {
      console.log(`=== AUTH STATE CHANGE (post-init) === Event: ${event}`);
      if (event === "SIGNED_IN") {
        console.log("User signed in manually. Initializing app UI.");
        try {
          ui.forceShowAppScreen();
          const profile = await api.fetchUserProfile(session.user.id);
          await initializeApp(session.user, profile);
        } catch (error) {
          console.error("\u274C Error after sign-in:", error);
          ui.showToast("Error loading app data", "error");
        }
      } else if (event === "SIGNED_OUT") {
        console.log("\u{1F534} User signed out. Showing auth screen.");
        ui.forceShowAuthScreen();
        ui.hideLoading();
        state2.userId = null;
        state2.isInitialized = false;
      }
    }
  };

  // html/src/app.js
  function getDisplayName(user, profile) {
    return profile?.full_name?.trim() || user.user_metadata?.full_name?.trim() || user.email;
  }
  async function initializeApp(user, profile) {
    if (!user) return;
    state2.userId = user.id;
    const displayName = getDisplayName(user, profile);
    ui.elements.userDisplayName.textContent = displayName;
    if (!state2.isInitialized) {
      if (ui.elements.messages) {
        Array.from(ui.elements.messages.children).forEach((child) => {
          if (child.id !== "thinking-indicator") {
            ui.elements.messages.removeChild(child);
          }
        });
        ui.addMessage("assistant", `\u{1F44B} Hello ${displayName}! I'm your AI assistant with long-term memory. What can I help you with today?`);
      }
      state2.isInitialized = true;
    }
  }
  async function handleMessageSend() {
    const message = ui.elements.messageInput?.value?.trim();
    if (!message || state2.isLoading || !state2.userId) return;
    if (message.length > 4e3) {
      ui.showToast("Message is too long (max 4000 characters)", "error");
      return;
    }
    ui.elements.messageInput.value = "";
    ui.autoResizeInput();
    ui.addMessage("user", message);
    state2.conversationHistory.push({ role: "user", content: message });
    ui.setLoading(true);
    try {
      await api.sendMessage(message);
    } finally {
      ui.setLoading(false);
      ui.elements.messageInput?.focus();
    }
  }
  function handleMessageInputKeydown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleMessageSend();
    }
  }
  function bindEvents() {
    ui.elements.authForm?.addEventListener("submit", (e) => auth.handleAuthSubmit(e));
    ui.elements.authToggleLink?.addEventListener("click", () => auth.toggleAuthMode());
    ui.elements.sendButton?.addEventListener("click", () => handleMessageSend());
    ui.elements.messageInput?.addEventListener("keydown", (e) => handleMessageInputKeydown(e));
    ui.elements.messageInput?.addEventListener("input", () => ui.autoResizeInput());
    ui.elements.logoutButton?.addEventListener("click", () => auth.handleLogout());
    console.log("Events bound successfully");
  }
  async function init() {
    try {
      await new Promise((resolve) => {
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", resolve);
        } else {
          resolve();
        }
      });
      ui.cacheElements();
      bindEvents();
      const supabase2 = await api.initializeSupabase();
      const { data: { session } } = await supabase2.auth.getSession();
      if (session?.user) {
        console.log("\u{1F7E2} Initial session found. Initializing app UI...");
        try {
          ui.forceShowAppScreen();
          const profile = await api.fetchUserProfile(session.user.id);
          await initializeApp(session.user, profile);
        } catch (error) {
          console.error("\u274C Error during initial app initialization:", error);
          ui.showToast("Error loading app data", "error");
          ui.forceShowAuthScreen();
        }
      } else {
        console.log("\u{1F534} No initial session found. Showing auth screen.");
        ui.forceShowAuthScreen();
        ui.hideLoading();
      }
      supabase2.auth.onAuthStateChange(auth.handleAuthStateChange);
      console.log("App initialized successfully");
    } catch (error) {
      console.error("Failed to initialize app:", error);
      ui.showToast("Failed to initialize app", "error");
    }
  }
  window.addEventListener("error", (e) => console.error("Global error:", e.error));
  window.addEventListener("unhandledrejection", (e) => console.error("Unhandled promise rejection:", e.reason));
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").then((reg) => console.log("ServiceWorker registered:", reg.scope)).catch((err) => console.log("ServiceWorker registration failed:", err));
    });
  }
  init();
})();
