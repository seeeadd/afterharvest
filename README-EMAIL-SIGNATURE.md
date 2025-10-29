# Email Signature for Cold Outreach

A clean, professional HTML email signature optimized for cold outreach emails.

## 🎨 Design Features

- **Clean & Editorial**: Professional aesthetic similar to Claude's brand
- **Email-Optimized**: Works in Gmail, Outlook, and Apple Mail
- **Mobile Responsive**: Looks great on all devices
- **High Deliverability**: Minimal styling, embedded images, no external links

## 📦 What's Included

- `email-signature.html` - Ready-to-use signature template
- `signature-preview.html` - Preview how it looks in an email
- `convert-images.py` - Helper script to convert images to base64
- `SIGNATURE-INSTRUCTIONS.md` - Complete setup guide

## 🚀 Quick Start

### 1. Prepare Your Images

You'll need:
- **Profile photo**: Square image (128x128px to 256x256px), under 50KB
- **Afterharvest logo**: PNG with transparent background, ~200px wide, under 30KB

### 2. Convert to Base64

**Option A: Use the Python script** (easiest)
```bash
python3 convert-images.py profile.jpg logo.png
```

This will create `profile-base64.txt` and `logo-base64.txt` with your encoded images.

**Option B: Use online tool**
- Go to https://www.base64-image.de/
- Upload and copy the base64 strings

### 3. Edit the Template

Open `email-signature.html` and:
1. Replace `YOUR_PROFILE_PHOTO_BASE64_HERE` with your profile base64 string
2. Replace `YOUR_LOGO_BASE64_HERE` with your logo base64 string
3. Update "Your Name" and "Your Title"
4. Adjust the company description if needed

### 4. Preview

Open `signature-preview.html` in a browser to see how it looks (with placeholders), or open your edited `email-signature.html` to see the final version.

### 5. Add to Gmail

**Method 1: Direct HTML**
1. Gmail Settings → See all settings → Signature
2. Create new signature
3. Click ⋮ (three dots) → Insert HTML
4. Paste your complete HTML
5. Save

**Method 2: Copy-Paste** (more reliable)
1. Open your `email-signature.html` in Chrome/Safari
2. Select all (Cmd/Ctrl + A) and copy
3. Gmail Settings → Signature → Create new
4. Paste directly
5. Save

## 🎨 Customization

### Colors
```html
Primary text: #4A4A4A
Brand accent: #7B6B9E (used for title)
Description: #6B6B6B
```

### Sizing
```html
Profile photo: 64px × 64px
Logo: 90px wide
Name: 17px
Title/Body: 14px
Description: 13px
```

### Spacing
Adjust `margin` and `padding` values in the HTML inline styles.

## ✅ Testing Checklist

- [ ] Preview in browser looks correct
- [ ] Send test email to yourself
- [ ] Check on Gmail web
- [ ] Check on Gmail mobile
- [ ] Check on Outlook (if applicable)
- [ ] Check on Apple Mail (if applicable)
- [ ] Images display correctly
- [ ] Text is readable
- [ ] Layout doesn't break

## 🔧 Troubleshooting

**Images not showing:**
- Ensure base64 strings are complete (no line breaks)
- Check file sizes (should be < 100KB each)
- Verify you kept the `data:image/png;base64,` prefix

**Layout broken:**
- Don't modify the table structure
- Keep all inline styles
- Test in an actual email, not just Gmail's preview

**Too wide on mobile:**
- Reduce the `max-width` value
- Make logo width smaller (e.g., 80px instead of 90px)

## 📝 Best Practices for Cold Outreach

1. **Keep it simple**: Less is more for cold emails
2. **No clickable links**: Improves deliverability
3. **Consistent branding**: Use same signature across all outreach
4. **Test deliverability**: Send test emails to check spam scores
5. **Personalize the email**: Signature should complement, not overpower

## 🎯 Design Philosophy

This signature follows these principles:
- **Minimal**: No borders, boxes, or excessive decoration
- **Professional**: Editorial typography and sophisticated color palette
- **Trustworthy**: Clean design builds credibility
- **Focused**: Highlights who you are and what you do

## 📚 Additional Resources

- Full setup instructions: `SIGNATURE-INSTRUCTIONS.md`
- Preview template: `signature-preview.html`
- Image converter: `convert-images.py`

## 🆘 Need Help?

1. Read `SIGNATURE-INSTRUCTIONS.md` for detailed guidance
2. Check the troubleshooting section above
3. Preview your signature in multiple email clients before using

---

**Built with ❤️ for Afterharvest**
