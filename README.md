# BigQuery Release Notes Explorer & Tweet Composer

A modern, responsive web application built with **Python Flask** and **plain vanilla HTML5, CSS3, and JavaScript** that fetches Google Cloud's BigQuery Release Notes feed, structures the updates, and provides a customized environment to draft and publish tweets on X/Twitter.

> 🎓 **Course Project Milestone**  
> This project was developed and completed as part of a **5-day intensive course** focusing on modern web development, API integration, and user experience design.

---

## Features

### 📡 Live Feed Integration & Smart Parsing
* Fetches the official Google Cloud Atom feed (`https://docs.cloud.google.com/feeds/bigquery-release-notes.xml`) in real-time.
* Uses an adaptive parsing engine (`BeautifulSoup`) to identify and split multiple headings (`Feature`, `Announcement`, `Issue`, `Change`, `Breaking`) grouped inside single feed entries, presenting each update as an individual, select-ready card.
* Implements robust server-side caching (5-minute TTL) with local JSON fallback to handle network interruptions gracefully.

### 🎨 Premium Dark Slate UI
* Designed with a clean, high-contrast palette tailored to the Google Cloud brand guidelines (with accent glowing states).
* Features interactive micro-animations (refresh spinner, hover effects, card selection checkmarks).
* Zero-layout flashes using shimmer skeletons during state transitions.

### 🔎 Search & Filtering
* Instant client-side full-text search across all dates, types, and descriptions.
* Filter controls to isolate specific updates (e.g., viewing *only* **Features** or *only* **Breaking** changes).

### 🐦 Built-in Tweet Composer
* Click on any card in the feed to populate the composer on the fly.
* Generates a structured template: Emoji prefix, update type, date, truncated quote, source link, and course/brand hashtags.
* Circular SVG SVG indicator that changes color (blue ➔ yellow ➔ red) as you approach the 280-character limit.
* **Helper Tools**:
  * **+ Add Tags**: Automatically appends `#BigQuery #GoogleCloud`.
  * **Auto-Shorten**: Smart-condenses the text to fit strictly within 280 characters.
  * **Copy Post Text**: Copies draft content to clipboard with dynamic toast feedback.
  * **Share on X**: Opens Twitter/X intent sharing window pre-filled with your customized post.

---

## Project Structure

```text
bq-releases-notes/
├── app.py              # Flask server, Atom fetching, HTML parsing, caching & routes
├── templates/
│   └── index.html      # Semantic HTML5 frontend layout and skeleton loading states
├── static/
│   ├── css/
│   │   └── style.css   # Variables, grids, styling, status tags, & interactive animations
│   └── js/
│       └── app.js      # Main state machine, filtering, SVG progress, & clipboard logic
├── .gitignore          # Excludes environments, caches, and IDE configs
└── README.md           # Project summary and documentation
```

---

## Local Setup & Installation

### 1. Prerequisites
Ensure you have Python 3.10+ installed on your system.

### 2. Setup Virtual Environment & Install Dependencies
Clone the repository, navigate to the folder, and run:
```bash
# Create venv
python -m venv .venv

# Activate venv (Windows)
.venv\Scripts\activate

# Install requirements
pip install Flask requests beautifulsoup4
```

### 3. Run the Application
Launch the Flask development server:
```bash
python app.py
```
Open **[http://127.0.0.1:5000](http://127.0.0.1:5000)** in your web browser to run the app.
