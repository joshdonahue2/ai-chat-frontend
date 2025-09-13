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
        const maxAttempts = 120; // 10 minutes with 5-second intervals
        let lastStatus = 'pending';

        this.pollInterval = setInterval(async () => {
            attempts++;

            if (attempts > maxAttempts) {
                clearInterval(this.pollInterval);
                this.showStatus('Generation timed out after 10 minutes. The process might still be running in the background.', 'error');
                return;
            }

            try {
                const response = await fetch(`/api/status/${taskId}`);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();

                // Update status message if status changed
                if (data.status !== lastStatus) {
                    lastStatus = data.status;
                    this.updateStatusMessage(data.status, attempts);
                }

                if (data.status === 'completed' && data.imageData) {
                    clearInterval(this.pollInterval);
                    this.showProgress(100);
                    await this.displayResult(data.imageData);
                } else if (data.status === 'error') {
                    clearInterval(this.pollInterval);
                    this.showStatus(`Generation failed: ${data.error || 'Unknown error'}`, 'error');
                } else {
                    // Still processing, update progress based on status and time
                    let progress = 30;
                    if (data.status === 'processing') {
                        progress = Math.min(40 + (attempts * 1), 85);
                    } else {
                        progress = Math.min(30 + (attempts * 0.5), 70);
                    }
                    this.showProgress(progress);
                }
            } catch (error) {
                console.error('Polling error:', error);

                // If we've been polling for a while and getting errors, show a message
                if (attempts > 5 && attempts % 10 === 0) {
                    console.warn(`Polling attempt ${attempts} failed, continuing...`);
                }

                // Continue polling on network errors, but show warning after many attempts
                if (attempts > 30 && attempts % 20 === 0) {
                    this.showStatus(`Still generating... (${Math.floor(attempts * 5 / 60)} minutes elapsed)`, 'loading');
                }
            }
        }, 5000);
    }

    updateStatusMessage(status, attempts) {
        const elapsed = Math.floor(attempts * 5 / 60);
        const minutes = elapsed > 0 ? ` (${elapsed}m elapsed)` : '';

        switch (status) {
            case 'pending':
                this.showStatus(`Sending request to n8n...${minutes}`, 'loading');
                break;
            case 'processing':
                this.showStatus(`AI is generating your image...${minutes}`, 'loading');
                break;
            default:
                this.showStatus(`Processing your request...${minutes}`, 'loading');
        }
    }

    async displayResult(base64Data) {
        try {
            console.log('=== DEBUGGING IMAGE DISPLAY ===');
            console.log('Received base64 data length:', base64Data?.length);
            console.log('First 50 chars:', base64Data?.substring(0, 50));
            console.log('Last 50 chars:', base64Data?.substring(base64Data?.length - 50));

            // Check for common base64 issues
            if (!base64Data) {
                throw new Error('No image data received');
            }

            // Clean the base64 string (remove any whitespace/newlines)
            const cleanBase64 = base64Data.replace(/\s/g, '');
            console.log('Cleaned base64 length:', cleanBase64.length);
            console.log('Base64 validation - length divisible by 4?', cleanBase64.length % 4 === 0);

            // Test atob conversion
            console.log('Attempting atob conversion...');
            const binaryString = atob(cleanBase64);
            console.log('Successfully decoded base64, binary length:', binaryString.length);

            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            console.log('Created byte array, length:', bytes.length);

            // Check if it looks like a valid image by checking headers
            const header = Array.from(bytes.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join('');
            console.log('File header (hex):', header);

            this.currentImageBlob = new Blob([bytes], { type: 'image/png' });
            const imageUrl = URL.createObjectURL(this.currentImageBlob);

            console.log('Created blob URL:', imageUrl);
            console.log('Blob size:', this.currentImageBlob.size, 'bytes');

            this.generatedImage.src = imageUrl;
            this.showResult();
            this.showStatus('Image generated successfully!', 'success');

        } catch (error) {
            console.error('=== IMAGE DISPLAY ERROR ===');
            console.error('Error:', error);
            console.error('Error message:', error.message);
            console.error('Base64 data that failed (first 100 chars):', base64Data?.substring(0, 100));
            this.showStatus(`Error displaying image: ${error.message}`, 'error');
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
