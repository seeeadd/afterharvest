#!/usr/bin/env python3
"""
Super simple tool to add YOUR images to Sean's signature.
Just drag your photo and logo files onto this script.

Usage:
    python3 add-my-images.py sean-photo.jpg afterharvest-logo.png

Then it will update ALL signature files automatically!
"""

import base64
import sys
import os
import re

def image_to_base64(filepath):
    """Convert image to base64."""
    try:
        with open(filepath, 'rb') as f:
            return base64.b64encode(f.read()).decode('utf-8')
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return None

def get_mime_type(filepath):
    """Get MIME type from extension."""
    ext = os.path.splitext(filepath)[1].lower()
    types = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
    }
    return types.get(ext, 'image/png')

def update_signature(filename, photo_data, logo_data, photo_mime, logo_mime):
    """Update a signature file with real images."""
    try:
        with open(filename, 'r') as f:
            content = f.read()

        # Replace photo placeholder
        photo_string = f"data:{photo_mime};base64,{photo_data}"
        content = re.sub(
            r'data:image/jpeg;base64,YOUR_PHOTO_BASE64',
            photo_string,
            content
        )

        # Replace logo placeholder
        logo_string = f"data:{logo_mime};base64,{logo_data}"
        content = re.sub(
            r'data:image/png;base64,YOUR_LOGO_BASE64',
            logo_string,
            content
        )

        # Save updated file
        with open(filename, 'w') as f:
            f.write(content)

        return True
    except Exception as e:
        print(f"Error updating {filename}: {e}")
        return False

def main():
    if len(sys.argv) < 3:
        print("🎨 Add Your Images to Sean's Signatures")
        print("=" * 50)
        print("\nUsage:")
        print("  python3 add-my-images.py YOUR_PHOTO.jpg LOGO.png")
        print("\nExample:")
        print("  python3 add-my-images.py sean-headshot.jpg afterharvest-logo.png")
        print("\nThis will update ALL signature files with your images!")
        sys.exit(1)

    photo_path = sys.argv[1]
    logo_path = sys.argv[2]

    print("🎨 ADDING YOUR IMAGES TO SIGNATURES")
    print("=" * 50)

    # Convert images
    print(f"\n📸 Converting photo: {photo_path}")
    photo_data = image_to_base64(photo_path)
    if not photo_data:
        print("❌ Failed to convert photo")
        sys.exit(1)
    photo_mime = get_mime_type(photo_path)
    photo_size = len(photo_data) / 1024
    print(f"   ✓ Converted ({photo_size:.0f} KB)")

    print(f"\n🏢 Converting logo: {logo_path}")
    logo_data = image_to_base64(logo_path)
    if not logo_data:
        print("❌ Failed to convert logo")
        sys.exit(1)
    logo_mime = get_mime_type(logo_path)
    logo_size = len(logo_data) / 1024
    print(f"   ✓ Converted ({logo_size:.0f} KB)")

    # Find all signature files
    signature_files = [
        'sean-signature-final.html',
        'sean-signature-kinfolk-warm.html',
        'sean-signature-studio.html',
        'sean-signature-bold.html',
        'sean-signature-kinfolk.html',
        'sean-signature-brutalist.html',
        'sean-signature-asymmetric-v2.html',
        'sean-signature-photo-left.html'
    ]

    print("\n📝 Updating signature files...")
    updated = 0
    for sig_file in signature_files:
        if os.path.exists(sig_file):
            if update_signature(sig_file, photo_data, logo_data, photo_mime, logo_mime):
                print(f"   ✓ {sig_file}")
                updated += 1
            else:
                print(f"   ✗ {sig_file} (error)")
        else:
            print(f"   - {sig_file} (not found)")

    print("\n" + "=" * 50)
    print(f"✅ DONE! Updated {updated} signature files")
    print("\n🎯 Next steps:")
    print("   1. Open any signature HTML in your browser")
    print("   2. It should show YOUR photo and logo")
    print("   3. Select All (Cmd/Ctrl+A) and Copy")
    print("   4. Paste into Gmail signature settings")
    print("=" * 50)

if __name__ == '__main__':
    main()
