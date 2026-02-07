# Gemini API Quota Issue - Solutions

## What Happened

You've hit the **Gemini API free tier rate limit**. The error shows:
- Quota exceeded for `gemini-2.0-flash`
- Free tier limit: 0 requests remaining
- Need to wait ~27 seconds before retry

## Immediate Fix Applied

I've already updated your code to:
1. ✅ **Switched to `gemini-1.5-flash`** (different quota pool)
2. ✅ **Added graceful error handling** - shows user-friendly messages
3. ✅ **Added retry delay detection** - tells you how long to wait
4. ✅ **Better error logging** - see what's happening in console

## Solutions (Choose One)

### Option 1: Wait and Use Free Tier (Recommended for Testing)

The free tier has these limits per minute:
- **gemini-1.5-flash**: 15 requests/minute, 1 million tokens/minute
- **gemini-1.5-pro**: 2 requests/minute, 32k tokens/minute

**What to do:**
1. Wait 30-60 seconds
2. Try sending a message again
3. Space out your requests (wait a few seconds between messages)

### Option 2: Get a Paid API Key (Recommended for Real Use)

**Paid tier benefits:**
- Much higher rate limits
- More reliable service
- Pay-as-you-go pricing (very affordable)

**How to upgrade:**
1. Go to https://ai.google.dev/pricing
2. Set up billing in Google Cloud Console
3. Your same API key will automatically get higher limits

**Pricing (very affordable):**
- gemini-1.5-flash: ~$0.075 per 1M input tokens
- gemini-1.5-pro: ~$1.25 per 1M input tokens

### Option 3: Use a Different API Key

If you have another Google account:
1. Go to https://ai.google.dev/
2. Create a new API key
3. Update your `.env` file:
   ```bash
   GEMINI_API_KEY=your-new-key-here
   ```
4. Restart the server: `bun dev`

### Option 4: Switch Models (Already Done!)

I've already changed from `gemini-2.0-flash` to `gemini-1.5-flash` which has separate quotas.

## Testing Now

1. **Restart your dev server:**
   ```bash
   cd C:\Users\akhil\Desktop\Project_BOT\proj
   bun dev
   ```

2. **Wait 30 seconds** (to clear the rate limit)

3. **Send a simple message** to the robot:
   - "Wave at me"
   - "Look at the table"
   - "Tell me what you see"

4. **Check the console** - you should see:
   ```
   🤖 Initializing Gemini session with model: gemini-1.5-flash
   ```

## Error Handling Now in Place

When you hit rate limits, you'll see user-friendly messages like:
- "API quota exceeded. Please wait 27 seconds before trying again."
- Instead of a scary stack trace

The app won't crash - it will just show the error in the chat.

## Monitoring Your Usage

Check your quota usage at:
- https://ai.dev/rate-limit (official quota monitor)
- https://console.cloud.google.com/ (if you have paid billing)

## Best Practices to Avoid Limits

1. **Space out requests** - Wait 1-2 seconds between messages
2. **Use simpler prompts** - Shorter messages = fewer tokens
3. **Avoid vision when possible** - Images use more tokens
4. **Don't spam retry** - If you hit limit, wait the full retry time

## Current Free Tier Limits (as of 2024)

| Model | Requests/Min | Tokens/Min | Requests/Day |
|-------|--------------|------------|--------------|
| gemini-1.5-flash | 15 | 1M | 1500 |
| gemini-1.5-pro | 2 | 32k | 50 |
| gemini-2.0-flash | 10 | 4M | 1500 |

## If You Keep Hitting Limits

You might be:
1. Refreshing the page too often (creates new sessions)
2. Sending messages too quickly
3. Already at daily limit (wait until tomorrow)

**Solution:** Either:
- Wait longer between requests
- Upgrade to paid tier ($5-10/month for typical usage)
- Use manual controls instead of AI for testing

## Testing Manual Controls (No API Needed)

You can test the robot without using the AI:
1. Click **"MANUAL CONTROLS"** button
2. Use sliders to move joints
3. Use action buttons (Wave, Greet, Point, etc.)
4. Test grasp/release with object buttons

This helps you verify the robot works while waiting for API quota to reset!

---

## Quick Reference

**Current model:** `gemini-1.5-flash`
**Free tier limit:** 15 requests/minute
**If error occurs:** Wait the time shown in error message
**To upgrade:** https://ai.google.dev/pricing
**To monitor usage:** https://ai.dev/rate-limit
