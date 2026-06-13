#!/usr/bin/env python3
"""
Extract individual clothing items from an outfit photo as standalone
background-removed thumbnails.

Pipeline:
  1. Gemini 2.5 detects each clothing item + its bounding box.
  2. Crop the original image to each bounding box.
  3. Run rembg to strip the background from each crop.
  4. Save each result as a transparent PNG thumbnail.

Usage:
    python3 extract_clothing_items.py path/to/outfit_photo.jpg [output_dir]

Setup:
    pip install google-genai pillow rembg onnxruntime
    export GEMINI_API_KEY="your-key-here"
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
- "type": style/fit details
- "category": one of "top", "outerwear", "bottom", "footwear", "accessory"
- "box_2d": bounding box as [ymin, xmin, ymax, xmax], normalized to 0-1000
  (this is the standard Gemini bounding box format)

Include accessories like sunglasses, jewelry, hats, and bags even if only
partially visible.
"""


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 extract_clothing_items.py path/to/photo.jpg [output_dir]")
        sys.exit(1)

    image_path = sys.argv[1]
    out_dir = sys.argv[2] if len(sys.argv) > 2 else "extracted_items"

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

    try:
        from PIL import Image
    except ImportError:
        print("Missing dependency. Run: pip install pillow")
        sys.exit(1)

    try:
        from rembg import remove as rembg_remove
    except ImportError:
        print("Missing dependency. Run: pip install rembg onnxruntime")
        sys.exit(1)

    os.makedirs(out_dir, exist_ok=True)

    client = genai.Client(api_key=API_KEY)
    mime_type, _ = mimetypes.guess_type(image_path)
    mime_type = mime_type or "image/jpeg"

    with open(image_path, "rb") as f:
        image_bytes = f.read()

    print("Detecting items + bounding boxes...")
    response = client.models.generate_content(
        model=MODEL,
        contents=[
            {"text": PROMPT},
            {"inline_data": {"mime_type": mime_type, "data": image_bytes}},
        ],
    )

    text = response.text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()

    try:
        items = json.loads(text)
    except json.JSONDecodeError:
        print("Could not parse model response as JSON:")
        print(text)
        sys.exit(1)

    img = Image.open(image_path).convert("RGB")
    W, H = img.size

    print(f"Found {len(items)} items. Cropping + removing backgrounds...\n")

    for i, it in enumerate(items):
        box = it.get("box_2d")
        if not box or len(box) != 4:
            print(f"Skipping '{it.get('item')}' — no bounding box returned")
            continue

        ymin, xmin, ymax, xmax = box
        # Convert from 0-1000 normalized coords to pixel coords
        left = int(xmin / 1000 * W)
        top = int(ymin / 1000 * H)
        right = int(xmax / 1000 * W)
        bottom = int(ymax / 1000 * H)

        # Add a small padding so cutout edges aren't too tight
        pad = 10
        left = max(0, left - pad)
        top = max(0, top - pad)
        right = min(W, right + pad)
        bottom = min(H, bottom + pad)

        crop = img.crop((left, top, right, bottom))

        cutout = rembg_remove(crop)

        name = it.get("item", f"item_{i}").replace(" ", "_").replace("/", "-")
        out_path = os.path.join(out_dir, f"{i:02d}_{name}.png")
        cutout.save(out_path)

        print(f"- {it.get('item')} ({it.get('category')}): saved -> {out_path}")

    # Save the raw detection JSON too, for reference
    with open(os.path.join(out_dir, "detections.json"), "w") as f:
        json.dump(items, f, indent=2)

    print(f"\nDone. Output in: {out_dir}/")


if __name__ == "__main__":
    main()
