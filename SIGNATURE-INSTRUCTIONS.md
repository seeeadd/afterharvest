# Email Signature Setup Instructions

## Step 1: Convert Your Images to Base64

### Method A: Using Online Tool (Easiest)
1. Go to https://www.base64-image.de/
2. Upload your profile photo (recommended: 128x128px or 256x256px, JPG/PNG)
3. Copy the base64 string (it will look like: `iVBORw0KGgoAAAANSUhEUgAA...`)
4. Repeat for your Afterharvest logo (recommended: 180x40px to 300x70px)

### Method B: Using Command Line (Mac/Linux)
```bash
# For profile photo
base64 -i profile-photo.jpg -o profile-base64.txt

# For logo
base64 -i afterharvest-logo.png -o logo-base64.txt
```

### Method C: Using Python
```python
import base64

# Profile photo
with open("profile-photo.jpg", "rb") as image_file:
    encoded = base64.b64encode(image_file.read()).decode()
    print(encoded)

# Logo
with open("afterharvest-logo.png", "rb") as image_file:
    encoded = base64.b64encode(image_file.read()).decode()
    print(encoded)
```

## Step 2: Edit the HTML Template

1. Open `email-signature.html`
2. Find `YOUR_PROFILE_PHOTO_BASE64_HERE` and replace with your profile photo base64 string
3. Find `YOUR_LOGO_BASE64_HERE` and replace with your logo base64 string
4. Replace "Your Name" with your actual name
5. Replace "Your Title" with your actual title
6. Adjust the company description if needed

**Important:** Keep the `data:image/png;base64,` prefix! Your images should look like:
```html
<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..." alt="Profile">
```

## Step 3: Add to Gmail

### Gmail Desktop:
1. Open Gmail Settings (gear icon → "See all settings")
2. Scroll down to "Signature" section
3. Click "Create new" to add a signature
4. **Important:** Click the "Insert image" button, but then switch to the HTML view by clicking the three dots (...) → "Insert HTML"
5. Paste your complete HTML code
6. Scroll down and click "Save Changes"

### Alternative Method (More Reliable):
1. Open your edited `email-signature.html` in Chrome or Safari
2. Select all content (Cmd/Ctrl + A)
3. Copy (Cmd/Ctrl + C)
4. Go to Gmail Settings → Signature
5. Click "Create new"
6. Paste directly into the signature box (Cmd/Ctrl + V)
7. Save changes

## Step 4: Test Your Signature

1. Compose a new email to yourself
2. Check how it looks in the compose window
3. Send it and check how it appears when received
4. Test on mobile if possible

## Tips for Best Results

- **Profile Photo:** Use a square image, 128x128px to 256x256px, JPG or PNG
- **Logo:** Use PNG with transparent background, around 180-300px wide
- **Keep file sizes small:** Compress images before converting to base64
  - Profile photo should be < 50KB
  - Logo should be < 30KB
- **Preview in browser first:** Open the HTML file in a browser to see how it looks
- **Test across clients:** Send test emails to Outlook, Apple Mail, and Gmail

## Customization Options

### Change Colors:
- Primary text: `#4A4A4A`
- Brand accent (title): `#7B6B9E`
- Description text: `#6B6B6B`

### Adjust Spacing:
- Modify `margin` values in the HTML (e.g., `margin: 0 0 12px 0`)
- Adjust `padding-right` on profile photo cell for spacing

### Resize Images:
- Profile photo: Change `width: 64px; height: 64px;` (keep both values equal)
- Logo: Change `width: 90px;` (height will auto-adjust)

## Troubleshooting

**Images not showing:**
- Make sure you included the full base64 string
- Keep the `data:image/png;base64,` prefix
- Check that images aren't too large (>100KB can cause issues)

**Formatting looks wrong:**
- Some email clients strip certain styles
- This template is optimized for Gmail, Outlook, and Apple Mail
- Avoid editing the table structure

**Signature too wide on mobile:**
- The template is responsive, but you can reduce the `max-width` value
- Consider using a smaller logo on mobile by adjusting the width

## Need Help?

Check that:
1. Base64 strings are complete (no line breaks or spaces)
2. You kept all the `style=""` attributes intact
3. The HTML is well-formed (all tags closed)
4. Images are optimized and compressed
