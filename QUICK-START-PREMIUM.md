# Quick Start - Premium Email Signatures

## 🚀 5-Minute Setup

### 1. Choose Your Design

Open `signature-premium-preview.html` in a browser to see all three designs:

- **Editorial Vertical Rule** - Classic magazine aesthetic
- **Asymmetric Luxury** - Bold studio style
- **Minimal Luxury** - Ultimate sophistication

### 2. Prepare Images

You need:
- Your profile photo (saved locally)
- Afterharvest logo (saved locally)

**Note:** The Imgur URL you provided was blocked (403 error). Download the logo first:
1. Go to https://i.imgur.com/izdADAh.png in your browser
2. Right-click → Save Image As...
3. Save as `afterharvest-logo.png`

### 3. Convert to Base64

```bash
python3 convert-images-advanced.py your-photo.jpg afterharvest-logo.png
```

This creates:
- `profile-base64.txt`
- `logo-base64.txt`

### 4. Edit Your Signature

Open your chosen signature file:
- `signature-premium-editorial.html`
- `signature-premium-asymmetric.html`
- `signature-premium-minimal-luxury.html`

Replace:
1. `YOUR_PROFILE_PHOTO_BASE64_HERE` → paste content from `profile-base64.txt`
2. `YOUR_LOGO_BASE64_HERE` → paste content from `logo-base64.txt`
3. `Your Name` → your actual name
4. `Your Title` → your actual title

### 5. Test

Open your edited HTML file in Chrome/Safari to preview.

### 6. Add to Gmail

1. Open your signature HTML in browser
2. Select All (Cmd/Ctrl + A)
3. Copy (Cmd/Ctrl + C)
4. Gmail Settings → Signature → Create new
5. Paste (Cmd/Ctrl + V)
6. Save

Done! 🎉

---

## 🎨 Design Comparison

| Design | Best For | Vibe |
|--------|----------|------|
| Editorial | Consultants, content creators | Thoughtful, refined |
| Asymmetric | Founders, agencies | Bold, confident |
| Minimal Luxury | Enterprise, high-ticket | Sophisticated, elegant |

---

## 🆘 Troubleshooting

**Can't download images?**
- Blob URLs don't work - save the image locally first
- Imgur links may be blocked - download manually

**Script not working?**
- Use the basic version: `python3 convert-images.py your-photo.jpg logo.png`
- Or use online tool: https://www.base64-image.de/

**Images too large?**
- Compress first at https://tinypng.com
- Or use: `python3 convert-images-advanced.py photo.jpg logo.png --optimize`

**Layout broken in email?**
- Don't edit the `<table>` structure
- Only change content inside `style=""` attributes
- Test in browser first

---

## 📚 Full Documentation

- **Complete guide:** `PREMIUM-SIGNATURE-GUIDE.md`
- **Visual preview:** `signature-premium-preview.html`
- **Basic instructions:** `SIGNATURE-INSTRUCTIONS.md`

---

## 💡 Pro Tips

1. **Compress images first** - Target: Photo < 50KB, Logo < 30KB
2. **Test thoroughly** - Send to yourself, check on mobile
3. **Keep it simple** - Let your message be the star
4. **Stay consistent** - Use same signature for all outreach
5. **No links** - Plain signature = better deliverability

---

**Need help? See PREMIUM-SIGNATURE-GUIDE.md for detailed instructions.**
