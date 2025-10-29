#!/usr/bin/env python3
"""
Helper script to convert images to base64 for email signature.
Usage: python3 convert-images.py profile-photo.jpg afterharvest-logo.png
"""

import base64
import sys
import os

def image_to_base64(image_path):
    """Convert an image file to base64 string."""
    try:
        with open(image_path, 'rb') as image_file:
            encoded = base64.b64encode(image_file.read()).decode('utf-8')
            return encoded
    except FileNotFoundError:
        print(f"Error: File '{image_path}' not found.")
        return None
    except Exception as e:
        print(f"Error processing '{image_path}': {e}")
        return None

def get_mime_type(filename):
    """Determine MIME type from file extension."""
    ext = os.path.splitext(filename)[1].lower()
    mime_types = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
    }
    return mime_types.get(ext, 'image/png')

def main():
    if len(sys.argv) < 3:
        print("Usage: python3 convert-images.py <profile-photo> <logo>")
        print("Example: python3 convert-images.py profile.jpg logo.png")
        sys.exit(1)

    profile_path = sys.argv[1]
    logo_path = sys.argv[2]

    print("Converting images to base64...\n")

    # Convert profile photo
    print(f"Processing profile photo: {profile_path}")
    profile_base64 = image_to_base64(profile_path)

    if profile_base64:
        profile_mime = get_mime_type(profile_path)
        profile_size = len(profile_base64)
        profile_kb = profile_size / 1024
        print(f"✓ Profile photo converted: {profile_kb:.1f} KB")

        if profile_kb > 100:
            print(f"  ⚠ Warning: Profile photo is large ({profile_kb:.1f} KB). Consider compressing it.")

    print()

    # Convert logo
    print(f"Processing logo: {logo_path}")
    logo_base64 = image_to_base64(logo_path)

    if logo_base64:
        logo_mime = get_mime_type(logo_path)
        logo_size = len(logo_base64)
        logo_kb = logo_size / 1024
        print(f"✓ Logo converted: {logo_kb:.1f} KB")

        if logo_kb > 50:
            print(f"  ⚠ Warning: Logo is large ({logo_kb:.1f} KB). Consider compressing it.")

    if not profile_base64 or not logo_base64:
        print("\n❌ Conversion failed. Please check your image files.")
        sys.exit(1)

    # Create output file with ready-to-use img tags
    print("\n" + "="*60)
    print("BASE64 STRINGS")
    print("="*60)

    print("\n📸 PROFILE PHOTO:")
    print(f'<img src="data:{profile_mime};base64,{profile_base64[:60]}..." alt="Profile">')

    print("\n🏢 LOGO:")
    print(f'<img src="data:{logo_mime};base64,{logo_base64[:60]}..." alt="Afterharvest">')

    # Save to files
    with open('profile-base64.txt', 'w') as f:
        f.write(f"data:{profile_mime};base64,{profile_base64}")

    with open('logo-base64.txt', 'w') as f:
        f.write(f"data:{logo_mime};base64,{logo_base64}")

    print("\n" + "="*60)
    print("✓ Full base64 strings saved to:")
    print("  - profile-base64.txt")
    print("  - logo-base64.txt")
    print("\nNow copy these strings into your email-signature.html file.")
    print("="*60)

if __name__ == '__main__':
    main()
