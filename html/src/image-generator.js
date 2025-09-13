import { api } from './api.js';
import { ui } from './ui.js';

let taskId = null;
let pollInterval = null;

async function generateImage() {
    const prompt = ui.elements.promptInput.value.trim();
    if (!prompt) {
        ui.showToast('Please enter a prompt.', 'error');
        return;
    }

    ui.elements.generateBtn.disabled = true;
    ui.elements.status.textContent = 'Starting image generation...';
    ui.elements.status.className = 'status loading';
    ui.elements.status.style.display = 'block';
    ui.elements.resultSection.style.display = 'none';
    ui.elements.progressBar.style.display = 'block';
    ui.elements.progressFill.style.width = '0%';

    try {
        const response = await api.generateImage(prompt);
        taskId = response.taskId;
        ui.showToast('Image generation started.', 'success');
        pollForResults();
    } catch (error) {
        ui.showToast('Error starting image generation.', 'error');
        resetUI();
    }
}

async function pollForResults() {
    if (pollInterval) clearInterval(pollInterval);

    pollInterval = setInterval(async () => {
        try {
            const response = await api.getImageStatus(taskId);
            const { status, imageData, error } = response;

            switch (status) {
                case 'completed':
                    clearInterval(pollInterval);
                    displayImage(imageData);
                    resetUI();
                    break;
                case 'error':
                    clearInterval(pollInterval);
                    ui.showToast(error || 'Image generation failed.', 'error');
                    resetUI();
                    break;
                default:
                    // Update progress bar
                    const progress = getProgress(response.elapsedTime.total);
                    ui.elements.progressFill.style.width = `${progress}%`;
                    break;
            }
        } catch (error) {
            clearInterval(pollInterval);
            ui.showToast('Error fetching image status.', 'error');
            resetUI();
        }
    }, 5000);
}

function displayImage(imageData) {
    ui.elements.generatedImage.src = `data:image/jpeg;base64,${imageData}`;
    ui.elements.resultSection.style.display = 'block';
    ui.elements.status.textContent = 'Image generated successfully!';
    ui.elements.status.className = 'status success';
}

function resetUI() {
    ui.elements.generateBtn.disabled = false;
    ui.elements.progressBar.style.display = 'none';
}

function getProgress(elapsedMs) {
    // Estimated time is 2 minutes (120,000 ms)
    const estimatedTime = 120000;
    const progress = Math.min(100, (elapsedMs / estimatedTime) * 100);
    return progress;
}

function downloadImage() {
    const link = document.createElement('a');
    link.href = ui.elements.generatedImage.src;
    link.download = 'generated-image.jpg';
    link.click();
}

export function initImageGenerator() {
    ui.elements.generateBtn?.addEventListener('click', generateImage);
    ui.elements.downloadBtn?.addEventListener('click', downloadImage);
    ui.elements.navImage?.addEventListener('click', () => ui.showScreen('imageGeneratorContainer'));
}
