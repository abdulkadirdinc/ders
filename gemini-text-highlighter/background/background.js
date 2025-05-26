chrome.runtime.onInstalled.addListener(() => {
    console.log('Gemini Text Highlighter extension installed/updated.');
    // You can set default prompts here if needed, upon first installation
    chrome.storage.sync.get(['prompts', 'activePromptId'], (result) => {
        if (!result.prompts || result.prompts.length === 0) {
            const defaultPrompts = [
                { id: 'prompt-default-1', text: 'Explain this: {{selected_text}}' },
                { id: 'prompt-default-2', text: 'Summarize this text: {{selected_text}}' },
                { id: 'prompt-default-3', text: 'Translate this to French: {{selected_text}}' }
            ];
            chrome.storage.sync.set({ prompts: defaultPrompts });
            if (!result.activePromptId) {
                chrome.storage.sync.set({ activePromptId: 'prompt-default-1' });
            }
        }
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'processText') {
        const selectedText = request.text;

        chrome.storage.sync.get(['apiKey', 'geminiModel', 'prompts', 'activePromptId'], async (settings) => {
            if (!settings.apiKey) {
                console.warn('API Key is not set.');
                sendResponse({ status: 'API_KEY_MISSING', error: 'API Key is not set in options.' });
                return true; // Keep message channel open for async response
            }
            if (!settings.activePromptId) {
                console.warn('Active prompt is not set.');
                sendResponse({ error: 'No active prompt selected in options.' });
                return true;
            }

            const activePrompt = settings.prompts.find(p => p.id === settings.activePromptId);

            if (!activePrompt) {
                console.warn('Active prompt not found in stored prompts.');
                sendResponse({ error: 'Active prompt data not found. Please re-select in options.' });
                return true;
            }

            const model = settings.geminiModel || 'gemini-pro'; // Default model if not set
            const fullPromptText = activePrompt.text.replace('{{selected_text}}', selectedText);

            // **IMPORTANT**: This is a placeholder for the actual Gemini API call.
            // You will need to replace this with the correct endpoint, request structure, and error handling
            // according to the official Google Gemini API documentation.
            // The Gemini API endpoint and request format can vary.
            // Example structure for a hypothetical Gemini API:
            const apiKey = settings.apiKey;
            // Determine the correct API endpoint based on the model.
            // For gemini-pro, it's usually 'generateContent'
            // For gemini-1.5-pro-latest, it might be different.
            // This is a simplified example. Refer to official Gemini API docs.
            const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

            console.log(`Sending to Gemini (${model}): ${fullPromptText.substring(0, 100)}...`);

            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        // The structure of the 'contents' field can vary based on the model and task.
                        // This is a common structure for simple text prompts.
                        contents: [{
                            parts: [{
                                text: fullPromptText
                            }]
                        }],
                        // You might need to configure generationConfig, safetySettings, etc.
                        // generationConfig: {
                        //   temperature: 0.7,
                        //   topK: 1,
                        //   topP: 1,
                        //   maxOutputTokens: 2048,
                        // },
                        // safetySettings: [
                        //   { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                        //   // ... other categories
                        // ]
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: { message: 'Unknown API error format' } }));
                    console.error('Gemini API Error:', response.status, errorData);
                    sendResponse({ error: `API Error: ${errorData.error?.message || response.statusText || 'Unknown error'}` });
                    return true;
                }

                const data = await response.json();

                // Extract the text from the Gemini response. This structure can vary.
                // Based on common Gemini API responses:
                let processedText = 'No text found in response.';
                if (data.candidates && data.candidates.length > 0 &&
                    data.candidates[0].content && data.candidates[0].content.parts &&
                    data.candidates[0].content.parts.length > 0 &&
                    data.candidates[0].content.parts[0].text) {
                    processedText = data.candidates[0].content.parts[0].text;
                } else if (data.error) { // Check for explicit error in response body
                     console.error('Gemini API returned an error in response body:', data.error);
                     sendResponse({ error: `API Error: ${data.error.message}` });
                     return true;
                }

                console.log('Received from Gemini:', processedText.substring(0, 100) + "...");
                sendResponse({ processedText: processedText });

            } catch (error) {
                console.error('Error calling Gemini API:', error);
                sendResponse({ error: `Network or other error: ${error.message}` });
            }
        });
        return true; // Indicates that sendResponse will be called asynchronously.
    }
});

console.log('Gemini Text Highlighter background script loaded and listening.');
