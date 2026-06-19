/* -------------------------------------------------------------
 * BigQuery Release Notes Explorer - Client Logic & Interactions
 * ------------------------------------------------------------- */

// State management
const state = {
    title: "BigQuery - Release notes",
    updated: "",
    releases: [],
    filteredReleases: [],
    selectedRelease: null,
    activeFilter: "all",
    searchQuery: ""
};

// Character Limit constants
const TWITTER_CHAR_LIMIT = 280;

// DOM Elements
const elements = {
    btnRefresh: document.getElementById("btn-refresh"),
    refreshIcon: document.getElementById("refresh-icon"),
    lastUpdatedText: document.getElementById("last-updated-text"),
    searchInput: document.getElementById("search-input"),
    btnClearSearch: document.getElementById("btn-clear-search"),
    filterTabsContainer: document.getElementById("filter-tabs-container"),
    releasesList: document.getElementById("releases-list"),
    loadingContainer: document.getElementById("loading-container"),
    errorContainer: document.getElementById("error-container"),
    errorMessage: document.getElementById("error-message"),
    btnRetry: document.getElementById("btn-retry"),
    emptyContainer: document.getElementById("empty-container"),
    btnResetFilters: document.getElementById("btn-reset-filters"),
    
    // Composer elements
    composerAside: document.getElementById("composer-aside"),
    composerEmptyState: document.getElementById("composer-empty-state"),
    composerContentState: document.getElementById("composer-content-state"),
    previewTypeBadge: document.getElementById("preview-type-badge"),
    previewDateText: document.getElementById("preview-date-text"),
    previewSnippetText: document.getElementById("preview-snippet-text"),
    tweetTextarea: document.getElementById("tweet-textarea"),
    charCounter: document.getElementById("char-counter"),
    progressCircle: document.getElementById("progress-circle"),
    btnAddHashtags: document.getElementById("btn-add-hashtags"),
    btnShorten: document.getElementById("btn-shorten"),
    btnResetTweet: document.getElementById("btn-reset-tweet"),
    btnCopyTweet: document.getElementById("btn-copy-tweet"),
    copyBtnText: document.getElementById("copy-btn-text"),
    btnShareTweet: document.getElementById("btn-share-tweet")
};

// Initialize app
document.addEventListener("DOMContentLoaded", () => {
    setupEventListeners();
    fetchReleases();
    setupProgressRing();
});

// Setup progress ring dimensions
let circleCircumference = 0;
function setupProgressRing() {
    if (elements.progressCircle) {
        const radius = elements.progressCircle.r.baseVal.value;
        circleCircumference = radius * 2 * Math.PI;
        elements.progressCircle.style.strokeDasharray = `${circleCircumference} ${circleCircumference}`;
        elements.progressCircle.style.strokeDashoffset = circleCircumference;
    }
}

// Update progress ring and text count
function updateComposerCounters() {
    const text = elements.tweetTextarea.value || "";
    // Note: Twitter counts links as 23 characters, but for a standard client-side textarea
    // we will do a simple direct character length check, which is clear and expected.
    const currentLength = text.length;
    const remaining = TWITTER_CHAR_LIMIT - currentLength;
    
    elements.charCounter.textContent = remaining;
    
    // Calculate percentage (clamped between 0 and 100)
    const percentage = Math.min(100, (currentLength / TWITTER_CHAR_LIMIT) * 100);
    const offset = circleCircumference - (percentage / 100) * circleCircumference;
    elements.progressCircle.style.strokeDashoffset = offset;
    
    // Style classes based on status
    elements.charCounter.classList.remove("warning", "error");
    elements.progressCircle.style.stroke = "#3b82f6"; // Default blue
    
    if (remaining <= 0) {
        elements.charCounter.classList.add("error");
        elements.progressCircle.style.stroke = "#ef4444"; // Red error
    } else if (remaining <= 30) {
        elements.charCounter.classList.add("warning");
        elements.progressCircle.style.stroke = "#f59e0b"; // Yellow warning
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Refresh button click
    elements.btnRefresh.addEventListener("click", () => fetchReleases(true));
    elements.btnRetry.addEventListener("click", () => fetchReleases(true));
    
    // Search inputs
    elements.searchInput.addEventListener("input", (e) => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        elements.btnClearSearch.style.display = state.searchQuery ? "block" : "none";
        applyFiltersAndSearch();
    });
    
    elements.btnClearSearch.addEventListener("click", () => {
        elements.searchInput.value = "";
        state.searchQuery = "";
        elements.btnClearSearch.style.display = "none";
        applyFiltersAndSearch();
    });
    
    // Reset filters empty state button
    elements.btnResetFilters.addEventListener("click", resetAllFilters);
    
    // Filter tags click events
    elements.filterTabsContainer.addEventListener("click", (e) => {
        if (e.target.classList.contains("filter-tab")) {
            // Remove active from all
            document.querySelectorAll(".filter-tab").forEach(tab => tab.classList.remove("active"));
            // Add to current
            e.target.classList.add("active");
            state.activeFilter = e.target.dataset.type;
            applyFiltersAndSearch();
        }
    });
    
    // Textarea input
    elements.tweetTextarea.addEventListener("input", updateComposerCounters);
    
    // Composer action buttons
    elements.btnAddHashtags.addEventListener("click", addHashtags);
    elements.btnShorten.addEventListener("click", autoShortenTweet);
    elements.btnResetTweet.addEventListener("click", resetTweetContent);
    elements.btnCopyTweet.addEventListener("click", copyTweetToClipboard);
    elements.btnShareTweet.addEventListener("click", shareTweetOnX);
}

// Fetch release notes from backend
async function fetchReleases(forceRefresh = false) {
    showLoading();
    
    let url = "/api/releases";
    if (forceRefresh) {
        url += "?refresh=true";
    }
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error);
        }
        
        state.title = data.title;
        state.updated = data.updated;
        state.releases = data.entries || [];
        
        // Update header metadata
        if (state.updated) {
            const dateObj = new Date(state.updated);
            elements.lastUpdatedText.textContent = `Feed updated: ${dateObj.toLocaleDateString()} ${dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        } else {
            elements.lastUpdatedText.textContent = "Feed updated: Just now";
        }
        
        applyFiltersAndSearch();
        hideLoading();
    } catch (err) {
        console.error("Error loading release notes:", err);
        elements.errorMessage.textContent = err.message || "Failed to connect to the Flask server.";
        showError();
    }
}

// Show/Hide page states
function showLoading() {
    elements.loadingContainer.style.display = "block";
    elements.releasesList.style.display = "none";
    elements.errorContainer.style.display = "none";
    elements.emptyContainer.style.display = "none";
    elements.btnRefresh.classList.add("loading");
    elements.btnRefresh.disabled = true;
}

function hideLoading() {
    elements.loadingContainer.style.display = "none";
    elements.btnRefresh.classList.remove("loading");
    elements.btnRefresh.disabled = false;
}

function showError() {
    hideLoading();
    elements.errorContainer.style.display = "flex";
    elements.releasesList.style.display = "none";
}

// Filter and Search logic
function applyFiltersAndSearch() {
    state.filteredReleases = state.releases.filter(release => {
        // Type filter match
        const matchesType = state.activeFilter === "all" || 
                            release.type.toLowerCase() === state.activeFilter;
        
        // Search query match
        const matchesSearch = !state.searchQuery || 
                              release.type.toLowerCase().includes(state.searchQuery) ||
                              release.date.toLowerCase().includes(state.searchQuery) ||
                              release.text.toLowerCase().includes(state.searchQuery);
                              
        return matchesType && matchesSearch;
    });
    
    renderReleases();
}

// Reset filters to original
function resetAllFilters() {
    elements.searchInput.value = "";
    state.searchQuery = "";
    elements.btnClearSearch.style.display = "none";
    
    document.querySelectorAll(".filter-tab").forEach(tab => tab.classList.remove("active"));
    const allTab = document.getElementById("filter-tab-all");
    if (allTab) allTab.classList.add("active");
    state.activeFilter = "all";
    
    applyFiltersAndSearch();
}

// Render release cards in list
function renderReleases() {
    if (state.filteredReleases.length === 0) {
        elements.releasesList.style.display = "none";
        elements.emptyContainer.style.display = "flex";
        return;
    }
    
    elements.emptyContainer.style.display = "none";
    elements.releasesList.style.display = "flex";
    elements.releasesList.innerHTML = "";
    
    state.filteredReleases.forEach(release => {
        const isSelected = state.selectedRelease && state.selectedRelease.id === release.id;
        
        const card = document.createElement("article");
        card.className = `release-card ${isSelected ? 'selected' : ''}`;
        card.id = `card-${release.id}`;
        card.setAttribute("tabindex", "0");
        card.setAttribute("role", "button");
        card.setAttribute("aria-pressed", isSelected ? "true" : "false");
        
        // Type badge class
        const typeClass = `badge-${release.type.toLowerCase().replace(/\s+/g, '-')}`;
        
        card.innerHTML = `
            <div class="selection-indicator" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
            </div>
            <header class="release-card-header">
                <time class="release-date">${release.date}</time>
                <span class="badge ${typeClass}">${release.type}</span>
            </header>
            <div class="release-card-content">
                ${release.html}
            </div>
            <footer class="release-card-footer">
                ${release.link ? `
                    <a href="${release.link}" target="_blank" class="release-link" onclick="event.stopPropagation();" rel="noopener noreferrer">
                        <span>View Source Feed</span>
                        <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                            <polyline points="15 3 21 3 21 9"/>
                            <line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                    </a>
                ` : '<span></span>'}
                <span class="release-action-hint">${isSelected ? 'Currently Selected' : 'Click to Compose Tweet'}</span>
            </footer>
        `;
        
        // Card click selection
        card.addEventListener("click", () => selectRelease(release));
        
        // Keyboard navigation (Enter / Space to select)
        card.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                selectRelease(release);
            }
        });
        
        elements.releasesList.appendChild(card);
    });
}

// Select a release card and populate composer
function selectRelease(release) {
    state.selectedRelease = release;
    
    // Re-render releases list to update visual selection states
    document.querySelectorAll(".release-card").forEach(card => {
        card.classList.remove("selected");
        card.setAttribute("aria-pressed", "false");
        const hint = card.querySelector(".release-action-hint");
        if (hint) hint.textContent = "Click to Compose Tweet";
    });
    
    const selectedCard = document.getElementById(`card-${release.id}`);
    if (selectedCard) {
        selectedCard.classList.add("selected");
        selectedCard.setAttribute("aria-pressed", "true");
        const hint = selectedCard.querySelector(".release-action-hint");
        if (hint) hint.textContent = "Currently Selected";
    }
    
    // Show composer content state, hide empty state
    elements.composerEmptyState.style.display = "none";
    elements.composerContentState.style.display = "flex";
    
    // Set up preview in composer sidebar
    elements.previewTypeBadge.textContent = release.type;
    elements.previewTypeBadge.className = `badge badge-${release.type.toLowerCase().replace(/\s+/g, '-')}`;
    elements.previewDateText.textContent = release.date;
    elements.previewSnippetText.textContent = release.text;
    
    // Generate text draft
    resetTweetContent();
    
    // Scroll composer into view on mobile
    if (window.innerWidth <= 992) {
        elements.composerAside.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Helper to generate the default tweet text based on template
function generateDefaultTweetText(release) {
    const typeEmoji = {
        'feature': '🚀',
        'announcement': '📢',
        'change': '🔄',
        'issue': '⚠️',
        'breaking': '🚨',
        'general': 'ℹ️'
    }[release.type.toLowerCase()] || '📢';

    const typeStr = release.type.charAt(0).toUpperCase() + release.type.slice(1);
    const link = release.link || '';
    
    // Calculate space: 
    // Format: "[Emoji] BigQuery [Type] ([Date]):\n\n\"[Text]\"\n\n🔗 [Link]\n#BigQuery #GoogleCloud"
    const prefix = `${typeEmoji} BigQuery ${typeStr} (${release.date}):\n\n"`;
    const suffix = `"\n\n🔗 ${link}\n#BigQuery #GoogleCloud`;
    
    // Standard Twitter links are 23 characters. But we also count actual chars to be safe.
    const linkLength = link ? 23 : 0;
    const structuralLength = prefix.length + (suffix.length - link.length) + linkLength;
    const availableLength = TWITTER_CHAR_LIMIT - structuralLength;
    
    let descriptionText = release.text;
    if (descriptionText.length > availableLength) {
        descriptionText = descriptionText.substring(0, availableLength - 3).trim() + "...";
    }
    
    return `${prefix}${descriptionText}${suffix}`;
}

// Action: Reset text inside Composer to default generated
function resetTweetContent() {
    if (!state.selectedRelease) return;
    elements.tweetTextarea.value = generateDefaultTweetText(state.selectedRelease);
    updateComposerCounters();
}

// Action: Append hashtags
function addHashtags() {
    let text = elements.tweetTextarea.value;
    const tags = ["#BigQuery", "#GoogleCloud"];
    
    tags.forEach(tag => {
        if (!text.includes(tag)) {
            text = text.trim() + " " + tag;
        }
    });
    
    elements.tweetTextarea.value = text;
    updateComposerCounters();
}

// Action: Auto-shorten content to fit limit
function autoShortenTweet() {
    if (!state.selectedRelease) return;
    
    const release = state.selectedRelease;
    const typeEmoji = {
        'feature': '🚀',
        'announcement': '📢',
        'change': '🔄',
        'issue': '⚠️',
        'breaking': '🚨',
        'general': 'ℹ️'
    }[release.type.toLowerCase()] || '📢';

    const typeStr = release.type.charAt(0).toUpperCase() + release.type.slice(1);
    const link = release.link || '';
    
    // Substantially shorter layout
    const prefix = `${typeEmoji} BigQuery ${typeStr}: "`;
    const suffix = `"\n\n🔗 ${link}\n#BigQuery`;
    
    const linkLength = link ? 23 : 0;
    const structuralLength = prefix.length + (suffix.length - link.length) + linkLength;
    const availableLength = TWITTER_CHAR_LIMIT - structuralLength;
    
    let descriptionText = release.text;
    // Shorten text heavily to fit
    if (descriptionText.length > availableLength) {
        descriptionText = descriptionText.substring(0, availableLength - 3).trim() + "...";
    }
    
    elements.tweetTextarea.value = `${prefix}${descriptionText}${suffix}`;
    updateComposerCounters();
}

// Action: Copy Tweet content to Clipboard
async function copyTweetToClipboard() {
    const text = elements.tweetTextarea.value;
    if (!text) return;
    
    try {
        await navigator.clipboard.writeText(text);
        
        // Success state UI animation
        elements.btnCopyTweet.classList.add("success");
        elements.copyBtnText.textContent = "Copied Text!";
        
        setTimeout(() => {
            elements.btnCopyTweet.classList.remove("success");
            elements.copyBtnText.textContent = "Copy Post Text";
        }, 2000);
    } catch (err) {
        console.error("Failed to copy text: ", err);
        alert("Failed to copy to clipboard. Please manually select the text inside composer.");
    }
}

// Action: Open Tweet on Twitter Share Intent
function shareTweetOnX() {
    const text = elements.tweetTextarea.value;
    if (!text) return;
    
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, "_blank", "noopener,noreferrer");
}
