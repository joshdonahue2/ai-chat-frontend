#!/bin/bash

# AI Image Generator Setup Script
# This script sets up the complete project structure

set -e

echo "🚀 Setting up AI Image Generator..."

# Create project directory structure
echo "📁 Creating directory structure..."
mkdir -p public
mkdir -p logs

# Copy the HTML file to public directory
echo "📄 Setting up frontend files..."
cat > public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Image Generator</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .container {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            max-width: 800px;
            width: 100%;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 30px;
            font-size: 2.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .form-group {
            margin-bottom: 25px;
        }

        label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #555;
            font-size: 1.1rem;
        }

        .prompt-input {
            width: 100%;
            padding: 15px;
            border: 2px solid #e1e5e9;
            border-radius: 12px;
            font-size: 16px;
            resize: vertical;
            min-height: 120px;
            font-family: inherit;
            transition: all 0.3s ease;
        }

        .prompt-input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .generate-btn {
            width: 100%;
            padding: 18px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }

        .generate-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
        }

        .generate-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
            transform: none;
        }

        .loading-spinner {
            display: none;
            width: 24px;
            height: 24px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-top: 3px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 10px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .status {
            margin-top: 20px;
            padding: 15px;
            border-radius: 10px;
            font-weight: 500;
            text-align: center;
            display: none;
        }

        .status.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }

        .status.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }

        .status.loading {
            background: #cce7ff;
            color: #004085;
            border: 1px solid #b3d7ff;
        }

        .result-section {
            margin-top: 30px;
            display: none;
        }

        .generated-image {
            width: 100%;
            max-width: 512px;
            height: auto;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            margin: 0 auto;
            display: block;
        }

        .download-btn {
            margin-top: 20px;
            padding: 12px 24px;
            background: #28a745;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            display: block;
            margin-left: auto;
            margin-right: auto;
        }

        .download-btn:hover {
            background: #218838;
            transform: translateY(-1px);
        }

        .progress-bar {
            width: 100%;
            height: 6px;
            background: #e1e5e9;
            border-radius: 3px;
            overflow: hidden;
            margin-top: 15px;
            display: none;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea, #764ba2);
            width: 0%;
            transition: width 0.3s ease;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }

        @media (max-width: 600px) {
            .container {
                padding: 20px;
            }
            
            h1 {
                font-size: 2rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>AI Image Generator</h1>
        
        <form id="imageForm">
            <div class="form-group">
                <label for="prompt">Describe the image you want to generate:</label>
                <textarea 
                    id="prompt" 
                    name="prompt" 
                    class="prompt-input" 
                    placeholder="A majestic mountain landscape at sunset with vibrant colors..."
                    required
                ></textarea>
            </div>
            
            <button type="submit" id="generateBtn" class="generate-btn">
                <div class="loading-spinner"></div>
                <span id="btnText">Generate Image</span>
            </button>
            
            <div class="progress-bar" id="progressBar">
                <div class="progress-fill" id="progressFill"></div>
            </div>
        </form>
        
        <div id="status" class="status"></div>
        
        <div id="resultSection" class="result-section">
            <img id="generatedImage" class="generated-image" alt="Generated image" />
            <button id="downloadBtn" class="download-btn">Download Image</button>
        </div>
    </div>

    <script>
        class ImageGenerator {
            constructor() {
                this.form = document.getElementById('imageForm');
                this.generateBtn = document.getElementById('generateBtn');
                this.btnText = document.getElementById('btnText');
                this.spinner = document.querySelector('.loading-spinner');
                this.status = document.getElementById('status');
                this.resultSection = document.getElementById('resultSection');
                this.generatedImage = document.getElementById('generatedImage');
                this.downloadBtn = document.getElementById('downloadBtn');
                this.progressBar = document.getElementById('progressBar');
                this.progressFill = document.getElementById('progressFill');
                
                this.currentImageBlob = null;
                this.pollInterval = null;
                
                this.bindEvents();
            }
            
            bindEvents() {
                this.form.addEventListener('submit', (e) => this.handleSubmit(e));
                this.downloadBtn.addEventListener('click', () => this.downloadImage());
            }
            
            async handleSubmit(e) {
                e.preventDefault();
                
                const prompt = document.getElementById('prompt').value.trim();
                if (!prompt) return;
                
                this.setLoading(true);
                this.hideResult();
                this.showStatus('Sending your request to the AI...', 'loading');
                this.showProgress(10);
                
                try {
                    const response = await fetch('/api/generate', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ prompt })
                    });
                    
                    const data = await response.json();
                    
                    if (!response.ok) {
                        throw new Error(data.error || 'Failed to start generation');
                    }
                    
                    this.showProgress(30);
                    this.showStatus('Your image is being generated...', 'loading');
                    
                    // Poll for result
                    await this.pollForResult(data.taskId);
                    
                } catch (error) {
                    console.error('Generation error:', error);
                    this.showStatus(`Error: ${error.message}`, 'error');
                } finally {
                    this.setLoading(false);
                    this.hideProgress();
                }
            }
            
            async pollForResult(taskId) {
                let attempts = 0;
                const maxAttempts = 60; // 5 minutes with 5-second intervals
                
                this.pollInterval = setInterval(async () => {
                    attempts++;
                    
                    if (attempts > maxAttempts) {
                        clearInterval(this.pollInterval);
                        this.showStatus('Generation timed out. Please try again.', 'error');
                        return;
                    }
                    
                    try {
                        const response = await fetch(`/api/status/${taskId}`);
                        const data = await response.json();
                        
                        if (data.status === 'completed' && data.imageData) {
                            clearInterval(this.pollInterval);
                            this.showProgress(100);
                            await this.displayResult(data.imageData);
                        } else if (data.status === 'error') {
                            clearInterval(this.pollInterval);
                            this.showStatus(`Generation failed: ${data.error}`, 'error');
                        } else {
                            // Still processing, update progress
                            const progress = Math.min(30 + (attempts * 2), 90);
                            this.showProgress(progress);
                        }
                    } catch (error) {
                        console.error('Polling error:', error);
                        // Continue polling on network errors
                    }
                }, 5000);
            }
            
            async displayResult(base64Data) {
                try {
                    // Convert base64 to blob
                    const binaryString = atob(base64Data);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    
                    this.currentImageBlob = new Blob([bytes], { type: 'image/png' });
                    const imageUrl = URL.createObjectURL(this.currentImageBlob);
                    
                    this.generatedImage.src = imageUrl;
                    this.showResult();
                    this.showStatus('Image generated successfully!', 'success');
                    
                } catch (error) {
                    console.error('Display error:', error);
                    this.showStatus('Error displaying image', 'error');
                }
            }
            
            downloadImage() {
                if (!this.currentImageBlob) return;
                
                const url = URL.createObjectURL(this.currentImageBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `generated-image-${Date.now()}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
            
            setLoading(loading) {
                this.generateBtn.disabled = loading;
                this.spinner.style.display = loading ? 'inline-block' : 'none';
                this.btnText.textContent = loading ? 'Generating...' : 'Generate Image';
            }
            
            showStatus(message, type) {
                this.status.textContent = message;
                this.status.className = `status ${type}`;
                this.status.style.display = 'block';
            }
            
            hideStatus() {
                this.status.style.display = 'none';
            }
            
            showResult() {
                this.resultSection.style.display = 'block';
            }
            
            hideResult() {
                this.resultSection.style.display = 'none';
                if (this.currentImageBlob) {
                    URL.revokeObjectURL(this.generatedImage.src);
                    this.currentImageBlob = null;
                }
            }
            
            showProgress(percentage) {
                this.progressBar.style.display = 'block';
                this.progressFill.style.width = `${percentage}%`;
            }
            
            hideProgress() {
                this.progressBar.style.display = 'none';
                this.progressFill.style.width = '0%';
            }
        }
        
        // Initialize the app when DOM is loaded
        document.addEventListener('DOMContentLoaded', () => {
            new ImageGenerator();
        });
    </script>
</body>
</html>
EOF

# Create environment file
echo "⚙️ Creating environment configuration..."
cat > .env << 'EOF'
# Environment Configuration for AI Image Generator

# Server Configuration
PORT=3000
NODE_ENV=production

# n8n Webhook URL - Replace with your actual n8n webhook endpoint
N8N_WEBHOOK_URL=http://localhost:5678/webhook/generate-image

# Callback URL that n8n will use to send results back to your app
CALLBACK_BASE_URL=http://localhost:3000
EOF

echo "✅ Project setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Edit .env file with your n8n webhook URL"
echo "   2. Configure your n8n workflow (see README.md)"
echo "   3. Run: docker-compose up --build"
echo "   4. Access your app at: http://localhost:3000"
echo ""
echo "📚 For detailed setup instructions, see README.md"