import requests
import re
import json

URL = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.css"

def fetch_css(url):
    response = requests.get(url)
    response.raise_for_status()
    return response.text

def extract_icons(css_text):
    # Match .fa-xxxxx:before
    pattern = r'\.fa-([a-z0-9-]+):before'
    matches = re.findall(pattern, css_text)
    
    # Remove duplicates and sort
    unique_icons = sorted(set(matches))
    
    # Add "fa-" prefix
    return [f"fa-{name}" for name in unique_icons]

def save_json(data, filename="fontawesome4-icons.json"):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def main():
    css = fetch_css(URL)
    icons = extract_icons(css)
    save_json(icons)
    print(f"Total icons found: {len(icons)}")
    print("Saved to fontawesome4-icons.json")

if __name__ == "__main__":
    main()
