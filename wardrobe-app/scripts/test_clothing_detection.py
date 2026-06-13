#!/usr/bin/env python3
"""
Quick test script: send a photo to Gemini 2.5 Flash and get back a structured
breakdown of every clothing item / accessory detected in the image.

Usage:
    python3 test_clothing_detection.py path/to/outfit_photo.jpg

Setup:
    pip install google-genai
    export GEMINI_API_KEY="your-key-here"
    (or just paste your key into API_KEY below)
"""

import sys
import os
import json
import mimetypes

API_KEY = os.environ.get("GEMINI_API_KEY", "PASTE_YOUR_KEY_HERE")
MODEL = "gemini-2.5-flash"

PROMPT = """Detect every individual clothing item and accessory worn by the
person in this image. Return ONLY a JSON array (no markdown, no commentary).
Each object must have these fields:
- "item": short name (e.g. "button-up shirt")
- "color": dominant color
- "type": style/fit details (e.g. "short-sleeve, worn open")
- "category": one of "top", "outerwear", "bottom", "footwear", "accessory"
"""


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 test_clothing_detection.py path/to/photo.jpg")
        sys.exit(1)

    image_path = sys.argv[1]
    if not os.path.exists(image_path):
        print(f"File not found: {image_path}")
        sys.exit(1)

    if API_KEY == "PASTE_YOUR_KEY_HERE":
        print("Set GEMINI_API_KEY env var or edit API_KEY in this script.")
        sys.exit(1)

    try:
        from google import genai
    except ImportError:
        print("Missing dependency. Run: pip install google-genai")
        sys.exit(1)

    client = genai.Client(api_key=API_KEY)

    mime_type, _ = mimetypes.guess_type(image_path)
    mime_type = mime_type or "image/jpeg"

    with open(image_path, "rb") as f:
        image_bytes = f.read()

    response = client.models.generate_content(
        model=MODEL,
        contents=[
            {"text": PROMPT},
            {"inline_data": {"mime_type": mime_type, "data": image_bytes}},
        ],
    )

    text = response.text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()

    print("\n--- Raw response ---")
    print(text)

    try:
        items = json.loads(text)
        print("\n--- Parsed items ---")
        for it in items:
            print(f"- {it.get('item')}: {it.get('color')}, {it.get('type')} [{it.get('category')}]")
    except json.JSONDecodeError:
        print("\n(Could not parse as JSON — see raw response above)")

    # Usage / cost info
    usage = getattr(response, "usage_metadata", None)
    if usage:
        print("\n--- Token usage ---")
        print(f"Prompt tokens: {usage.prompt_token_count}")
        print(f"Output tokens: {usage.candidates_token_count}")
        print(f"Total tokens: {usage.total_token_count}")


if __name__ == "__main__":
    main()
