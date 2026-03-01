const axios = require('axios');
const https = require('https');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

class AntiBotBypass {
    constructor(options = {}) {
        this.baseURL = 'https://sh.lianjia.com';
        this.proxyList = options.proxies || [];
        this.userAgentRotation = options.userAgentRotation || true;
        this.maxRetries = options.maxRetries || 5;
        this.delayRange = options.delayRange || { min: 2000, max: 5000 };
        
        // Advanced user agent pool
        this.userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/121.0'
        ];

        // Browser headers simulation
        this.browserHeaders = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
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
            'Cache-Control': 'max-age=0'
        };

        this.currentProxyIndex = 0;
        this.sessionCookies = new Map();
        this.requestCount = 0;
        this.lastRequestTime = Date.now();
    }

    getRandomUserAgent() {
        return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    }

    getRandomDelay() {
        return Math.floor(Math.random() * (this.delayRange.max - this.delayRange.min) + this.delayRange.min);
    }

    getNextProxy() {
        if (this.proxyList.length === 0) return null;
        const proxy = this.proxyList[this.currentProxyIndex];
        this.currentProxyIndex = (this.currentProxyIndex + 1) % this.proxyList.length;
        return proxy;
    }

    async createSession(proxy = null) {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const axiosConfig = {
            timeout: 15000,
            headers: {
                ...this.browserHeaders,
                'User-Agent': this.getRandomUserAgent()
            },
            withCredentials: true,
            httpsAgent: new https.Agent({ 
                rejectUnauthorized: false,
                keepAlive: true 
            })
        };

        // Add proxy if available
        if (proxy) {
            axiosConfig.proxy = {
                protocol: proxy.protocol || 'http',
                host: proxy.host,
                port: proxy.port,
                auth: proxy.auth ? {
                    username: proxy.auth.username,
                    password: proxy.auth.password
                } : undefined
            };
        }

        const client = axios.create(axiosConfig);
        
        // Add response interceptor for cookie handling
        client.interceptors.response.use(
            response => {
                // Extract and store cookies
                const setCookieHeader = response.headers['set-cookie'];
                if (setCookieHeader) {
                    this.sessionCookies.set(sessionId, setCookieHeader);
                }
                return response;
            },
            error => Promise.reject(error)
        );

        return { client, sessionId };
    }

    async smartRequest(url, options = {}) {
        const maxAttempts = this.maxRetries;
        let lastError = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const proxy = this.getNextProxy();
                const { client, sessionId } = await this.createSession(proxy);
                
                // Add human-like delay
                const timeSinceLastRequest = Date.now() - this.lastRequestTime;
                const requiredDelay = this.getRandomDelay();
                if (timeSinceLastRequest < requiredDelay) {
                    await this.sleep(requiredDelay - timeSinceLastRequest);
                }

                // Prepare request headers
                const headers = {
                    ...this.browserHeaders,
                    'User-Agent': this.getRandomUserAgent(),
                    'Referer': this.baseURL
                };

                // Add stored cookies
                const cookies = this.sessionCookies.get(sessionId);
                if (cookies) {
                    headers['Cookie'] = cookies.join('; ');
                }

                logger.debug(`Making request (attempt ${attempt}/${maxAttempts})`, { 
                    url, 
                    proxy: proxy ? `${proxy.host}:${proxy.port}` : 'direct',
                    userAgent: headers['User-Agent'].substring(0, 50) + '...'
                });

                const response = await client.get(url, { headers });
                
                // Check for anti-bot indicators
                const antiBotIndicators = this.detectAntiBotProtection(response.data, response.headers);
                if (antiBotIndicators.detected) {
                    logger.warn('Anti-bot protection detected', antiBotIndicators);
                    
                    if (attempt < maxAttempts) {
                        const backoffDelay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
                        logger.info(`Anti-bot detected, waiting ${backoffDelay}ms before retry`);
                        await this.sleep(backoffDelay);
                        continue;
                    } else {
                        throw new Error(`Anti-bot protection persists after ${maxAttempts} attempts: ${antiBotIndicators.reason}`);
                    }
                }

                this.lastRequestTime = Date.now();
                this.requestCount++;

                logger.debug('Request successful', {
                    url,
                    status: response.status,
                    contentLength: response.data.length,
                    requestCount: this.requestCount
                });

                return {
                    data: response.data,
                    headers: response.headers,
                    status: response.status,
                    sessionId
                };

            } catch (error) {
                lastError = error;
                logger.warn(`Request failed (attempt ${attempt}/${maxAttempts})`, {
                    url,
                    error: error.message,
                    attempt
                });

                if (attempt < maxAttempts) {
                    // Exponential backoff with jitter
                    const backoffDelay = Math.pow(2, attempt) * 1000 + Math.random() * 2000;
                    logger.info(`Waiting ${backoffDelay}ms before retry`);
                    await this.sleep(backoffDelay);
                }
            }
        }

        throw new Error(`All ${maxAttempts} attempts failed. Last error: ${lastError?.message}`);
    }

    detectAntiBotProtection(html, headers) {
        const indicators = {
            detected: false,
            reason: '',
            details: {}
        };

        // Check response headers
        if (headers['server'] && headers['server'].includes('cloudflare')) {
            if (html.includes('Checking your browser before accessing') || 
                html.includes('Please stand by, while we are checking your browser')) {
                indicators.detected = true;
                indicators.reason = 'Cloudflare browser check detected';
                indicators.details.cloudflare = true;
            }
        }

        // Check for captcha/verification pages
        const verificationIndicators = [
            '验证码',
            'verify',
            'captcha',
            'security check',
            'access denied',
            'blocked',
            'rate limit',
            '请稍后再试'
        ];

        const lowerHtml = html.toLowerCase();
        for (const indicator of verificationIndicators) {
            if (lowerHtml.includes(indicator.toLowerCase())) {
                indicators.detected = true;
                indicators.reason = `Verification/captcha detected: ${indicator}`;
                indicators.details[indicator] = true;
                break;
            }
        }

        // Check for unusual status codes
        if (headers.status === 403 || headers.status === 429) {
            indicators.detected = true;
            indicators.reason = `Blocked with status ${headers.status}`;
            indicators.details.statusCode = headers.status;
        }

        // Check for JavaScript challenge pages
        if (html.includes('Checking your browser') || 
            html.includes('Just a moment') ||
            html.includes('Please enable JavaScript')) {
            indicators.detected = true;
            indicators.reason = 'JavaScript challenge detected';
            indicators.details.jsChallenge = true;
        }

        return indicators;
    }

    async visitRandomPages(baseUrl, count = 3) {
        const pages = [
            '/',
            '/ershoufang/',
            '/xiaoqu/',
            '/chengjiao/',
            '/zufang/'
        ];

        logger.info('Visiting random pages to establish legitimacy', { count });
        
        for (let i = 0; i < count; i++) {
            const randomPage = pages[Math.floor(Math.random() * pages.length)];
            const url = `${baseUrl}${randomPage}`;
            
            try {
                await this.smartRequest(url);
                await this.sleep(this.getRandomDelay() / 2);
            } catch (error) {
                logger.debug('Random page visit failed (continuing)', { url, error: error.message });
            }
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getStats() {
        return {
            requestCount: this.requestCount,
            activeSessions: this.sessionCookies.size,
            proxiesAvailable: this.proxyList.length,
            userAgentPoolSize: this.userAgents.length
        };
    }
}

module.exports = AntiBotBypass;