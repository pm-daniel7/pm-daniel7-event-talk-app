import os
import re
import json
import logging
import requests
import xml.etree.ElementTree as ET
from datetime import datetime
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)

CACHE_FILE = 'cache.json'
CACHE_DURATION_SECONDS = 300  # 5 minutes

def get_cached_data():
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            # Check age
            timestamp = data.get('timestamp', 0)
            age = datetime.now().timestamp() - timestamp
            if age < CACHE_DURATION_SECONDS:
                logger.info(f"Using valid cached data (age: {age:.1f}s)")
                return data.get('feed_data')
        except Exception as e:
            logger.error(f"Error reading cache: {e}")
    return None

def save_to_cache(feed_data):
    try:
        data = {
            'timestamp': datetime.now().timestamp(),
            'feed_data': feed_data
        }
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logger.info("Successfully updated local cache")
    except Exception as e:
        logger.error(f"Error writing to cache: {e}")

def fetch_and_parse_feed():
    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    logger.info(f"Fetching release notes feed from {url}")
    response = requests.get(url, headers=headers, timeout=15)
    response.raise_for_status()
    
    # Parse XML
    root = ET.fromstring(response.content)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    # Feed metadata
    feed_title = root.find('atom:title', ns).text if root.find('atom:title', ns) is not None else "BigQuery - Release notes"
    feed_updated = root.find('atom:updated', ns).text if root.find('atom:updated', ns) is not None else ""
    
    entries = []
    
    # Parse entry elements
    for entry_idx, entry_elem in enumerate(root.findall('atom:entry', ns)):
        date_str = entry_elem.find('atom:title', ns).text  # e.g., "June 17, 2026"
        entry_id = entry_elem.find('atom:id', ns).text
        updated_str = entry_elem.find('atom:updated', ns).text # e.g. "2026-06-17T00:00:00-07:00"
        
        # Link
        link_elem = entry_elem.find('atom:link[@rel="alternate"]', ns)
        alternate_link = link_elem.get('href') if link_elem is not None else ""
        
        # Content HTML
        content_elem = entry_elem.find('atom:content', ns)
        content_html = content_elem.text if content_elem is not None else ""
        
        # Parse individual updates within content_html
        soup = BeautifulSoup(content_html, 'html.parser')
        headings = soup.find_all('h3')
        
        if not headings:
            text_content = soup.get_text().strip()
            text_content = re.sub(r'\s+', ' ', text_content)
            entries.append({
                'id': f"{entry_id}_0",
                'date': date_str,
                'updated': updated_str,
                'type': 'General',
                'html': str(soup),
                'text': text_content,
                'link': alternate_link
            })
        else:
            for h_idx, heading in enumerate(headings):
                update_type = heading.get_text().strip()
                # Find all sibling elements until the next h3
                sibling_html = []
                sibling_text = []
                curr = heading.next_sibling
                while curr and curr.name != 'h3':
                    if curr.name:
                        sibling_html.append(str(curr))
                        sibling_text.append(curr.get_text())
                    elif isinstance(curr, str) and curr.strip():
                        sibling_html.append(curr)
                        sibling_text.append(curr.strip())
                    curr = curr.next_sibling
                
                html_snippet = "".join(sibling_html).strip()
                text_snippet = " ".join(sibling_text).strip()
                text_snippet = re.sub(r'\s+', ' ', text_snippet)
                
                # If the type tag is missing or empty, default to General
                if not update_type:
                    update_type = "General"
                
                entries.append({
                    'id': f"{entry_id}_{h_idx}",
                    'date': date_str,
                    'updated': updated_str,
                    'type': update_type,
                    'html': html_snippet,
                    'text': text_snippet,
                    'link': alternate_link
                })
                
    return {
        'title': feed_title,
        'updated': feed_updated,
        'entries': entries
    }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    
    if not force_refresh:
        cached_data = get_cached_data()
        if cached_data:
            return jsonify(cached_data)
            
    try:
        feed_data = fetch_and_parse_feed()
        save_to_cache(feed_data)
        return jsonify(feed_data)
    except Exception as e:
        logger.error(f"Error fetching/parsing feed: {e}", exc_info=True)
        # Attempt to use stale cache if network request fails
        if os.path.exists(CACHE_FILE):
            logger.info("Network request failed. Using stale cache fallback.")
            try:
                with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                return jsonify({
                    'status': 'stale_cache',
                    'error': str(e),
                    **data.get('feed_data', {})
                })
            except Exception as cache_err:
                logger.error(f"Failed to read stale cache: {cache_err}")
                
        return jsonify({'error': 'Failed to fetch release notes: ' + str(e)}), 500

if __name__ == '__main__':
    # Run the Flask app on localhost:5000
    app.run(host='127.0.0.1', port=5000, debug=True)
