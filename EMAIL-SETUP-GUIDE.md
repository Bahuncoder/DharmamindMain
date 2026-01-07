# 📧 Waitlist Email Setup Guide

## Quick Setup (5 minutes)

To receive real emails when someone joins your waitlist, you need to configure environment variables in Netlify.

### Step 1: Get Gmail App Password (Recommended)

1. Go to your Google Account → Security → 2-Step Verification (enable if not already)
2. At the bottom, click "App passwords"
3. Select "Mail" and "Other (Custom name)" → Enter "DharmaMind"
4. Click "Generate" and copy the 16-character password

### Step 2: Add Environment Variables in Netlify

Go to: **Netlify Dashboard → Your Site → Site Settings → Environment Variables**

Add these variables:

| Variable | Value |
|----------|-------|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `your-email@gmail.com` |
| `SMTP_PASS` | `your-16-char-app-password` |
| `ADMIN_EMAIL` | `your-email@gmail.com` (where you want to receive notifications) |

### Step 3: Redeploy

After adding the variables, trigger a new deploy for changes to take effect.

---

## What Happens When Someone Signs Up

1. ✅ User enters their email and clicks "Get Early Access"
2. ✅ Form validates the email format
3. ✅ Request goes to `/.netlify/functions/submit_waitlist`
4. ✅ **YOU receive an email notification** with the user's email address
5. ✅ **User receives a welcome email** confirming they're on the list
6. ✅ Success message shown to the user

---

## Testing the Setup

1. Deploy your site to Netlify
2. Open the site and enter a test email
3. Check your inbox for:
   - **Admin notification**: "🎉 New Waitlist Signup: test@example.com"
   - The test email should receive: "🧘 Welcome to DharmaMind"

---

## Troubleshooting

### Emails not sending?

1. Check Netlify function logs: **Netlify → Functions → submit_waitlist → Logs**
2. Verify environment variables are set correctly
3. Make sure you're using an App Password, not your regular password

### Using other email providers?

**Outlook/Hotmail:**
```
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
```

**Yahoo:**
```
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
```

**Custom SMTP:**
```
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
```

---

## Alternative: Use EmailJS (No Backend Required)

If you prefer a simpler solution, you can use EmailJS:

1. Sign up at https://www.emailjs.com
2. Add your email service
3. Create a template
4. Update the frontend JavaScript with your EmailJS credentials

---

## Need Help?

Check the Netlify function logs for detailed error messages. The function outputs helpful debugging information.
