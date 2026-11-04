/**
 * ==========================================================================
 * FEATURE FLAGS DASHBOARD — REAL-TIME STATE ENGINE
 * ==========================================================================
 * 
 * Architecture:
 * - Single Source of Truth (currentFlags object)
 * - Safe LocalStorage Persistence with JSON validation and schema merging
 * - Reactive UI Updates (Cards, Statistics, Live Store Preview, Legend)
 * - Accessible Controls (ARIA roles, keyboard support, native <dialog>)
 * - Event Delegation & Clean Modular Functions
 */

'use strict';

// --------------------------------------------------------------------------
// 1. Feature Flag Definitions & Default State Configuration
// --------------------------------------------------------------------------

/**
 * Factory default settings for all 5 core feature flags.
 * Used for initial initialization and the 'Reset to Defaults' action.
 */
const defaultFlags = {
  promotionalBanner: true,
  darkMode: false,
  liveChat: true,
  newProducts: true,
  specialOffers: false
};

/**
 * Metadata configuration for each feature flag.
 * Used for dynamic card rendering, search filtering, and preview synchronization.
 */
const FEATURE_DEFINITIONS = [
  {
    id: 'promotionalBanner',
    name: 'Promotional Banner',
    description: 'Display a promotional banner on the website with special offers and discounts.',
    defaultState: true,
    category: 'Marketing',
    icon: 'megaphone'
  },
  {
    id: 'darkMode',
    name: 'Dark Mode',
    description: 'Enable dark appearance on the website preview.',
    defaultState: false,
    category: 'Appearance',
    icon: 'moon'
  },
  {
    id: 'liveChat',
    name: 'Live Chat',
    description: 'Display a customer support chat widget.',
    defaultState: true,
    category: 'Support',
    icon: 'message-square'
  },
  {
    id: 'newProducts',
    name: 'New Products Section',
    description: 'Display the latest products on the website.',
    defaultState: true,
    category: 'Storefront',
    icon: 'package'
  },
  {
    id: 'specialOffers',
    name: 'Special Offers',
    description: 'Display special deals and promotional offers.',
    defaultState: false,
    category: 'Marketing',
    icon: 'percent'
  }
];

// LocalStorage Keys
const STORAGE_KEY = 'featureFlags';
const STORAGE_META_KEY = 'featureFlags_meta';

// Central State Holders
let currentFlags = {};
let currentFilter = 'all'; // 'all' | 'enabled' | 'disabled'
let currentSearchQuery = '';
let lastUpdatedTimestamp = Date.now();

// --------------------------------------------------------------------------
// 2. DOM Elements Cache
// --------------------------------------------------------------------------
const DOM = {
  // Navigation & Shell
  sidebar: document.getElementById('sidebar'),
  mobileMenuBtn: document.getElementById('mobileMenuBtn'),
  closeSidebarBtn: document.getElementById('closeSidebarBtn'),
  sidebarBackdrop: document.getElementById('sidebarBackdrop'),
  navLinks: document.querySelectorAll('.nav-link'),
  navFlagCount: document.getElementById('navFlagCount'),

  // Header Elements
  currentDateDisplay: document.getElementById('currentDateDisplay'),

  // Statistics Display
  statTotalFeatures: document.getElementById('statTotalFeatures'),
  statEnabledFeatures: document.getElementById('statEnabledFeatures'),
  statEnabledPercent: document.getElementById('statEnabledPercent'),
  statDisabledFeatures: document.getElementById('statDisabledFeatures'),
  statDisabledPercent: document.getElementById('statDisabledPercent'),
  statLastUpdated: document.getElementById('statLastUpdated'),
  statLastUpdatedRelative: document.getElementById('statLastUpdatedRelative'),

  // Feature Flags Toolbar & Container
  activeCountBadge: document.getElementById('activeCountBadge'),
  resetDefaultsBtn: document.getElementById('resetDefaultsBtn'),
  searchFlagsInput: document.getElementById('searchFlagsInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  filterChips: document.querySelectorAll('.filter-chip'),
  chipCountAll: document.getElementById('chipCountAll'),
  chipCountEnabled: document.getElementById('chipCountEnabled'),
  chipCountDisabled: document.getElementById('chipCountDisabled'),
  flagsContainer: document.getElementById('flagsContainer'),
  emptySearchState: document.getElementById('emptySearchState'),
  resetSearchFilterBtn: document.getElementById('resetSearchFilterBtn'),

  // Live Preview Elements
  browserFrame: document.getElementById('browserFrame'),
  storeSandbox: document.getElementById('storeSandbox'),
  previewPromoBanner: document.getElementById('previewPromoBanner'),
  previewSpecialOffers: document.getElementById('previewSpecialOffers'),
  previewNewProducts: document.getElementById('previewNewProducts'),
  previewLiveChat: document.getElementById('previewLiveChat'),
  previewLegendItems: document.getElementById('previewLegendItems'),
  viewportDesktopBtn: document.getElementById('viewportDesktopBtn'),
  viewportMobileBtn: document.getElementById('viewportMobileBtn'),
  refreshPreviewBtn: document.getElementById('refreshPreviewBtn'),

  // Live Chat Preview Specifics
  chatToggleTrigger: document.getElementById('chatToggleTrigger'),
  chatPopupWindow: document.getElementById('chatPopupWindow'),
  closeChatPopupBtn: document.getElementById('closeChatPopupBtn'),

  // Modals (<dialog>)
  resetConfirmModal: document.getElementById('resetConfirmModal'),
  confirmResetBtn: document.getElementById('confirmResetBtn'),
  cancelResetBtn: document.getElementById('cancelResetBtn'),

  settingsModal: document.getElementById('settingsModal'),
  openSettingsLink: document.getElementById('openSettingsLink'),
  rawJsonViewer: document.getElementById('rawJsonViewer'),
  copyJsonBtn: document.getElementById('copyJsonBtn'),

  aboutModal: document.getElementById('aboutModal'),
  openAboutLink: document.getElementById('openAboutLink'),

  // Toast Container
  toastContainer: document.getElementById('toastContainer')
};

// --------------------------------------------------------------------------
// 3. LocalStorage Persistence Logic
// --------------------------------------------------------------------------

/**
 * Loads saved feature flags from browser localStorage.
 * Merges loaded values with defaultFlags to guarantee newly defined flags
 * receive their default state without breaking older saved schemas.
 * 
 * @returns {Object} Validated flags state object
 */
function loadFlags() {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    const metaData = localStorage.getItem(STORAGE_META_KEY);

    if (metaData) {
      const parsedMeta = JSON.parse(metaData);
      if (parsedMeta && parsedMeta.lastUpdated) {
        lastUpdatedTimestamp = parsedMeta.lastUpdated;
      }
    }

    if (rawData) {
      const parsedFlags = JSON.parse(rawData);
      // Merge with defaultFlags to handle any missing keys gracefully
      return { ...defaultFlags, ...parsedFlags };
    }
  } catch (error) {
    console.warn('[FeatureControl] Failed to parse localStorage data. Using defaults.', error);
  }

  // Fallback to factory defaults if storage is empty or invalid
  return { ...defaultFlags };
}

/**
 * Serializes and writes the current flags state to localStorage.
 * Also stores a metadata timestamp for auditing and statistics.
 */
function saveFlags() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentFlags));
    
    lastUpdatedTimestamp = Date.now();
    localStorage.setItem(STORAGE_META_KEY, JSON.stringify({
      lastUpdated: lastUpdatedTimestamp,
      version: '1.2.0'
    }));
  } catch (error) {
    console.error('[FeatureControl] Error saving state to localStorage:', error);
    showToast('Failed to save settings to localStorage. Storage quota may be full.', 'warning');
  }
}

// --------------------------------------------------------------------------
// 4. Core State Management & Reusable Actions
// --------------------------------------------------------------------------

/**
 * Updates a single feature flag's state, saves to storage, and refreshes the UI.
 * 
 * @param {string} featureId - Unique ID of the feature flag
 * @param {boolean} isEnabled - Desired toggle state (true/false)
 * @param {boolean} isSilent - If true, avoids displaying a toast notification
 */
function updateFeature(featureId, isEnabled, isSilent = false) {
  // Verify feature exists
  if (!(featureId in currentFlags)) {
    console.error(`[FeatureControl] Unknown featureId: ${featureId}`);
    return;
  }

  // Update State
  currentFlags[featureId] = Boolean(isEnabled);

  // Persist State
  saveFlags();

  // Re-synchronize Dashboard & Preview
  syncFeatureCardDOM(featureId, currentFlags[featureId]);
  updatePreview();
  updateStatistics();
  updateFilterCounts();

  // Find metadata for toast notification
  if (!isSilent) {
    const meta = FEATURE_DEFINITIONS.find(f => f.id === featureId);
    const featureName = meta ? meta.name : featureId;
    const statusText = currentFlags[featureId] ? 'enabled' : 'disabled';
    const toastType = currentFlags[featureId] ? 'success' : 'info';
    showToast(`"${featureName}" has been ${statusText}.`, toastType);
  }
}

/**
 * Resets all feature flags back to their predefined default configuration.
 * Clears custom saved flags from localStorage and synchronizes all components.
 */
function resetFlags() {
  // Restore state to default clone
  currentFlags = { ...defaultFlags };

  // Save reset state
  saveFlags();

  // Full re-render of dashboard, controls, and preview
  renderDashboard();
  updatePreview();
  updateStatistics();

  // Visual confirmation
  showToast('All feature flags have been restored to defaults.', 'success');
}

// --------------------------------------------------------------------------
// 5. DOM Rendering & Synchronization
// --------------------------------------------------------------------------

/**
 * Generates and renders feature flag cards according to active search/filter queries.
 */
function renderDashboard() {
  if (!DOM.flagsContainer) return;

  // Clear existing cards
  DOM.flagsContainer.innerHTML = '';

  // Filter feature list based on search query and filter chips
  const filteredFeatures = FEATURE_DEFINITIONS.filter(feature => {
    const isEnabled = Boolean(currentFlags[feature.id]);
    
    // Status Filter Matching
    if (currentFilter === 'enabled' && !isEnabled) return false;
    if (currentFilter === 'disabled' && isEnabled) return false;

    // Search Query Matching (name, id, or description)
    if (currentSearchQuery.trim()) {
      const query = currentSearchQuery.toLowerCase();
      const matchesName = feature.name.toLowerCase().includes(query);
      const matchesId = feature.id.toLowerCase().includes(query);
      const matchesDesc = feature.description.toLowerCase().includes(query);
      if (!matchesName && !matchesId && !matchesDesc) return false;
    }

    return true;
  });

  // Handle empty search results state
  if (filteredFeatures.length === 0) {
    DOM.emptySearchState.style.display = 'flex';
  } else {
    DOM.emptySearchState.style.display = 'none';

    // Construct and append feature cards
    filteredFeatures.forEach(feature => {
      const isEnabled = Boolean(currentFlags[feature.id]);
      const card = createFeatureCardElement(feature, isEnabled);
      DOM.flagsContainer.appendChild(card);
    });
  }

  // Update counts on filter chips
  updateFilterCounts();

  // Re-initialize Lucide Icons on newly injected DOM elements
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

/**
 * Constructs the DOM element for a single feature flag card.
 * 
 * @param {Object} feature - Feature definition metadata
 * @param {boolean} isEnabled - Current active state
 * @returns {HTMLElement} The constructed feature card element
 */
function createFeatureCardElement(feature, isEnabled) {
  const card = document.createElement('article');
  card.className = `feature-card ${isEnabled ? 'state-enabled' : ''}`;
  card.id = `card-${feature.id}`;
  card.setAttribute('data-feature-id', feature.id);

  const statusBadgeText = isEnabled ? 'ENABLED' : 'DISABLED';
  const statusBadgeClass = isEnabled ? 'status-badge-enabled' : 'status-badge-disabled';

  card.innerHTML = `
    <div class="feature-card-header">
      <div class="card-title-group">
        <div class="feature-icon-box" title="${feature.category}">
          <i data-lucide="${feature.icon}"></i>
        </div>
        <div class="feature-text-block">
          <div class="feature-name-row">
            <h3 class="feature-name">${escapeHTML(feature.name)}</h3>
            <span class="feature-category-pill">${escapeHTML(feature.category)}</span>
          </div>
          <span class="feature-id-code" title="Unique Flag Identifier">id: ${escapeHTML(feature.id)}</span>
        </div>
      </div>

      <!-- Accessible Toggle Switch -->
      <div class="toggle-control-wrap">
        <label class="toggle-switch" for="switch-${feature.id}" title="Toggle ${feature.name}">
          <input 
            type="checkbox" 
            id="switch-${feature.id}" 
            data-feature-id="${feature.id}"
            switch
            role="switch" 
            aria-checked="${isEnabled ? 'true' : 'false'}"
            aria-label="Toggle ${feature.name}"
            ${isEnabled ? 'checked' : ''}
          >
          <span class="switch-slider" aria-hidden="true"></span>
        </label>
      </div>
    </div>

    <p class="feature-desc">${escapeHTML(feature.description)}</p>

    <div class="feature-card-footer">
      <div class="feature-meta-left">
        <span class="status-badge ${statusBadgeClass}" id="status-badge-${feature.id}">
          <span class="status-indicator-dot"></span>
          <span class="status-badge-text">${statusBadgeText}</span>
        </span>
        <span class="feature-timestamp" id="timestamp-${feature.id}">Real-time sync</span>
      </div>
    </div>
  `;

  return card;
}

/**
 * Updates an individual card element directly in the DOM without destroying
 * or recreating neighboring cards (ensures smooth CSS transitions).
 * 
 * @param {string} featureId - Feature ID to update
 * @param {boolean} isEnabled - New flag state
 */
function syncFeatureCardDOM(featureId, isEnabled) {
  const card = document.getElementById(`card-${featureId}`);
  const checkbox = document.getElementById(`switch-${featureId}`);
  const statusBadge = document.getElementById(`status-badge-${featureId}`);

  if (card) {
    if (isEnabled) {
      card.classList.add('state-enabled');
    } else {
      card.classList.remove('state-enabled');
    }
  }

  if (checkbox) {
    checkbox.checked = isEnabled;
    checkbox.setAttribute('aria-checked', isEnabled ? 'true' : 'false');
  }

  if (statusBadge) {
    const textSpan = statusBadge.querySelector('.status-badge-text');
    if (isEnabled) {
      statusBadge.className = 'status-badge status-badge-enabled';
      if (textSpan) textSpan.textContent = 'ENABLED';
    } else {
      statusBadge.className = 'status-badge status-badge-disabled';
      if (textSpan) textSpan.textContent = 'DISABLED';
    }
  }

  const timestampElem = document.getElementById(`timestamp-${featureId}`);
  if (timestampElem) {
    timestampElem.textContent = 'Updated just now';
  }
}

// --------------------------------------------------------------------------
// 6. Website Live Preview Synchronization
// --------------------------------------------------------------------------

/**
 * Synchronizes each section of the simulated e-commerce storefront with the current state.
 * Expected interactions:
 * - Promotional Banner: Shows / hides with smooth transition
 * - Dark Mode: Applies dark theme specifically to the preview container (#storeSandbox)
 * - Live Chat: Shows / hides chat widget
 * - New Products Section: Shows / hides new products grid
 * - Special Offers Section: Shows / hides flash sale banner
 */
function updatePreview() {
  // 1. Promotional Banner
  if (DOM.previewPromoBanner) {
    if (currentFlags.promotionalBanner) {
      DOM.previewPromoBanner.classList.remove('is-hidden');
    } else {
      DOM.previewPromoBanner.classList.add('is-hidden');
    }
  }

  // 2. Dark Mode (Exclusively targets the simulated storefront)
  if (DOM.storeSandbox) {
    if (currentFlags.darkMode) {
      DOM.storeSandbox.classList.add('store-dark-mode');
    } else {
      DOM.storeSandbox.classList.remove('store-dark-mode');
    }
  }

  // 3. Live Chat Widget
  if (DOM.previewLiveChat) {
    if (currentFlags.liveChat) {
      DOM.previewLiveChat.classList.remove('is-hidden');
    } else {
      DOM.previewLiveChat.classList.add('is-hidden');
      // If hidden, also collapse any open chat bubble
      if (DOM.chatPopupWindow) {
        DOM.chatPopupWindow.classList.remove('is-open');
      }
    }
  }

  // 4. New Products Section
  if (DOM.previewNewProducts) {
    if (currentFlags.newProducts) {
      DOM.previewNewProducts.classList.remove('is-hidden');
    } else {
      DOM.previewNewProducts.classList.add('is-hidden');
    }
  }

  // 5. Special Offers Section
  if (DOM.previewSpecialOffers) {
    if (currentFlags.specialOffers) {
      DOM.previewSpecialOffers.classList.remove('is-hidden');
    } else {
      DOM.previewSpecialOffers.classList.add('is-hidden');
    }
  }

  // Update Live Status Legend at the base of the preview
  renderPreviewLegend();
}

/**
 * Renders the mini status pills in the preview footer showing live flag states.
 */
function renderPreviewLegend() {
  if (!DOM.previewLegendItems) return;

  DOM.previewLegendItems.innerHTML = FEATURE_DEFINITIONS.map(feature => {
    const isEnabled = Boolean(currentFlags[feature.id]);
    const pillClass = isEnabled ? 'legend-pill-on' : 'legend-pill-off';
    const statusLabel = isEnabled ? 'ON' : 'OFF';
    return `
      <span class="legend-pill ${pillClass}">
        <span>${escapeHTML(feature.name)}:</span>
        <strong>${statusLabel}</strong>
      </span>
    `;
  }).join('');
}

// --------------------------------------------------------------------------
// 7. Statistics & Metric Calculation
// --------------------------------------------------------------------------

/**
 * Recalculates total, enabled, and disabled feature counts, along with
 * their percentages and last updated timestamp display.
 */
function updateStatistics() {
  const totalCount = FEATURE_DEFINITIONS.length;
  let enabledCount = 0;

  FEATURE_DEFINITIONS.forEach(feature => {
    if (currentFlags[feature.id]) {
      enabledCount++;
    }
  });

  const disabledCount = totalCount - enabledCount;
  const enabledPercent = Math.round((enabledCount / totalCount) * 100);
  const disabledPercent = Math.round((disabledCount / totalCount) * 100);

  // Update DOM values
  if (DOM.statTotalFeatures) DOM.statTotalFeatures.textContent = totalCount;
  if (DOM.statEnabledFeatures) DOM.statEnabledFeatures.textContent = enabledCount;
  if (DOM.statEnabledPercent) DOM.statEnabledPercent.textContent = `${enabledPercent}%`;
  if (DOM.statDisabledFeatures) DOM.statDisabledFeatures.textContent = disabledCount;
  if (DOM.statDisabledPercent) DOM.statDisabledPercent.textContent = `${disabledPercent}%`;

  if (DOM.activeCountBadge) {
    DOM.activeCountBadge.textContent = `${enabledCount} / ${totalCount} Active`;
  }

  if (DOM.navFlagCount) {
    DOM.navFlagCount.textContent = totalCount;
  }

  // Update Last Updated Timestamp Display
  renderLastUpdatedTime();
}

/**
 * Formats and displays the last modification timestamp.
 */
function renderLastUpdatedTime() {
  if (!DOM.statLastUpdated) return;

  const date = new Date(lastUpdatedTimestamp);
  const timeString = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  DOM.statLastUpdated.textContent = timeString;

  if (DOM.statLastUpdatedRelative) {
    const secondsAgo = Math.floor((Date.now() - lastUpdatedTimestamp) / 1000);
    if (secondsAgo < 5) {
      DOM.statLastUpdatedRelative.textContent = 'Updated just now';
    } else if (secondsAgo < 60) {
      DOM.statLastUpdatedRelative.textContent = `${secondsAgo}s ago`;
    } else {
      const minutesAgo = Math.floor(secondsAgo / 60);
      DOM.statLastUpdatedRelative.textContent = `${minutesAgo}m ago`;
    }
  }
}

/**
 * Updates count indicators on the filter chips toolbar.
 */
function updateFilterCounts() {
  const total = FEATURE_DEFINITIONS.length;
  let enabled = 0;
  FEATURE_DEFINITIONS.forEach(f => {
    if (currentFlags[f.id]) enabled++;
  });
  const disabled = total - enabled;

  if (DOM.chipCountAll) DOM.chipCountAll.textContent = total;
  if (DOM.chipCountEnabled) DOM.chipCountEnabled.textContent = enabled;
  if (DOM.chipCountDisabled) DOM.chipCountDisabled.textContent = disabled;
}

// --------------------------------------------------------------------------
// 8. Toast Notifications System
// --------------------------------------------------------------------------

/**
 * Displays an animated toast notification at the bottom right of the screen.
 * Automatically cleans itself up after 3.5 seconds.
 * 
 * @param {string} message - Notification text
 * @param {'success'|'info'|'warning'} type - Toast aesthetic type
 * @param {string} title - Optional custom title
 */
function showToast(message, type = 'info', title = null) {
  if (!DOM.toastContainer) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');

  let defaultTitle = 'Notification';
  let iconName = 'info';

  if (type === 'success') {
    defaultTitle = 'Action Successful';
    iconName = 'check-circle-2';
  } else if (type === 'warning') {
    defaultTitle = 'Notice';
    iconName = 'alert-triangle';
  }

  const finalTitle = title || defaultTitle;

  toast.innerHTML = `
    <div class="toast-icon-wrap">
      <i data-lucide="${iconName}"></i>
    </div>
    <div class="toast-body">
      <span class="toast-title">${escapeHTML(finalTitle)}</span>
      <span class="toast-message">${escapeHTML(message)}</span>
    </div>
    <button class="toast-close-btn" aria-label="Dismiss toast">
      <i data-lucide="x"></i>
    </button>
    <div class="toast-progress"></div>
  `;

  DOM.toastContainer.appendChild(toast);

  // Render icons inside the new toast
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }

  // Close Button Handler
  const closeBtn = toast.querySelector('.toast-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => dismissToast(toast));
  }

  // Automatic dismiss timer (3.5 seconds)
  const timer = setTimeout(() => {
    dismissToast(toast);
  }, 3500);

  function dismissToast(targetToast) {
    clearTimeout(timer);
    targetToast.classList.add('toast-hiding');
    targetToast.addEventListener('transitionend', () => {
      targetToast.remove();
    }, { once: true });
  }
}

// --------------------------------------------------------------------------
// 9. Event Listeners & User Interaction Wiring
// --------------------------------------------------------------------------

function setupEventListeners() {
  // --- Toggle Switch Interactions (Event Delegation) ---
  if (DOM.flagsContainer) {
    DOM.flagsContainer.addEventListener('change', event => {
      const target = event.target;
      if (target && target.matches('input[type="checkbox"][data-feature-id]')) {
        const featureId = target.getAttribute('data-feature-id');
        const isChecked = target.checked;
        updateFeature(featureId, isChecked);
      }
    });
  }

  // --- Reset to Defaults Flow (Native <dialog> Modal) ---
  if (DOM.resetDefaultsBtn && DOM.resetConfirmModal) {
    DOM.resetDefaultsBtn.addEventListener('click', () => {
      DOM.resetConfirmModal.showModal();
    });
  }

  if (DOM.confirmResetBtn && DOM.resetConfirmModal) {
    DOM.confirmResetBtn.addEventListener('click', () => {
      DOM.resetConfirmModal.close('confirm');
      resetFlags();
    });
  }

  if (DOM.cancelResetBtn && DOM.resetConfirmModal) {
    DOM.cancelResetBtn.addEventListener('click', () => {
      DOM.resetConfirmModal.close('cancel');
    });
  }

  // --- Search Input Filtering ---
  if (DOM.searchFlagsInput) {
    DOM.searchFlagsInput.addEventListener('input', event => {
      currentSearchQuery = event.target.value.trim();
      if (DOM.clearSearchBtn) {
        DOM.clearSearchBtn.style.display = currentSearchQuery ? 'block' : 'none';
      }
      renderDashboard();
    });
  }

  if (DOM.clearSearchBtn && DOM.searchFlagsInput) {
    DOM.clearSearchBtn.addEventListener('click', () => {
      DOM.searchFlagsInput.value = '';
      currentSearchQuery = '';
      DOM.clearSearchBtn.style.display = 'none';
      DOM.searchFlagsInput.focus();
      renderDashboard();
    });
  }

  if (DOM.resetSearchFilterBtn) {
    DOM.resetSearchFilterBtn.addEventListener('click', () => {
      currentSearchQuery = '';
      currentFilter = 'all';
      if (DOM.searchFlagsInput) DOM.searchFlagsInput.value = '';
      if (DOM.clearSearchBtn) DOM.clearSearchBtn.style.display = 'none';
      setActiveFilterChip('all');
      renderDashboard();
    });
  }

  // --- Filter Chips Switching ---
  if (DOM.filterChips) {
    DOM.filterChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const filterType = chip.getAttribute('data-filter');
        currentFilter = filterType;
        setActiveFilterChip(filterType);
        renderDashboard();
      });
    });
  }

  // --- Viewport Switcher (Desktop vs Mobile Preview) ---
  if (DOM.viewportDesktopBtn && DOM.viewportMobileBtn && DOM.browserFrame) {
    DOM.viewportDesktopBtn.addEventListener('click', () => {
      DOM.viewportDesktopBtn.classList.add('active');
      DOM.viewportMobileBtn.classList.remove('active');
      DOM.browserFrame.classList.remove('viewport-mobile');
    });

    DOM.viewportMobileBtn.addEventListener('click', () => {
      DOM.viewportMobileBtn.classList.add('active');
      DOM.viewportDesktopBtn.classList.remove('active');
      DOM.browserFrame.classList.add('viewport-mobile');
    });
  }

  // --- Refresh Preview Simulated Action ---
  if (DOM.refreshPreviewBtn) {
    DOM.refreshPreviewBtn.addEventListener('click', () => {
      DOM.refreshPreviewBtn.style.transform = 'rotate(360deg)';
      setTimeout(() => {
        DOM.refreshPreviewBtn.style.transform = '';
      }, 400);
      updatePreview();
      showToast('Live preview re-rendered successfully.', 'info');
    });
  }

  // --- Live Chat Floating Widget Interactivity ---
  if (DOM.chatToggleTrigger && DOM.chatPopupWindow) {
    DOM.chatToggleTrigger.addEventListener('click', () => {
      DOM.chatPopupWindow.classList.toggle('is-open');
    });
  }

  if (DOM.closeChatPopupBtn && DOM.chatPopupWindow) {
    DOM.closeChatPopupBtn.addEventListener('click', () => {
      DOM.chatPopupWindow.classList.remove('is-open');
    });
  }

  // --- Mobile Sidebar Navigation Drawer ---
  if (DOM.mobileMenuBtn && DOM.sidebar && DOM.sidebarBackdrop) {
    DOM.mobileMenuBtn.addEventListener('click', () => {
      DOM.sidebar.classList.add('mobile-open');
      DOM.sidebarBackdrop.classList.add('active');
    });
  }

  function closeMobileSidebar() {
    if (DOM.sidebar) DOM.sidebar.classList.remove('mobile-open');
    if (DOM.sidebarBackdrop) DOM.sidebarBackdrop.classList.remove('active');
  }

  if (DOM.closeSidebarBtn) {
    DOM.closeSidebarBtn.addEventListener('click', closeMobileSidebar);
  }

  if (DOM.sidebarBackdrop) {
    DOM.sidebarBackdrop.addEventListener('click', closeMobileSidebar);
  }

  // --- Navigation Links Highlighting & Smooth Navigation ---
  DOM.navLinks.forEach(link => {
    link.addEventListener('click', event => {
      const targetNav = link.getAttribute('data-nav');
      
      // Close mobile drawer on item click
      closeMobileSidebar();

      if (targetNav === 'settings') {
        event.preventDefault();
        openSettingsModal();
        return;
      }

      if (targetNav === 'about') {
        event.preventDefault();
        openAboutModal();
        return;
      }

      if (targetNav === 'flags') {
        event.preventDefault();
        const panel = document.getElementById('featureFlagsPanel');
        if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActiveNavLink('flags');
        return;
      }

      if (targetNav === 'preview') {
        event.preventDefault();
        const panel = document.getElementById('websitePreviewPanel');
        if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActiveNavLink('preview');
        return;
      }

      if (targetNav === 'dashboard') {
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setActiveNavLink('dashboard');
        return;
      }
    });
  });

  // --- Settings Modal Handler & Raw State Viewer ---
  function openSettingsModal() {
    if (!DOM.settingsModal) return;
    if (DOM.rawJsonViewer) {
      DOM.rawJsonViewer.textContent = JSON.stringify(currentFlags, null, 2);
    }
    DOM.settingsModal.showModal();
  }

  if (DOM.openSettingsLink) {
    DOM.openSettingsLink.addEventListener('click', event => {
      event.preventDefault();
      openSettingsModal();
    });
  }

  if (DOM.copyJsonBtn) {
    DOM.copyJsonBtn.addEventListener('click', () => {
      const jsonText = JSON.stringify(currentFlags, null, 2);
      navigator.clipboard.writeText(jsonText).then(() => {
        showToast('Configuration JSON copied to clipboard!', 'success');
      }).catch(() => {
        showToast('Could not copy JSON to clipboard.', 'warning');
      });
    });
  }

  // --- About Modal Handler ---
  function openAboutModal() {
    if (!DOM.aboutModal) return;
    DOM.aboutModal.showModal();
  }

  if (DOM.openAboutLink) {
    DOM.openAboutLink.addEventListener('click', event => {
      event.preventDefault();
      openAboutModal();
    });
  }
}

/**
 * Sets the active visual state on filter chips.
 */
function setActiveFilterChip(filterType) {
  DOM.filterChips.forEach(chip => {
    if (chip.getAttribute('data-filter') === filterType) {
      chip.classList.add('active');
      chip.setAttribute('aria-selected', 'true');
    } else {
      chip.classList.remove('active');
      chip.setAttribute('aria-selected', 'false');
    }
  });
}

/**
 * Sets the active visual state on sidebar navigation links.
 */
function setActiveNavLink(navId) {
  DOM.navLinks.forEach(link => {
    if (link.getAttribute('data-nav') === navId) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

/**
 * Displays today's formatted date in the top header.
 */
function renderLiveDate() {
  if (!DOM.currentDateDisplay) return;
  const now = new Date();
  const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
  DOM.currentDateDisplay.textContent = now.toLocaleDateString('en-US', options);
}

/**
 * Escapes unsafe characters to prevent XSS during innerHTML template interpolations.
 */
function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// --------------------------------------------------------------------------
// 10. Application Initialization
// --------------------------------------------------------------------------

/**
 * Main application bootstrap function.
 * Called once DOM content is fully loaded.
 */
function init() {
  console.log('%c[FeatureControl]%c Dashboard Initializing...', 'color: #4f46e5; font-weight: bold;', 'color: inherit;');

  // 1. Load persisted or default state
  currentFlags = loadFlags();

  // 2. Render live header date
  renderLiveDate();

  // 3. Render feature cards list
  renderDashboard();

  // 4. Update preview components
  updatePreview();

  // 5. Update dashboard statistics
  updateStatistics();

  // 6. Bind user interface event listeners
  setupEventListeners();

  // 7. Initialize Lucide icons
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }

  // 8. Periodically refresh relative time display every 30 seconds
  setInterval(renderLastUpdatedTime, 30000);

  console.log('%c[FeatureControl]%c Ready & Operational. Flags synchronized.', 'color: #10b981; font-weight: bold;', 'color: inherit;', currentFlags);
}

// Bootstrap on DOM Ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
