#!/usr/bin/env python3
"""
Advanced image to base64 converter for email signatures.
Supports local files and URLs (including Imgur).

Usage:
    python3 convert-images-advanced.py profile.jpg logo.png
    python3 convert-images-advanced.py https://i.imgur.com/xyz.png logo.png
    python3 convert-images-advanced.py profile.jpg https://example.com/logo.png
"""

import base64
import sys
import os
import urllib.request
import urllib.error
from io import BytesIO

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    print("Note: PIL/Pillow not installed. Install with: pip3 install Pillow")
    print("      (Optional - enables image optimization and format conversion)\n")

def is_url(path):
    """Check if path is a URL."""
    return path.startswith(('http://', 'https://'))

def fetch_image_from_url(url):
    """Fetch image from URL and return bytes."""
    try:
        # Add headers to avoid blocks
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
        req = urllib.request.Request(url, headers=headers)

        with urllib.request.urlopen(req, timeout=10) as response:
            image_data = response.read()
            return image_data
    except urllib.error.HTTPError as e:
        print(f"HTTP Error {e.code}: {e.reason}")
        if e.code == 403:
            print("  → Image URL is blocked (403 Forbidden)")
            print("  → Try downloading the image manually first")
        return None
    except urllib.error.URLError as e:
        print(f"URL Error: {e.reason}")
        return None
    except Exception as e:
        print(f"Error fetching URL: {e}")
        return None

def optimize_image(image_data, max_size_kb=50, quality=85):
    """Optimize image using PIL if available."""
    if not PIL_AVAILABLE:
        return image_data

    try:
        img = Image.open(BytesIO(image_data))

        # Convert RGBA to RGB if needed (for JPEG)
        if img.mode == 'RGBA':
            background = Image.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3])
            img = background

        # Try to compress until under max size
        output = BytesIO()
        current_quality = quality

        while current_quality > 10:
            output.seek(0)
            output.truncate()
            img.save(output, format='JPEG', quality=current_quality, optimize=True)
            size_kb = output.tell() / 1024

            if size_kb <= max_size_kb:
                break
            current_quality -= 10

        if size_kb <= max_size_kb:
            print(f"  ✓ Optimized to {size_kb:.1f} KB (quality: {current_quality}%)")
            return output.getvalue()
        else:
            print(f"  ⚠ Could not optimize below {max_size_kb}KB (final: {size_kb:.1f}KB)")
            return output.getvalue()

    except Exception as e:
        print(f"  ⚠ Optimization failed: {e}")
        return image_data

def image_to_base64(image_source, optimize=False, max_size_kb=50):
    """
    Convert image (file or URL) to base64 string.

    Args:
        image_source: File path or URL
        optimize: Whether to optimize image (requires PIL)
        max_size_kb: Target max size in KB (if optimizing)

    Returns:
        tuple: (base64_string, mime_type, file_size_kb) or (None, None, None)
    """
    try:
        # Fetch image data
        if is_url(image_source):
            print(f"Fetching from URL: {image_source}")
            image_data = fetch_image_from_url(image_source)
            if image_data is None:
                return None, None, None
            # Detect mime type from URL extension
            ext = os.path.splitext(image_source.split('?')[0])[1].lower()
            mime_type = get_mime_type_from_ext(ext)
        else:
            print(f"Reading local file: {image_source}")
            with open(image_source, 'rb') as f:
                image_data = f.read()
            ext = os.path.splitext(image_source)[1].lower()
            mime_type = get_mime_type_from_ext(ext)

        original_size_kb = len(image_data) / 1024
        print(f"  Original size: {original_size_kb:.1f} KB")

        # Optimize if requested and image is too large
        if optimize and PIL_AVAILABLE and original_size_kb > max_size_kb:
            image_data = optimize_image(image_data, max_size_kb)

        # Encode to base64
        encoded = base64.b64encode(image_data).decode('utf-8')
        final_size_kb = len(image_data) / 1024

        return encoded, mime_type, final_size_kb

    except FileNotFoundError:
        print(f"  ✗ File not found: {image_source}")
        return None, None, None
    except Exception as e:
        print(f"  ✗ Error processing: {e}")
        return None, None, None

def get_mime_type_from_ext(ext):
    """Get MIME type from file extension."""
    mime_types = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml'
    }
    return mime_types.get(ext, 'image/png')

def save_output_files(profile_data, logo_data):
    """Save base64 strings to text files."""
    profile_b64, profile_mime, profile_size = profile_data
    logo_b64, logo_mime, logo_size = logo_data

    if profile_b64:
        with open('profile-base64.txt', 'w') as f:
            f.write(f"data:{profile_mime};base64,{profile_b64}")
        print(f"✓ Saved: profile-base64.txt")

    if logo_b64:
        with open('logo-base64.txt', 'w') as f:
            f.write(f"data:{logo_mime};base64,{logo_b64}")
        print(f"✓ Saved: logo-base64.txt")

def display_results(profile_data, logo_data):
    """Display formatted results."""
    profile_b64, profile_mime, profile_size = profile_data
    logo_b64, logo_mime, logo_size = logo_data

    print("\n" + "="*70)
    print("CONVERSION COMPLETE")
    print("="*70)

    if profile_b64:
        print(f"\n📸 PROFILE PHOTO:")
        print(f"   Size: {profile_size:.1f} KB")
        print(f"   Type: {profile_mime}")
        if profile_size > 50:
            print(f"   ⚠ WARNING: Large file size. Consider re-running with --optimize flag")
        print(f"\n   Preview (first 80 chars):")
        print(f"   data:{profile_mime};base64,{profile_b64[:80]}...")

    if logo_b64:
        print(f"\n🏢 LOGO:")
        print(f"   Size: {logo_size:.1f} KB")
        print(f"   Type: {logo_mime}")
        if logo_size > 30:
            print(f"   ⚠ WARNING: Large file size. Consider compressing logo")
        print(f"\n   Preview (first 80 chars):")
        print(f"   data:{logo_mime};base64,{logo_b64[:80]}...")

    print("\n" + "="*70)
    print("📁 FULL BASE64 STRINGS SAVED TO:")
    print("   • profile-base64.txt")
    print("   • logo-base64.txt")
    print("\n💡 Next steps:")
    print("   1. Open your chosen signature HTML file")
    print("   2. Find: YOUR_PROFILE_PHOTO_BASE64_HERE")
    print("   3. Replace with contents of profile-base64.txt")
    print("   4. Find: YOUR_LOGO_BASE64_HERE")
    print("   5. Replace with contents of logo-base64.txt")
    print("="*70)

def print_usage():
    """Print usage instructions."""
    print("Usage:")
    print("  python3 convert-images-advanced.py <profile-image> <logo-image> [--optimize]")
    print("\nExamples:")
    print("  python3 convert-images-advanced.py profile.jpg logo.png")
    print("  python3 convert-images-advanced.py profile.jpg logo.png --optimize")
    print("  python3 convert-images-advanced.py https://example.com/photo.jpg logo.png")
    print("\nArguments:")
    print("  profile-image : Path or URL to profile photo")
    print("  logo-image    : Path or URL to logo")
    print("  --optimize    : Compress images if too large (requires Pillow)")
    print("\nImage Requirements:")
    print("  Profile: 256x256px recommended, under 50KB")
    print("  Logo: ~200px wide recommended, under 30KB")

def main():
    # Check arguments
    if len(sys.argv) < 3:
        print_usage()
        sys.exit(1)

    profile_source = sys.argv[1]
    logo_source = sys.argv[2]
    optimize = '--optimize' in sys.argv or '-o' in sys.argv

    if profile_source in ['--help', '-h']:
        print_usage()
        sys.exit(0)

    print("="*70)
    print("ADVANCED IMAGE TO BASE64 CONVERTER")
    print("="*70)
    print()

    # Convert profile photo
    print("📸 Processing profile photo...")
    profile_data = image_to_base64(profile_source, optimize=optimize, max_size_kb=50)
    print()

    # Convert logo
    print("🏢 Processing logo...")
    logo_data = image_to_base64(logo_source, optimize=optimize, max_size_kb=30)
    print()

    # Check if both succeeded
    if profile_data[0] is None and logo_data[0] is None:
        print("\n❌ Both conversions failed. Please check your image sources.")
        sys.exit(1)
    elif profile_data[0] is None:
        print("\n⚠ Profile photo conversion failed. Logo converted successfully.")
    elif logo_data[0] is None:
        print("\n⚠ Logo conversion failed. Profile photo converted successfully.")

    # Save and display results
    save_output_files(profile_data, logo_data)
    display_results(profile_data, logo_data)

    # Give optimization tip if needed
    if not optimize and (
        (profile_data[2] and profile_data[2] > 50) or
        (logo_data[2] and logo_data[2] > 30)
    ):
        print("\n💡 TIP: Files are large. Try running with --optimize flag:")
        print(f"   python3 convert-images-advanced.py {profile_source} {logo_source} --optimize")

if __name__ == '__main__':
    main()
