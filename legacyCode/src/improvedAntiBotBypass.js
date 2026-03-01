const axios = require('axios');
const https = require('https');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

class ImprovedAntiBotBypass {
    constructor(options = {}) {
        this.baseURL = 'https://sh.lianjia.com';
        this.proxyList = options.proxies || [];
        this.userAgentRotation = options.userAgentRotation || true;
        this.maxRetries = options.maxRetries || 7;
        this.delayRange = options.delayRange || { min: 2500, max: 6000 };
        this.strategy = options.strategy || 'adaptive';
        
        // Enhanced user agent pool with more realistic and diverse options
        this.userAgents = [
            // Modern Chrome browsers
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            
            // Firefox browsers
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/121.0',
            
            // Mobile browsers
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
            
            // Edge browsers
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Edge/120.0.0.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Edge/120.0.0.0',
            
            // Older but still common browsers (for diversity)
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
        ];

        // Comprehensive browser headers that mimic real browsers
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
            'Cache-Control': 'max-age=0',
            'DNT': '1',
            'Viewport-Width': '1920',
            'Downlink': '10',
            'ECT': '4g',
            'RTT': '50'
        };

        // Mobile-specific headers
        this.mobileHeaders = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Ch-Ua-Mobile': '?1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0',
            'DNT': '1',
            'Viewport-Width': '375'
        };

        // Session and tracking variables
        this.currentProxyIndex = 0;
        this.sessionCookies = new Map();
        this.requestCount = 0;
        this.lastRequestTime = Date.now();
        this.successfulRequests = 0;
        this.failedRequests = 0;
        this.consecutiveFailures = 0;
        this.lastSuccessfulRequest = Date.now();
        this.sessionStartTime = Date.now();
        
        // Advanced tracking
        this.domainVisitHistory = new Map(); // Track visits to different domains
        this.requestTimingHistory = []; // Track request timing patterns
        this.failurePatterns = []; // Track failure patterns
        
        // Alternative endpoints and domains
        this.alternativeEndpoints = [
            { domain: 'https://m.lianjia.com', path: '/sh/ershoufang/' },
            { domain: 'https://sh.ke.com', path: '/ershoufang/' },
            { domain: 'https://www.lianjia.com', path: '/city/shanghai/ershoufang/' }
        ];
    }

    getRandomUserAgent(isMobile = false) {
        const agents = isMobile ? 
            this.userAgents.filter(ua => ua.includes('iPhone') || ua.includes('Android') || ua.includes('iPad')) :
            this.userAgents.filter(ua => !ua.includes('iPhone') && !ua.includes('Android') && !ua.includes('iPad'));
        return agents[Math.floor(Math.random() * agents.length)];
    }

    getRandomDelay() {
        const { min, max } = this.delayRange;
        // Add some randomness to make timing more human-like
        const baseDelay = Math.random() * (max - min) + min;
        const humanVariation = (Math.random() - 0.5) * 1000; // ±500ms variation
        return Math.max(1000, baseDelay + humanVariation); // Minimum 1 second
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Enhanced anti-bot detection with machine learning-inspired patterns
    detectAntiBotProtection(html, response = {}) {
        const detection = {
            detected: false,
            reason: null,
            details: {},
            severity: 'low',
            confidence: 0
        };

        const headers = response.headers || {};
        const lowerHtml = (html || '').toLowerCase();

        // Weighted scoring system for detection
        let score = 0;

        // Server-level detection (high weight)
        if (headers['server']) {
            const server = headers['server'].toLowerCase();
            if (server.includes('cloudflare')) {
                if (lowerHtml.includes('checking your browser') || 
                    lowerHtml.includes('please stand by') ||
                    lowerHtml.includes('cf-browser-verification')) {
                    score += 25;
                    detection.details.cloudflare = true;
                    detection.reason = detection.reason || 'Cloudflare browser verification';
                }
            } else if (server.includes('ddos-guard') || server.includes('sucuri')) {
                score += 30;
                detection.details.ddos_protection = true;
                detection.reason = detection.reason || 'DDoS protection service';
            }
        }

        // CAPTCHA detection (very high weight)
        const captchaIndicators = [
            { pattern: '验证码', weight: 20 },
            { pattern: 'verification', weight: 15 },
            { pattern: 'captcha', weight: 20 },
            { pattern: '人机验证', weight: 20 },
            { pattern: 'recaptcha', weight: 18 },
            { pattern: 'hcaptcha', weight: 18 },
            { pattern: 'geetest', weight: 18 },
            { pattern: '滑动验证', weight: 15 },
            { pattern: '点击验证', weight: 15 }
        ];

        for (const indicator of captchaIndicators) {
            if (lowerHtml.includes(indicator.pattern.toLowerCase())) {
                score += indicator.weight;
                detection.details.captcha_type = indicator.pattern;
                detection.reason = detection.reason || `CAPTCHA detected: ${indicator.pattern}`;
            }
        }

        // Blocking/rate limiting detection (high weight)
        const blockingIndicators = [
            { pattern: 'access denied', weight: 15 },
            { pattern: 'blocked', weight: 20 },
            { pattern: 'forbidden', weight: 15 },
            { pattern: '403', weight: 18 },
            { pattern: 'rate limit', weight: 20 },
            { pattern: 'too many requests', weight: 18 },
            { pattern: '访问过于频繁', weight: 20 },
            { pattern: '您已被禁止访问', weight: 25 }
        ];

        for (const indicator of blockingIndicators) {
            if (lowerHtml.includes(indicator.pattern.toLowerCase())) {
                score += indicator.weight;
                detection.details.blocking_reason = indicator.pattern;
                detection.reason = detection.reason || `Blocking detected: ${indicator.pattern}`;
            }
        }

        // JavaScript challenge detection (medium-high weight)
        const jsChallengeIndicators = [
            { pattern: 'checking your browser', weight: 15 },
            { pattern: 'just a moment', weight: 12 },
            { pattern: 'please enable javascript', weight: 10 },
            { pattern: 'jschl-answer', weight: 18 },
            { pattern: 'cf-challenge-running', weight: 20 }
        ];

        for (const indicator of jsChallengeIndicators) {
            if (lowerHtml.includes(indicator.pattern.toLowerCase())) {
                score += indicator.weight;
                detection.details.js_challenge = indicator.pattern;
                detection.reason = detection.reason || `JS challenge detected: ${indicator.pattern}`;
            }
        }

        // Content quality detection (medium weight)
        if (!html || html.length < 100) {
            score += 10;
            detection.details.content_quality = 'poor';
            detection.reason = detection.reason || 'Empty or minimal response';
        }

        // Suspicious content patterns (medium weight)
        const suspiciousPatterns = [
            { pattern: 'bot detected', weight: 15 },
            { pattern: 'automated access', weight: 12 },
            { pattern: 'unusual activity', weight: 10 },
            { pattern: 'security check', weight: 8 },
            { pattern: 'browser check', weight: 8 }
        ];

        for (const pattern of suspiciousPatterns) {
            if (lowerHtml.includes(pattern.pattern.toLowerCase())) {
                score += pattern.weight;
                detection.details.suspicious_content = pattern.pattern;
                detection.reason = detection.reason || `Suspicious content: ${pattern.pattern}`;
            }
        }

        // Calculate confidence based on score
        if (score >= 50) {
            detection.detected = true;
            detection.confidence = Math.min(95, score);
            detection.severity = score >= 70 ? 'critical' : score >= 30 ? 'high' : 'medium';
        } else if (score >= 20) {
            detection.detected = true;
            detection.confidence = Math.min(70, score * 1.5);
            detection.severity = 'medium';
            detection.reason = detection.reason || 'Potential anti-bot protection';
        }

        return detection;
    }

    // Enhanced HTTP request with multiple bypass techniques
    async makeRequest(url, options = {}) {
        const maxAttempts = this.maxRetries;
        let lastError = null;
        let currentAttempt = 0;

        // Track domain visit frequency
        const domain = new URL(url).hostname;
        const domainVisits = this.domainVisitHistory.get(domain) || 0;
        this.domainVisitHistory.set(domain, domainVisits + 1);

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            currentAttempt = attempt;
            try {
                // Adaptive strategy based on previous failures
                const strategy = this.determineStrategy(attempt, domainVisits);
                
                logger.debug(`Attempt ${attempt}/${maxAttempts} using ${strategy} strategy`, { 
                    url, 
                    domainVisits,
                    strategy 
                });

                let response;
                switch (strategy) {
                    case 'stealth':
                        response = await this.makeStealthRequest(url, options);
                        break;
                    case 'mobile':
                        response = await this.makeMobileRequest(url, options);
                        break;
                    case 'alternative':
                        response = await this.tryAlternativeEndpoints(url, options);
                        break;
                    default:
                        response = await this.makeBasicRequest(url, options);
                }

                // Advanced anti-bot detection
                const antiBotCheck = this.detectAntiBotProtection(response.body, response);
                
                if (antiBotCheck.detected) {
                    logger.warn('Anti-bot protection detected', {
                        ...antiBotCheck,
                        attempt,
                        url
                    });
                    
                    this.failedRequests++;
                    this.consecutiveFailures++;
                    this.failurePatterns.push({
                        attempt,
                        reason: antiBotCheck.reason,
                        severity: antiBotCheck.severity,
                        timestamp: Date.now()
                    });
                    
                    if (attempt < maxAttempts) {
                        // Adaptive delay based on detection severity and confidence
                        const baseDelay = antiBotCheck.severity === 'critical' ? 8000 : 
                                        antiBotCheck.severity === 'high' ? 4000 : 2000;
                        const confidenceMultiplier = antiBotCheck.confidence / 50;
                        const backoffDelay = Math.pow(2, attempt) * baseDelay * confidenceMultiplier + 
                                           Math.random() * 3000;
                        
                        logger.info(`Anti-bot detected, waiting ${Math.round(backoffDelay/1000)}s before retry (attempt ${attempt}/${maxAttempts})`);
                        await this.sleep(backoffDelay);
                        continue;
                    } else {
                        throw new Error(`Anti-bot protection persists after ${maxAttempts} attempts: ${antiBotCheck.reason} (confidence: ${antiBotCheck.confidence}%)`);
                    }
                }

                // Success case
                this.successfulRequests++;
                this.consecutiveFailures = 0;
                this.lastSuccessfulRequest = Date.now();
                this.lastRequestTime = Date.now();
                this.requestCount++;

                // Record successful timing
                this.requestTimingHistory.push({
                    timestamp: Date.now(),
                    duration: Date.now() - this.lastRequestTime,
                    domain,
                    success: true
                });

                logger.debug('Request successful', {
                    url,
                    status: response.statusCode || response.status,
                    contentLength: response.body.length,
                    strategy,
                    confidence: antiBotCheck.confidence,
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
                    attempt,
                    consecutiveFailures: this.consecutiveFailures
                });

                // Record failed timing
                this.requestTimingHistory.push({
                    timestamp: Date.now(),
                    duration: 0,
                    domain,
                    success: false,
                    error: error.message
                });

                if (attempt < maxAttempts) {
                    // Intelligent backoff based on failure patterns
                    const patternBasedDelay = this.calculatePatternDelay(currentAttempt);
                    const backoffDelay = Math.pow(2, attempt) * 1500 + patternBasedDelay + Math.random() * 2000;
                    logger.info(`Waiting ${Math.round(backoffDelay/1000)}s before retry`);
                    await this.sleep(backoffDelay);
                }
            }
        }

        throw new Error(`All ${maxAttempts} attempts failed. Last error: ${lastError?.message}`);
    }

    // Determine optimal strategy based on attempt number and domain history
    determineStrategy(attempt, domainVisits) {
        // First attempts: try stealth approach
        if (attempt <= 2) return 'stealth';
        
        // Middle attempts: try mobile approach
        if (attempt <= 4) return 'mobile';
        
        // Later attempts: try alternative endpoints
        if (attempt <= 6 && domainVisits > 2) return 'alternative';
        
        // Final attempts: basic approach with maximum stealth
        return 'stealth';
    }

    // Calculate delay based on failure patterns
    calculatePatternDelay(attempt) {
        if (this.failurePatterns.length < 2) return 0;
        
        // Look for recent similar failures
        const recentFailures = this.failurePatterns.slice(-3);
        const similarFailures = recentFailures.filter(f => f.attempt === attempt);
        
        // Increase delay if we're repeating the same mistake
        return similarFailures.length > 1 ? 3000 : 0;
    }

    // Stealth request with maximum realism
    async makeStealthRequest(url, options = {}) {
        const proxy = this.proxyList.length > 0 ? 
            this.proxyList[this.currentProxyIndex++ % this.proxyList.length] : null;

        const isMobile = Math.random() > 0.8; // 20% chance of mobile
        const userAgent = this.getRandomUserAgent(isMobile);
        const headers = { ...(isMobile ? this.mobileHeaders : this.browserHeaders) };
        
        headers['User-Agent'] = userAgent;
        headers['Referer'] = this.getReferer(url);
        
        // Add realistic timing headers
        headers['Sec-Fetch-User'] = Math.random() > 0.5 ? '?1' : undefined;
        headers['Viewport-Width'] = isMobile ? '375' : (Math.random() > 0.5 ? '1920' : '1366');

        const requestOptions = {
            hostname: new URL(url).hostname,
            port: 443,
            path: new URL(url).pathname + new URL(url).search,
            method: 'GET',
            headers: headers,
            timeout: 20000,
            agent: new https.Agent({ 
                rejectUnauthorized: false,
                keepAlive: true,
                maxSockets: 1,
                keepAliveMsecs: 30000
            })
        };

        if (proxy) {
            requestOptions.agent = new https.Agent({
                host: proxy.host,
                port: proxy.port,
                auth: proxy.auth ? `${proxy.auth.username}:${proxy.auth.password}` : undefined,
                rejectUnauthorized: false
            });
        }

        return new Promise((resolve, reject) => {
            const req = https.request(requestOptions, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    // Store cookies for session persistence
                    const setCookie = res.headers['set-cookie'];
                    if (setCookie) {
                        const sessionId = `session_${Date.now()}`;
                        this.sessionCookies.set(sessionId, setCookie);
                    }
                    
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

    // Mobile-optimized request
    async makeMobileRequest(url, options = {}) {
        // Convert to mobile URL if possible
        let mobileUrl = url;
        if (url.includes('sh.lianjia.com')) {
            mobileUrl = url.replace('sh.lianjia.com', 'm.lianjia.com');
        }

        const userAgent = this.getRandomUserAgent(true);
        const headers = { ...this.mobileHeaders };
        headers['User-Agent'] = userAgent;
        headers['Referer'] = this.getReferer(mobileUrl);

        const requestOptions = {
            hostname: new URL(mobileUrl).hostname,
            port: 443,
            path: new URL(mobileUrl).pathname + new URL(mobileUrl).search,
            method: 'GET',
            headers: headers,
            timeout: 15000,
            agent: new https.Agent({ rejectUnauthorized: false })
        };

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
                reject(new Error('Mobile request timeout'));
            });

            req.end();
        });
    }

    // Try alternative endpoints
    async tryAlternativeEndpoints(originalUrl, options = {}) {
        const districtMatch = originalUrl.match(/ershoufang\/([^\/]+)/);
        const district = districtMatch ? districtMatch[1] : '';
        
        for (const endpoint of this.alternativeEndpoints) {
            try {
                const url = `${endpoint.domain}${endpoint.path}${district ? district + '/' : ''}`;
                logger.info(`Trying alternative endpoint: ${url}`);
                
                const response = await this.makeStealthRequest(url, options);
                
                // Quick validation that we got meaningful content
                if (response.body && response.body.length > 500) {
                    const antiBotCheck = this.detectAntiBotProtection(response.body, response);
                    if (!antiBotCheck.detected) {
                        logger.info(`Alternative endpoint successful: ${url}`);
                        return response;
                    }
                }
            } catch (error) {
                logger.debug(`Alternative endpoint failed: ${endpoint.domain}`, { error: error.message });
                continue;
            }
        }

        throw new Error('All alternative endpoints failed');
    }

    // Basic request as fallback
    async makeBasicRequest(url, options = {}) {
        return this.makeStealthRequest(url, options);
    }

    // Generate realistic referer
    getReferer(url) {
        const domain = new URL(url).hostname;
        const referers = [
            `https://${domain}/`,
            `https://${domain}/ershoufang/`,
            `https://${domain}/xiaoqu/`,
            `https://${domain}/chengjiao/`
        ];
        return referers[Math.floor(Math.random() * referers.length)];
    }

    // Get comprehensive system statistics
    getStats() {
        // Calculate average success rate over time windows
        const recentRequests = this.requestTimingHistory.slice(-20);
        const successfulRecent = recentRequests.filter(r => r.success).length;
        const recentSuccessRate = recentRequests.length > 0 ? 
            (successfulRecent / recentRequests.length) : 0;

        return {
            requestCount: this.requestCount,
            successfulRequests: this.successfulRequests,
            failedRequests: this.failedRequests,
            successRate: this.successfulRequests / Math.max(this.requestCount, 1),
            recentSuccessRate: recentSuccessRate,
            consecutiveFailures: this.consecutiveFailures,
            sessionAge: (Date.now() - this.sessionStartTime) / 1000 / 60, // minutes
            activeSessions: this.sessionCookies.size,
            proxiesAvailable: this.proxyList.length,
            userAgentPoolSize: this.userAgents.length,
            strategy: this.strategy,
            domainVisitStats: Object.fromEntries(this.domainVisitHistory),
            failurePatternCount: this.failurePatterns.length
        };
    }

    // Reset session for fresh start
    resetSession() {
        this.sessionCookies.clear();
        this.consecutiveFailures = 0;
        this.sessionStartTime = Date.now();
        this.domainVisitHistory.clear();
        this.failurePatterns = [];
        logger.info('Session reset for fresh start');
    }
}

module.exports = ImprovedAntiBotBypass;