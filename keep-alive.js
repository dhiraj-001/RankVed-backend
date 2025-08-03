#!/usr/bin/env node

/**
 * Keep-alive script for RankVed backend
 * This script can be used with external cron job services like cron-job.org
 * 
 * Usage:
 * 1. Deploy this script to a service like cron-job.org
 * 2. Set it to run every 3-5 minutes
 * 3. Replace YOUR_BACKEND_URL with your actual backend URL
 */

const https = require('https');
const http = require('http');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'https://your-backend-url.vercel.app';
const ENDPOINT = '/api/keep-alive';
const TIMEOUT = 10000; // 10 seconds

function pingBackend() {
  const url = new URL(ENDPOINT, BACKEND_URL);
  const client = url.protocol === 'https:' ? https : http;
  
  console.log(`[Keep-Alive] Pinging: ${url.toString()}`);
  
  const req = client.get(url.toString(), {
    timeout: TIMEOUT,
    headers: {
      'User-Agent': 'RankVed-KeepAlive/1.0'
    }
  }, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log(`[Keep-Alive] Success: ${res.statusCode} - ${response.message}`);
        console.log(`[Keep-Alive] Uptime: ${response.uptime}s`);
        process.exit(0);
      } catch (error) {
        console.error(`[Keep-Alive] Error parsing response: ${error.message}`);
        process.exit(1);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error(`[Keep-Alive] Request failed: ${error.message}`);
    process.exit(1);
  });
  
  req.on('timeout', () => {
    console.error(`[Keep-Alive] Request timed out after ${TIMEOUT}ms`);
    req.destroy();
    process.exit(1);
  });
}

// Run the ping
pingBackend(); 