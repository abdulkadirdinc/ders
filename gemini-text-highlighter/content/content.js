// Globally unique ID for this extension's popups and spans to avoid conflicts
const EXT_PREFIX = 'gemini-highlighter-';

let currentRange = null; // To store the range of the selection
let highlightCounter = 0; // To create unique IDs for highlights
const pageHighlights = {}; // To store API responses for each highlight

// 1. Create and style the popup element once
const popup = document.createElement('div');
popup.id = EXT_PREFIX + 'popup';
// Initial styles are in css/styles.css or will be set here if not using a separate CSS file for content script
popup.style.position = 'absolute';
popup.style.display = 'none';
popup.style.border = '1px solid #ccc';
popup.style.backgroundColor = 'white';
popup.style.padding = '10px';
popup.style.zIndex = '10001'; // Ensure it's above most content
popup.style.maxWidth = '350px';
popup.style.maxHeight = '200px';
popup.style.overflowY = 'auto';
popup.style.boxShadow = '0px 2px 10px rgba(0,0,0,0.2)';
popup.style.fontSize = '12px'; // Smaller font for the popup
document.body.appendChild(popup);


// Listen for mouseup to detect text selection
document.addEventListener('mouseup', (event) => {
    // Ignore if the selection is inside an input, textarea, or the popup itself
    if (event.target.closest('input, textarea, #' + popup.id)) {
        return;
    }

    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText) {
        console.log('Selected text:', selectedText);
        currentRange = selection.getRangeAt(0).cloneRange(); // Store the range

        // Send to background script
        chrome.runtime.sendMessage({ type: 'processText', text: selectedText }, (response) => {
            if (response && response.error) {
                console.error('Error from background:', response.error);
                // Optionally, show a temporary error message in the popup or an alert
                showTemporaryPopup(`Error: ${response.error}`, event.clientX, event.clientY);
                currentRange = null; // Clear the range as we didn't highlight
                return;
            }
            if (response && response.processedText) {
                console.log('Processed text received:', response.processedText);
                highlightSelection(response.processedText);
            } else if (response && response.status === 'API_KEY_MISSING') {
                 console.warn('Gemini API Key is missing.');
                 showTemporaryPopup('Gemini API Key not set. Please set it in extension options.', event.clientX, event.clientY);
                 currentRange = null;
            }
        });
    }
});

function showTemporaryPopup(message, x, y) {
    popup.innerHTML = message;
    // Position near cursor, fallback to center if x,y are tricky
    popup.style.left = `${window.scrollX + x + 10}px`;
    popup.style.top = `${window.scrollY + y + 10}px`;
    popup.style.display = 'block';
    setTimeout(() => {
        if (popup.innerHTML === message) { // Hide only if it's still showing this message
            popup.style.display = 'none';
            popup.innerHTML = '';
        }
    }, 3000); // Hide after 3 seconds
}

function highlightSelection(apiResponseText) {
    if (!currentRange) return;

    highlightCounter++;
    const highlightId = EXT_PREFIX + 'highlight-' + highlightCounter;

    const span = document.createElement('span');
    span.id = highlightId;
    span.className = EXT_PREFIX + 'highlighted-text'; // For CSS styling from styles.css
    span.style.backgroundColor = 'lightblue'; // Direct styling as fallback
    span.style.cursor = 'pointer';

    try {
        // Surround the contents of the range with the new span
        span.appendChild(currentRange.extractContents());
        currentRange.insertNode(span);
        // Old method: currentRange.surroundContents(span);
        // extractContents and insertNode is often more robust, especially with complex selections.

        pageHighlights[highlightId] = apiResponseText; // Store API response

        span.addEventListener('mouseenter', (event) => {
            popup.innerHTML = pageHighlights[highlightId]; // Use stored response
            const rect = event.target.getBoundingClientRect();
            popup.style.left = `${window.scrollX + rect.left}px`;
            popup.style.top = `${window.scrollY + rect.bottom + 5}px`; // Position below the highlight
            popup.style.display = 'block';
        });

        span.addEventListener('mouseleave', () => {
            // Basic hide, consider a small delay if mouse moves between span and popup quickly
            popup.style.display = 'none';
        });

    } catch (e) {
        console.error('Error surrounding contents:', e);
        // If surroundContents fails (e.g., selection spans non-text nodes or complex structures),
        // we might need a more sophisticated highlighting method. For now, log and clear.
    }
    currentRange = null; // Clear the range after processing
}

// Listen for messages from the popup or background (if any needed in future)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'some_action') {
        // Handle other actions if needed
    }
    return true; // Indicates that sendResponse might be called asynchronously
});

console.log('Gemini Text Highlighter content script loaded.');
