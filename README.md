# FeatureControl — Feature Flags Dashboard with Real-Time Toggles

A modern, high-performance, and responsive SaaS Admin Dashboard for managing website feature flags with instant real-time toggling, browser `localStorage` persistence, and live storefront simulation.

Built with **HTML5**, **CSS3**, and **Vanilla JavaScript (ES6+)** with zero third-party framework dependencies.

---

## 📸 Preview & Design Inspiration

The dashboard draws UI/UX inspiration from leading developer tools and modern SaaS platforms such as **LaunchDarkly**, **Linear**, and **Vercel**:
- **Palette**: Dark Navy navigation sidebar (`#0f172a`), clean slate background (`#f8fafc`), Indigo primary accents (`#4f46e5`), Emerald Green enabled states (`#10b981`), and Amber warnings.
- **Micro-Interactions**: Smooth 200ms toggle sliders with accessible ARIA switch attributes, top-layer `<dialog>` modals with scroll isolation, and auto-dismissing toast notifications.
- **Isolated Live Preview**: Toggling **Dark Mode** alters *only* the customer-facing storefront preview ("NovaStore") without interfering with admin dashboard legibility.

---

## 📁 Project File Structure

```text
Feature-Flags-Dashboard/
│
├── index.html          # Semantic HTML5 dashboard layout and preview sandbox
│
├── css/
│   └── style.css       # Design tokens, responsive grid, animations, and dark mode
│
├── js/
│   └── script.js       # Centralized state management, DOM engine, and localStorage sync
│
└── README.md           # Project documentation and test walkthrough
```

---

## ⚙️ Core Technology Stack

- **Markup**: Semantic HTML5 with native top-layer `<dialog>` elements and accessible `role="switch"` inputs.
- **Styles**: Modern CSS3 using custom CSS variables (design tokens), Flexbox, CSS Grid, media queries, and keyframe animations.
- **Scripting**: Vanilla JavaScript (ES6+ strict mode), Event Delegation, Single Source of Truth architecture.
- **Storage**: Browser `Window.localStorage` API with JSON schema merging and defensive error handling.
- **Icons**: Lucide vector icons (`https://unpkg.com/lucide@latest`).
- **Typography**: Google Fonts — [Inter](https://fonts.google.com/specimen/Inter) (300 to 700 weights).

---

## 🚩 Feature Flags Inventory

| Flag Name | Unique ID | Category | Default State | Real-Time Live Preview Effect |
| :--- | :--- | :--- | :--- | :--- |
| **Promotional Banner** | `promotionalBanner` | Marketing | **ON** (`true`) | Displays the top Black Friday announcement bar with coupon code `NOVAPRO`. Smoothly collapses when disabled. |
| **Dark Mode** | `darkMode` | Appearance | **OFF** (`false`) | Switches the simulated e-commerce storefront into a sleek dark navy theme. (Dashboard stays light). |
| **Live Chat** | `liveChat` | Support | **ON** (`true`) | Displays the floating support bubble with unread badge and expandable conversation window. |
| **New Products Section** | `newProducts` | Storefront | **ON** (`true`) | Displays the 3-column product catalog grid with pricing and "Add to Cart" buttons. |
| **Special Offers** | `specialOffers` | Marketing | **OFF** (`false`) | Displays the limited flash sale banner with countdown timer and audio bundle discount. |

---

## 🧠 State Management & Data Architecture

The application is structured around a **Single Source of Truth** pattern:

```javascript
// Default schema definition
const defaultFlags = {
  promotionalBanner: true,
  darkMode: false,
  liveChat: true,
  newProducts: true,
  specialOffers: false
};

// Current active state in memory
let currentFlags = loadFlags();
```

### Core Functions:
1. `loadFlags()`: Reads `localStorage.getItem("featureFlags")`. Uses `JSON.parse` inside a `try...catch` block. Merges retrieved settings with `defaultFlags` using object spread (`{ ...defaultFlags, ...parsed }`), guaranteeing that missing keys or future additions always receive safe defaults.
2. `saveFlags()`: Serializes `currentFlags` to JSON and writes to `localStorage.setItem("featureFlags", ...)`. Also stores an audit timestamp in `featureFlags_meta`.
3. `updateFeature(featureId, isEnabled)`: Mutates `currentFlags`, saves to storage, triggers smooth DOM updates on the corresponding card, recalculates dashboard statistics, syncs the live preview, and dispatches an informative toast notification.
4. `renderDashboard()`: Renders feature cards based on the active search query and filter tab (`all`, `enabled`, `disabled`).
5. `updatePreview()`: Synchronizes each section of the simulated "NovaStore" preview instantly with CSS transition classes (`.is-hidden`, `.store-dark-mode`).
6. `updateStatistics()`: Computes total, enabled, and disabled counts, percentages, and formats the "Last Updated" timestamp.
7. `resetFlags()`: Replaces `currentFlags` with a fresh clone of `defaultFlags`, writes to storage, updates all UI components, and displays a success notification without any page reload.

---

## 🛠️ Step-by-Step Setup & How to Run

Because this project uses standard browser technologies with zero build steps or server dependencies:

### Option 1: Direct File Launch (Easiest)
1. Locate the project folder:
   ```text
   C:\Users\karti\.gemini\antigravity\scratch\Feature-Flags-Dashboard\
   ```
2. Double-click **`index.html`** or right-click and choose **Open with > Google Chrome** (or Edge / Firefox / Brave / Safari).
3. The dashboard and live preview will initialize immediately.

### Option 2: Local HTTP Server (Optional)
If you prefer running via a local web server (e.g. VS Code Live Server or Python):
```bash
# Using Python 3
cd Feature-Flags-Dashboard
python -m http.server 3000

# Open http://localhost:3000 in your browser
```

---

## 🧪 Comprehensive Verification Checklist

You can verify all requirements through the following test steps:

- [x] **1. Instant Toggle Updates**: Click any toggle switch. The switch knob slides immediately, the status badge changes between `ENABLED` (green) and `DISABLED` (grey), and the timestamp updates to "Updated just now".
- [x] **2. Real-Time Storefront Sync**:
  - Toggle **Promotional Banner**: Watch the top purple banner collapse or expand instantly.
  - Toggle **Dark Mode**: Watch the NovaStore preview switch into dark mode while the admin dashboard remains light.
  - Toggle **Live Chat**: Watch the floating circular chat widget appear or disappear in the bottom right corner of the preview.
  - Toggle **New Products**: Watch the product cards section toggle on or off.
  - Toggle **Special Offers**: Watch the flash sale card with countdown timer toggle on or off.
- [x] **3. LocalStorage Persistence**:
  - Toggle any flags (e.g., turn Dark Mode ON and Live Chat OFF).
  - Refresh the browser (`F5` or `Ctrl + R`).
  - Verify your customized toggle states persist exactly as left.
- [x] **4. Reset to Defaults Flow**:
  - Click the **"Reset to Defaults"** button.
  - A native `<dialog>` confirmation modal appears asking for verification.
  - Click **"Yes, Reset to Defaults"**.
  - All switches revert to the factory configuration (Banner ON, Dark Mode OFF, Chat ON, Products ON, Offers OFF).
  - A green toast appears confirming the reset.
- [x] **5. Real-Time Search**: Type `"dark"` or `"banner"` into the search bar. The cards list filters instantly. If no flags match, a friendly empty-state illustration appears.
- [x] **6. Status Filter Tabs**: Click **"Enabled"** or **"Disabled"** chips. The cards list filters dynamically with matching counts.
- [x] **7. Live Preview Viewport Switcher**: Click the **"Mobile"** button above the store preview. The preview transforms into a realistic smartphone frame (`390px` width with bezel). Click **"Desktop"** to restore wide view.
- [x] **8. Settings & Storage Inspector**: Click **"Settings"** in the sidebar. Inspect the live JSON state saved in `localStorage` and click **"Copy JSON"** to copy the payload.
- [x] **9. Mobile Responsiveness**: Resize the browser window below `1024px`. The sidebar converts into a collapsible slide-out drawer accessible via the hamburger menu icon.
- [x] **10. Zero Console Errors**: Open Developer Tools (`F12` > Console). Verify zero errors or unhandled exceptions.

---

## 📄 License
MIT License. Free for educational, commercial, and personal demonstration use.
