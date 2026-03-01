const axios = require('axios');
const https = require('https');
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

class EnhancedAntiBotBypass {
    constructor(options = {}) {
        this.baseURL = 'https://sh.lianjia.com';
        this.proxyList = options.proxies || [];
        this.userAgentRotation = options.userAgentRotation || true;
        this.maxRetries = options.maxRetries || 5;
        this.delayRange = options.delayRange || { min: 2000, max: 5000 };
        this.strategy = options.strategy || 'hybrid'; // 'http', 'puppeteer', 'hybrid'
        
        // Enhanced user agent pool with more realistic variations
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Edge/120.0.0.0'
        ];

        // Enhanced browser headers with more realistic variations
        this.browserHeaders = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-US;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
            'DNT': '1',
            'Viewport-Width': '1920'
        };

        // Mobile-specific headers
        this.mobileHeaders = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Ch-Ua-Mobile': '?1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0',
            'DNT': '1'
        };

        this.currentProxyIndex = 0;
        this.sessionCookies = new Map();
        this.requestCount = 0;
        this.lastRequestTime = Date.now();
        this.successfulRequests = 0;
        this.failedRequests = 0;
        
        // Advanced anti-bot counters
        this.consecutiveFailures = 0;
        this.lastSuccessfulRequest = Date.now();
        this.sessionStartTime = Date.now();
        
        // Alternative domains and endpoints
        this.alternativeEndpoints = [
            'https://m.lianjia.com/sh/',
            'https://sh.ke.com/',
            'https://www.lianjia.com/city/shanghai/'
        ];
        
        // Puppeteer browser instance
        this.browser = null;
        this.puppeteerInitialized = false;
    }

    getRandomUserAgent(isMobile = false) {
        const agents = isMobile ? 
            this.userAgents.filter(ua => ua.includes('iPhone') || ua.includes('Android')) :
            this.userAgents.filter(ua => !ua.includes('iPhone') && !ua.includes('Android'));
        return agents[Math.floor(Math.random() * agents.length)];
    }

    getRandomDelay() {
        const { min, max } = this.delayRange;
        return Math.random() * (max - min) + min;
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Enhanced anti-bot detection with more sophisticated patterns
    detectAntiBotProtection(html, response) {
        const detection = {
            detected: false,
            reason: null,
            details: {},
            severity: 'low'
        };

        // Check response headers for bot detection services
        const headers = response.headers || {};
        if (headers['server']) {
            if (headers['server'].toLowerCase().includes('cloudflare')) {
                if (html.includes('Checking your browser before accessing') || 
                    html.includes('Please stand by, while we are checking your browser') ||
                    html.includes('cf-browser-verification')) {
                    detection.detected = true;
                    detection.reason = 'Cloudflare browser verification detected';
                    detection.details.service = 'cloudflare';
                    detection.severity = 'high';
                }
            } else if (headers['server'].toLowerCase().includes('ddos-guard') ||
                      headers['server'].toLowerCase().includes('sucuri')) {
                detection.detected = true;
                detection.reason = 'DDoS protection service detected';
                detection.details.service = headers['server'];
                detection.severity = 'high';
            }
        }

        // Enhanced CAPTCHA detection
        const captchaPatterns = [
            '验证码', 'verification', 'captcha', 'verify',
            '人机验证', '安全验证', '身份验证',
            '请完成验证', '滑动验证', '点击验证',
            'recaptcha', 'hcaptcha', 'geetest',
            'check code', 'validation code'
        ];

        const lowerHtml = html.toLowerCase();
        for (const pattern of captchaPatterns) {
            if (lowerHtml.includes(pattern.toLowerCase())) {
                detection.detected = true;
                detection.reason = `CAPTCHA/Verification detected: ${pattern}`;
                detection.details.type = 'captcha';
                detection.details.pattern = pattern;
                detection.severity = 'critical';
                break;
            }
        }

        // Rate limiting and blocking detection
        const blockingPatterns = [
            'access denied', 'blocked', 'forbidden', '403',
            'request blocked', 'ip blocked', 'rate limit',
            'too many requests', '访问过于频繁',
            '您的访问被限制', '您已被禁止访问',
            '429 too many requests'
        ];

        for (const pattern of blockingPatterns) {
            if (lowerHtml.includes(pattern.toLowerCase())) {
                detection.detected = true;
                detection.reason = `Blocking detected: ${pattern}`;
                detection.details.type = 'blocking';
                detection.details.pattern = pattern;
                detection.severity = detection.severity === 'critical' ? 'critical' : 'high';
                break;
            }
        }

        // JavaScript challenge detection
        if (html.includes('Checking your browser') || 
            html.includes('Just a moment') ||
            html.includes('Please enable JavaScript') ||
            html.includes('jschl-answer') ||
            html.includes('cf-challenge-running')) {
            detection.detected = true;
            detection.reason = 'JavaScript challenge detected';
            detection.details.type = 'js_challenge';
            detection.severity = 'high';
        }

        // Empty or suspicious response detection
        if (!html || html.length < 100) {
            detection.detected = true;
            detection.reason = 'Empty or suspiciously short response';
            detection.details.type = 'empty_response';
            detection.severity = 'medium';
        }

        // Suspicious content patterns
        const suspiciousPatterns = [
            'bot detected', 'automated access', 'unusual activity',
            'security check', 'browser check', 'anti-bot'
        ];

        for (const pattern of suspiciousPatterns) {
            if (lowerHtml.includes(pattern)) {
                detection.detected = true;
                detection.reason = `Suspicious content detected: ${pattern}`;
                detection.details.type = 'suspicious_content';
                detection.details.pattern = pattern;
                detection.severity = 'high';
                break;
            }
        }

        return detection;
    }

    // Initialize Puppeteer browser for advanced bypass
    async initPuppeteer() {
        if (this.puppeteerInitialized) return;

        try {
            logger.info('Initializing Puppeteer browser for advanced anti-bot bypass');
            
            this.browser = await puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--lang=zh-CN,zh,en-US,en'
                ]
            });

            this.puppeteerInitialized = true;
            logger.info('Puppeteer browser initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize Puppeteer', { error: error.message });
            throw new Error(`Puppeteer initialization failed: ${error.message}`);
        }
    }

    // Enhanced HTTP request with advanced bypass techniques
    async makeRequest(url, options = {}) {
        const maxAttempts = this.maxRetries;
        let lastError = null;
        let currentStrategy = this.strategy;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                // Adaptive strategy switching based on failure history
                if (this.consecutiveFailures > 2 && currentStrategy !== 'puppeteer') {
                    logger.info('Switching to Puppeteer strategy due to repeated failures');
                    currentStrategy = 'puppeteer';
                }

                let response;
                
                if (currentStrategy === 'puppeteer') {
                    response = await this.makePuppeteerRequest(url, options);
                } else {
                    response = await this.makeHttpRequest(url, options);
                }

                // Check for anti-bot protection
                const antiBotCheck = this.detectAntiBotProtection(response.body, response);
                
                if (antiBotCheck.detected) {
                    logger.warn('Anti-bot protection detected', antiBotCheck);
                    this.failedRequests++;
                    this.consecutiveFailures++;
                    
                    if (attempt < maxAttempts) {
                        // Adaptive delay based on severity
                        const baseDelay = antiBotCheck.severity === 'critical' ? 5000 : 2000;
                        const backoffDelay = Math.pow(2, attempt) * baseDelay + Math.random() * 2000;
                        
                        logger.info(`Anti-bot detected, waiting ${backoffDelay}ms before retry (attempt ${attempt}/${maxAttempts})`);
                        await this.sleep(backoffDelay);
                        
                        // Rotate strategy for next attempt
                        if (attempt > 1) {
                            currentStrategy = currentStrategy === 'http' ? 'puppeteer' : 'http';
                        }
                        continue;
                    } else {
                        throw new Error(`Anti-bot protection persists after ${maxAttempts} attempts: ${antiBotCheck.reason}`);
                    }
                }

                // Success case
                this.successfulRequests++;
                this.consecutiveFailures = 0;
                this.lastSuccessfulRequest = Date.now();
                this.lastRequestTime = Date.now();
                this.requestCount++;

                logger.debug('Request successful', {
                    url,
                    status: response.statusCode || response.status,
                    contentLength: response.body.length,
                    strategy: currentStrategy,
                    requestCount: this.requestCount
                });

                return response;

            } catch (error) {
                lastError = error;
                this.failedRequests++;
                this.consecutiveFailures++;
                
                logger.warn(`Request failed (attempt ${attempt}/${maxAttempts})`, {
                    url,
                    error: error.message,
                    strategy: currentStrategy,
                    attempt
                });

                if (attempt < maxAttempts) {
                    // Exponential backoff with jitter
                    const backoffDelay = Math.pow(2, attempt) * 1000 + Math.random() * 3000;
                    logger.info(`Waiting ${backoffDelay}ms before retry`);
                    await this.sleep(backoffDelay);
                }
            }
        }

        throw new Error(`All ${maxAttempts} attempts failed. Last error: ${lastError?.message}`);
    }

    // Traditional HTTP request with enhanced headers
    async makeHttpRequest(url, options = {}) {
        const proxy = this.proxyList.length > 0 ? 
            this.proxyList[this.currentProxyIndex++ % this.proxyList.length] : null;

        // Randomize user agent and headers
        const isMobile = Math.random() > 0.7;
        const userAgent = this.getRandomUserAgent(isMobile);
        const headers = isMobile ? { ...this.mobileHeaders } : { ...this.browserHeaders };
        headers['User-Agent'] = userAgent;

        // Add referer and other realistic headers
        headers['Referer'] = this.baseURL;
        headers['Accept-Language'] = isMobile ? 
            'zh-CN,zh;q=0.9,en;q=0.8' : 
            'zh-CN,zh;q=0.9,en;q=0.8,en-US;q=0.7';

        const requestOptions = {
            hostname: new URL(url).hostname,
            port: 443,
            path: new URL(url).pathname + new URL(url).search,
            method: 'GET',
            headers: headers,
            timeout: 15000
        };

        if (proxy) {
            requestOptions.agent = new https.Agent({
                host: proxy.host,
                port: proxy.port,
                auth: proxy.auth ? `${proxy.auth.username}:${proxy.auth.password}` : undefined
            });
        } else {
            requestOptions.agent = new https.Agent({ rejectUnauthorized: false });
        }

        return new Promise((resolve, reject) => {
            const req = https.request(requestOptions, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: data
                    });
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.end();
        });
    }

    // Puppeteer-based request for maximum bypass capability
    async makePuppeteerRequest(url, options = {}) {
        if (!this.puppeteerInitialized) {
            await this.initPuppeteer();
        }

        const page = await this.browser.newPage();
        
        try {
            // Set realistic viewport and user agent
            const isMobile = Math.random() > 0.7;
            const userAgent = this.getRandomUserAgent(isMobile);
            
            await page.setUserAgent(userAgent);
            await page.setViewport(isMobile ? 
                { width: 375, height: 667 } : 
                { width: 1920, height: 1080 }
            );

            // Set extra HTTP headers
            await page.setExtraHTTPHeaders({
                'Accept': isMobile ? this.mobileHeaders.Accept : this.browserHeaders.Accept,
                'Accept-Language': isMobile ? 'zh-CN,zh;q=0.9,en;q=0.8' : 'zh-CN,zh;q=0.9,en;q=0.8,en-US;q=0.7',
                'Accept-Encoding': 'gzip, deflate, br',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            });

            // Navigate with human-like behavior
            logger.debug('Navigating with Puppeteer', { url });
            
            // Add random delays to mimic human behavior
            await this.sleep(Math.random() * 1000 + 500);
            
            const response = await page.goto(url, {
                waitUntil: 'networkidle2',
                timeout: 30000
            });

            // Wait for content to load
            await page.waitForSelector('body', { timeout: 10000 }).catch(() => {});
            
            // Scroll slightly to trigger lazy loading
            await page.evaluate(() => {
                window.scrollBy(0, Math.random() * 200 + 100);
            });
            
            await this.sleep(Math.random() * 1000 + 500);

            const content = await page.content();
            const headers = response ? response.headers() : {};

            return {
                statusCode: response ? response.status() : 200,
                headers: headers,
                body: content
            };

        } finally {
            await page.close();
        }
    }

    // New method: Try alternative endpoints when main site is blocked
    async tryAlternativeEndpoints(district = '') {
        const endpoints = [
            `https://m.lianjia.com/sh/ershoufang/${district}/`,
            `https://sh.ke.com/ershoufang/${district}/`,
            `https://sh.lianjia.com/ershoufang/${district}/`
        ];

        for (const endpoint of endpoints) {
            try {
                logger.info(`Trying alternative endpoint: ${endpoint}`);
                const response = await this.makeRequest(endpoint);
                const antiBotCheck = this.detectAntiBotProtection(response.body, response);
                
                if (!antiBotCheck.detected) {
                    logger.info(`Alternative endpoint successful: ${endpoint}`);
                    return response;
                }
            } catch (error) {
                logger.debug(`Alternative endpoint failed: ${endpoint}`, { error: error.message });
                continue;
            }
        }

        throw new Error('All alternative endpoints failed');
    }

    // Get system statistics
    getStats() {
        return {
            requestCount: this.requestCount,
            successfulRequests: this.successfulRequests,
            failedRequests: this.failedRequests,
            successRate: this.successfulRequests / Math.max(this.requestCount, 1),
            consecutiveFailures: this.consecutiveFailures,
            sessionAge: (Date.now() - this.sessionStartTime) / 1000 / 60, // minutes
            activeSessions: this.sessionCookies.size,
            proxiesAvailable: this.proxyList.length,
            userAgentPoolSize: this.userAgents.length,
            puppeteerEnabled: this.puppeteerInitialized,
            strategy: this.strategy
        };
    }

    // Reset session for fresh start
    resetSession() {
        this.sessionCookies.clear();
        this.consecutiveFailures = 0;
        this.sessionStartTime = Date.now();
        logger.info('Session reset for fresh start');
    }

    // Close Puppeteer browser
    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.puppeteerInitialized = false;
            logger.info('Puppeteer browser closed');
        }
    }
}

module.exports = EnhancedAntiBotBypass;