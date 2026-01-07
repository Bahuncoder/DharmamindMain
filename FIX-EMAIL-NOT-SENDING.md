# 🚨 URGENT: Email Not Sending - Fix Now

## ❌ **Problem**

Users are joining the waitlist but **NOT receiving emails** because the Netlify environment variables are missing.

The API returns "Success" but emails don't send because:
- `SMTP_USER` is not set in Netlify
- `SMTP_PASS` is not set in Netlify

---

## ✅ **SOLUTION: Set Environment Variables in Netlify**

### **Step 1: Go to Netlify Dashboard**

1. Open: **https://app.netlify.com**
2. Log in to your account
3. Click on your **DharmaMind** site

### **Step 2: Navigate to Environment Variables**

1. Click **"Site settings"** in the top menu
2. In the left sidebar, click **"Environment variables"**
3. Click **"Add a variable"** button

### **Step 3: Add SMTP_USER**

1. Click **"Add a variable"**
2. **Key:** `SMTP_USER`
3. **Value:** `dharmamindai@outlook.com`
4. **Scopes:** Select **"All scopes"** (Production, Deploy Previews, Branch Deploys)
5. Click **"Create variable"**

### **Step 4: Add SMTP_PASS**

1. Click **"Add a variable"** again
2. **Key:** `SMTP_PASS`
3. **Value:** `inizqxfwsvquudpm`
4. **Scopes:** Select **"All scopes"**
5. Click **"Create variable"**

### **Step 5: Redeploy Your Site**

**Option A: Trigger Redeploy (Fastest)**
1. Go to **"Deploys"** tab
2. Click **"Trigger deploy"** dropdown
3. Select **"Clear cache and deploy site"**
4. Wait 2-3 minutes for deployment to complete

**Option B: Push a Small Change**
```bash
# Add a comment to trigger redeploy
cd "/home/rupert/Documents/dharmamind frontend /DharmaMindAI-main"
git commit --allow-empty -m "Trigger redeploy for env variables"
git push
```

---

## 🎯 **Visual Guide with Screenshots**

### **Finding Environment Variables:**

```
Netlify Dashboard
    ↓
Click your site (dharmamind)
    ↓
Site settings (top navigation)
    ↓
Environment variables (left sidebar)
    ↓
Add a variable (button on right)
```

### **What It Should Look Like:**

```
┌─────────────────────────────────────────────────────────┐
│ Environment variables                                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Key: SMTP_USER                                        │
│  Value: dharmamindai@outlook.com                       │
│  Scopes: ✓ Production ✓ Deploy Previews ✓ Branches    │
│                                                         │
│  Key: SMTP_PASS                                        │
│  Value: inizqxfwsvquudpm                               │
│  Scopes: ✓ Production ✓ Deploy Previews ✓ Branches    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ **Test After Setting Variables**

### **Method 1: Test via Browser**

1. Go to **https://dharmamind.ai**
2. Scroll to waitlist form
3. Enter your email: `YOUR_EMAIL@gmail.com`
4. Click "Join the Waitlist"
5. **Check your inbox** (should arrive in 1-3 seconds)

### **Method 2: Test via Command Line**

```bash
curl -X POST https://dharmamind.ai/.netlify/functions/submit_waitlist \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_EMAIL@gmail.com"}'
```

**Expected:**
- Response: `{"message":"Successfully joined the waitlist!","code":"SUCCESS"}`
- Email arrives in 1-3 seconds
- Email has subject: "🙏 Welcome to DharmaMind - You're on the List!"

---

## 🔍 **How to Verify Variables Are Set**

### **Check in Netlify:**

1. Go to **Site settings** → **Environment variables**
2. You should see:
   - ✅ `SMTP_USER` = `dharmamindai@outlook.com`
   - ✅ `SMTP_PASS` = `inizqxfwsvquudpm` (shown as `••••••••••••`)

### **Check in Function Logs:**

1. Go to **"Functions"** tab in Netlify
2. Click on **"submit_waitlist"**
3. Click **"Function log"**
4. Look for:
   - ✅ `Attempting to send email to: test@example.com`
   - ✅ `✅ Email sent successfully: <message-id>`
   - ❌ If you see errors about authentication, variables aren't set

---

## 🚨 **Common Mistakes**

### **❌ Mistake 1: Variable Names**
```
Wrong: smtp_user (lowercase)
Wrong: SMTP_USERNAME
Correct: SMTP_USER (exactly)
```

### **❌ Mistake 2: Scopes**
```
Wrong: Only "Production" selected
Correct: All scopes selected (Production, Deploy Previews, Branches)
```

### **❌ Mistake 3: Forgetting to Redeploy**
```
After adding variables, you MUST redeploy!
Variables only work after a new deployment.
```

### **❌ Mistake 4: Typos in Values**
```
Email: dharmamindai@outlook.com (no spaces!)
Password: inizqxfwsvquudpm (exact match, case-sensitive)
```

---

## 🎯 **Complete Checklist**

### **Before:**
- [ ] Site is live at https://dharmamind.ai
- [ ] Waitlist form accepts submissions
- [ ] API returns success (but no email sent)

### **After Setting Variables:**
- [ ] `SMTP_USER` added to Netlify environment variables
- [ ] `SMTP_PASS` added to Netlify environment variables
- [ ] Both variables have "All scopes" selected
- [ ] Site redeployed (clear cache and deploy)
- [ ] Deployment completed successfully (green checkmark)
- [ ] Tested email submission
- [ ] Email received in inbox
- [ ] Email looks professional with logo and branding

---

## 📊 **What Happens When Variables Are Missing**

### **Current Behavior (Variables Missing):**
```javascript
// In submit_waitlist.js:
const transporter = nodemailer.createTransport({
  auth: {
    user: process.env.SMTP_USER,  // ❌ undefined
    pass: process.env.SMTP_PASS   // ❌ undefined
  }
});

// Result: 
// - API returns 200 OK ✅
// - But email fails silently ❌
// - No error shown to user ❌
```

### **Fixed Behavior (Variables Set):**
```javascript
const transporter = nodemailer.createTransport({
  auth: {
    user: 'dharmamindai@outlook.com',  // ✅ Loaded from Netlify
    pass: 'inizqxfwsvquudpm'            // ✅ Loaded from Netlify
  }
});

// Result:
// - API returns 200 OK ✅
// - Email sends successfully ✅
// - User receives email in 1-3 seconds ✅
```

---

## 🔧 **Alternative: Check Variables via Netlify CLI**

If you have Netlify CLI installed:

```bash
# Login to Netlify
netlify login

# Link to your site
netlify link

# Check environment variables
netlify env:list

# Set variables via CLI
netlify env:set SMTP_USER "dharmamindai@outlook.com"
netlify env:set SMTP_PASS "inizqxfwsvquudpm"

# Redeploy
netlify deploy --prod
```

---

## 📞 **If Still Not Working**

### **Check Function Logs:**

1. Netlify Dashboard → Your site
2. Click **"Functions"** tab
3. Click **"submit_waitlist"**
4. Click **"Function log"** (recent invocations)
5. Look for error messages

### **Common Errors:**

**Error 1: "Invalid login"**
```
Solution: Check SMTP_USER and SMTP_PASS are correct
Verify: dharmamindai@outlook.com (no typos)
```

**Error 2: "Authentication failed"**
```
Solution: Check the app password is correct
Verify: inizqxfwsvquudpm (exact match)
```

**Error 3: "Connection timeout"**
```
Solution: Check SMTP_HOST is smtp-mail.outlook.com
Check port is 587
```

**Error 4: "Undefined user or pass"**
```
Solution: Variables not set in Netlify
Go back to Step 3 and 4 above
```

---

## ✅ **Success Criteria**

You'll know it's working when:

1. ✅ Submit test email on https://dharmamind.ai
2. ✅ See success message on page immediately
3. ✅ Receive email in inbox within 1-3 seconds
4. ✅ Email has proper formatting with logo
5. ✅ Email subject: "🙏 Welcome to DharmaMind - You're on the List!"
6. ✅ Email from: dharmamindai@outlook.com
7. ✅ Email includes:
   - Welcome message
   - Om symbol
   - "What happens next" section
   - Social media links
   - Launch timeline

---

## 🎯 **Quick Fix Summary**

**Problem:** Emails not sending  
**Cause:** Missing environment variables in Netlify  
**Solution:** Add SMTP_USER and SMTP_PASS to Netlify environment variables  
**Time to fix:** 5 minutes  
**Steps:** Dashboard → Site settings → Environment variables → Add 2 variables → Redeploy

---

**Last Updated:** October 16, 2025  
**Status:** Waiting for environment variables to be set  
**Next Action:** Set SMTP_USER and SMTP_PASS in Netlify Dashboard  
**Expected Result:** Emails start sending immediately after redeploy
