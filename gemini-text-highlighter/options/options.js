document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('apiKey');
    const geminiModelSelect = document.getElementById('geminiModel');
    const saveApiKeyButton = document.getElementById('saveApiKey');

    const newPromptInput = document.getElementById('newPrompt');
    const addPromptButton = document.getElementById('addPrompt');
    const promptListUl = document.getElementById('prompt-list');
    const statusDiv = document.getElementById('status');

    let prompts = [];
    let activePromptId = null;

    // Load settings from storage
    function loadSettings() {
        chrome.storage.sync.get(['apiKey', 'geminiModel', 'prompts', 'activePromptId'], (result) => {
            if (result.apiKey) {
                apiKeyInput.value = result.apiKey;
            }
            if (result.geminiModel) {
                geminiModelSelect.value = result.geminiModel;
            }
            prompts = result.prompts || [];
            activePromptId = result.activePromptId || null;
            renderPrompts();
        });
    }

    // Save API settings
    saveApiKeyButton.addEventListener('click', () => {
        const apiKey = apiKeyInput.value;
        const model = geminiModelSelect.value;
        chrome.storage.sync.set({ apiKey: apiKey, geminiModel: model }, () => {
            displayStatus('API settings saved!', 2000);
        });
    });

    // Render prompts in the list
    function renderPrompts() {
        promptListUl.innerHTML = ''; // Clear existing list
        if (prompts.length === 0) {
            promptListUl.innerHTML = '<p>No prompts saved yet.</p>';
            return;
        }

        prompts.forEach(prompt => {
            const listItem = document.createElement('li');
            listItem.classList.add('prompt-item');
            if (prompt.id === activePromptId) {
                listItem.classList.add('active-prompt');
            }

            const textSpan = document.createElement('span');
            textSpan.classList.add('prompt-text');
            textSpan.textContent = prompt.text;
            listItem.appendChild(textSpan);

            const buttonDiv = document.createElement('div');

            const setActiveButton = document.createElement('button');
            setActiveButton.textContent = 'Set Active';
            setActiveButton.disabled = prompt.id === activePromptId;
            setActiveButton.addEventListener('click', () => {
                activePromptId = prompt.id;
                chrome.storage.sync.set({ activePromptId: prompt.id }, () => {
                    renderPrompts();
                    displayStatus('Prompt set as active!', 1500);
                });
            });
            buttonDiv.appendChild(setActiveButton);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.classList.add('delete-button');
            deleteButton.addEventListener('click', () => {
                prompts = prompts.filter(p => p.id !== prompt.id);
                if (activePromptId === prompt.id) {
                    activePromptId = null; // Clear active if it was deleted
                }
                chrome.storage.sync.set({ prompts: prompts, activePromptId: activePromptId }, () => {
                    renderPrompts();
                    displayStatus('Prompt deleted!', 1500);
                });
            });
            buttonDiv.appendChild(deleteButton);
            listItem.appendChild(buttonDiv);
            promptListUl.appendChild(listItem);
        });
    }

    // Add new prompt
    addPromptButton.addEventListener('click', () => {
        const newPromptText = newPromptInput.value.trim();
        if (newPromptText) {
            const newPrompt = {
                id: `prompt-${Date.now()}`, // Simple unique ID
                text: newPromptText
            };
            prompts.push(newPrompt);
            chrome.storage.sync.set({ prompts: prompts }, () => {
                newPromptInput.value = ''; // Clear input
                renderPrompts();
                displayStatus('Prompt added!', 1500);
            });
        }
    });

    // Display status messages
    function displayStatus(message, duration) {
        statusDiv.textContent = message;
        setTimeout(() => {
            statusDiv.textContent = '';
        }, duration);
    }

    // Initial load
    loadSettings();
});
