#!/usr/bin/env python3
"""
Script to make logo background transparent by removing white/light pixels.
Keeps only red and black pixels (the actual logo content).
"""

from PIL import Image
import sys

def make_transparent(input_path, output_path):
    # Open the image
    img = Image.open(input_path)

    # Convert to RGBA if not already
    img = img.convert("RGBA")

    # Get pixel data
    data = img.getdata()

    new_data = []
    for item in data:
        # item is (R, G, B, A)
        r, g, b, a = item

        # Check if pixel is white-ish or light gray
        # If all RGB values are high (close to white), make it transparent
        # Keep pixels that have significant red or are dark (black-ish)
        is_light = r > 200 and g > 200 and b > 200

        if is_light:
            # Make transparent
            new_data.append((255, 255, 255, 0))
        else:
            # Keep original pixel
            new_data.append(item)

    # Update image data
    img.putdata(new_data)

    # Save with transparency
    img.save(output_path, "PNG")
    print(f"Transparent logo saved to: {output_path}")

if __name__ == "__main__":
    input_file = "public/logo.png"
    output_file = "public/logo-transparent.png"

    try:
        make_transparent(input_file, output_file)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
