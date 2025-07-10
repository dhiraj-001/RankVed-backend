# 🔗 Backend-Frontend Connection Guide

## ✅ Connection Status: WORKING

The backend and frontend are now properly connected and ready for deployment!

## 🏗️ Current Architecture

```
Backend (Port 5000)          Frontend (Port 5173)
├── API Server              ├── React App
├── Database Connection     ├── Vite Dev Server
├── CORS Configured         ├── API Client
└── Session Management      └── Environment Config
```

## 🔧 How They Connect

### Backend Configuration
- **CORS enabled** for `http://localhost:5173` (dev) and production domains
- **API endpoints** available at `http://localhost:5000/api/*`
- **Session cookies** properly handled
- **JSON responses** with proper headers

### Frontend Configuration
- **API URL** configured via `VITE_API_URL` environment variable
- **Credentials included** in all requests
- **Error handling** for network issues
- **TypeScript types** match backend responses

## 🚀 Development Workflow

### 1. Start Backend
```bash
# Backend runs on port 5000
npm run dev
```

### 2. Start Frontend
```bash
cd frontend
npm run dev
# Frontend runs on port 5173
```

### 3. Test Connection
```bash
cd frontend
node test-connection.js
# Should show: ✅ Backend status: RankVed Backend API
```

## 📋 Deployment Options

### Option 1: Keep Backend on Replit
1. Backend stays on Replit (always-on)
2. Frontend deploys to Vercel/Netlify
3. Set `VITE_API_URL=https://your-replit-domain.replit.app`

### Option 2: Deploy Both Separately
1. Backend to Railway/Render
2. Frontend to Vercel/Netlify
3. Update CORS origins in backend
4. Set `VITE_API_URL` to backend URL

## 🛠️ Configuration Files

### Backend CORS (server/index.ts)
```javascript
const allowedOrigins = [
  'http://localhost:5173',
  'https://your-frontend-domain.vercel.app',
];
```

### Frontend API (frontend/.env)
```env
VITE_API_URL=http://localhost:5000
```

## ✅ Test Results

Connection test successful:
- ✅ Backend API responding
- ✅ CORS headers present
- ✅ Chatbots endpoint working
- ✅ Database connection active
- ✅ Frontend can fetch data

## 🔄 Next Steps

1. **Deploy frontend** to Vercel/Netlify
2. **Update CORS origins** with production domain
3. **Set production API URL** in frontend environment
4. **Test production connection**

The separation is complete and both systems are working independently while properly connected!