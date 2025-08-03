# Cron Jobs Setup for RankVed Backend

This guide explains how to set up cron jobs to prevent your RankVed backend from going to sleep when inactive.

## Overview

Serverless platforms like Vercel automatically put your backend to sleep after a period of inactivity. This can cause:
- Slow response times for the first request after inactivity
- Potential timeouts for users
- Poor user experience

## Solution 1: Vercel Cron Jobs (Recommended)

### What's Already Set Up

1. **Vercel Configuration**: Updated `vercel.json` with cron job configuration
2. **Keep-Alive Endpoint**: Added `/api/keep-alive` endpoint in `routes.ts`
3. **Health Check**: Existing `/api/health` endpoint for comprehensive health monitoring

### Configuration Details

```json
{
  "crons": [
    {
      "path": "/api/keep-alive",
      "schedule": "*/14 * * * *"
    }
  ]
}
```

- **Schedule**: `*/3 * * * *` means every 3 minutes
- **Endpoint**: `/api/keep-alive` (lightweight, no database check)
- **Purpose**: Keeps the server warm and responsive

### How It Works

1. Vercel automatically calls `/api/keep-alive` every 3 minutes
2. The endpoint responds with a simple JSON response
3. This keeps your server instance active
4. No additional setup required - works automatically after deployment

## Solution 2: External Cron Job Services (Backup)

If you prefer external services or want redundancy, you can use:

### Option A: cron-job.org

1. Go to [cron-job.org](https://cron-job.org)
2. Create a free account
3. Add a new cron job with these settings:
   - **URL**: `https://your-backend-url.vercel.app/api/keep-alive`
   - **Schedule**: Every 3 minutes
   - **Method**: GET

### Option B: UptimeRobot

1. Go to [UptimeRobot](https://uptimerobot.com)
2. Create a free account
3. Add a new monitor:
   - **Type**: HTTP(s)
   - **URL**: `https://your-backend-url.vercel.app/api/keep-alive`
   - **Interval**: 5 minutes

### Option C: Using the Keep-Alive Script

Use the provided `keep-alive.js` script:

1. **Deploy to a service** that supports Node.js cron jobs
2. **Set environment variable**: `BACKEND_URL=https://your-backend-url.vercel.app`
3. **Schedule**: Run every 3-5 minutes

## Monitoring

### Check if Cron Jobs are Working

1. **Vercel Dashboard**: Check the "Functions" tab for cron job executions
2. **Logs**: Look for `[Keep-Alive] Cron job ping received:` messages
3. **Response Time**: First requests should be fast (no cold start)

### Test Endpoints Manually

```bash
# Test keep-alive endpoint
curl https://your-backend-url.vercel.app/api/keep-alive

# Test health endpoint (includes database check)
curl https://your-backend-url.vercel.app/api/health
```

Expected responses:

**Keep-Alive:**
```json
{
  "status": "alive",
  "message": "Backend is active and responding",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600
}
```

**Health:**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Troubleshooting

### Cron Jobs Not Working

1. **Check Vercel Plan**: Cron jobs require a paid Vercel plan
2. **Verify Configuration**: Ensure `vercel.json` is properly formatted
3. **Deploy Changes**: Make sure to redeploy after configuration changes

### Backend Still Going to Sleep

1. **Increase Frequency**: Change schedule to `*/2 * * * *` (every 2 minutes)
2. **Add Redundancy**: Use both Vercel cron and external service
3. **Check Logs**: Verify endpoints are being called

### Performance Impact

- **Keep-Alive Endpoint**: Minimal impact (no database queries)
- **Health Endpoint**: Slight impact (includes database ping)
- **Frequency**: 3-minute intervals are optimal for most use cases

## Cost Considerations

### Vercel Cron Jobs
- **Free Tier**: Not available
- **Pro Plan**: $20/month (includes cron jobs)
- **Enterprise**: Custom pricing

### External Services
- **cron-job.org**: Free tier available
- **UptimeRobot**: Free tier available (50 monitors)
- **Custom Script**: Depends on hosting service

## Best Practices

1. **Use Keep-Alive for Cron**: Lighter than health check
2. **Monitor Logs**: Watch for any errors or issues
3. **Set Reasonable Intervals**: 3-5 minutes is usually sufficient
4. **Have Backup**: Consider using multiple services
5. **Test Regularly**: Verify endpoints respond correctly

## Next Steps

1. **Deploy Changes**: Push your updated code to Vercel
2. **Verify Setup**: Check that cron jobs are running
3. **Monitor Performance**: Watch for improved response times
4. **Consider Upgrading**: If on free tier, consider Vercel Pro for cron jobs

Your backend should now stay active and responsive even during periods of inactivity! 