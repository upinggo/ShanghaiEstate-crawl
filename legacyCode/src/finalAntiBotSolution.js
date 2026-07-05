const axios = require('axios');
const https = require('https');
const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger');

class FinalAntiBotSolution {
    constructor(options = {}) {
        this.baseURL = 'https://sh.lianjia.com';
        this.proxyList = options.proxies || [];
        this.maxRetries = options.maxRetries || 8;
        this.delayRange = options.delayRange || { min: 3000, max: 8000 };
        this.strategy = options.strategy || 'multi-layer';
        
        // Comprehensive user agent pool
        this.userAgents = [
            // Desktop browsers - latest versions
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:123.0) Gecko/20100101 Firefox/123.0',
            
            // Mobile browsers
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
            'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
            
            // Slightly older but still common versions
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15'
        ];

        // Realistic browser headers
        this.headers = {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-US;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0',
            'DNT': '1'
        };

        // Tracking and statistics
        this.stats = {
            requests: 0,
            successes: 0,
            failures: 0,
            consecutiveFailures: 0,
            lastSuccess: Date.now(),
            sessionStart: Date.now()
        };
        
        this.sessionData = {
            cookies: new Map(),
            referers: new Set(),
            domains: new Map()
        };
        
        // Alternative approaches
        this.approaches = [
            { name: 'direct', weight: 30 },
            { name: 'mobile', weight: 25 },
            { name: 'proxy', weight: 20 },
            { name: 'alternative-domain', weight: 15 },
            { name: 'stealth', weight: 10 }
        ];
    }

    getRandomUserAgent() {
        return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
    }

    getRandomDelay() {
        const { min, max } = this.delayRange;
        return Math.random() * (max - min) + min;
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Advanced content validation
    validateContent(html, url) {
        const validation = {
            isValid: false,
            issues: [],
            confidence: 0,
            contentIndicators: {}
        };

        if (!html || html.length < 100) {
            validation.issues.push('Content too short');
            return validation;
        }

        const lowerHtml = html.toLowerCase();
        
        // Check for anti-bot indicators first
        const antiBotIndicators = [
            '验证码', 'verification', 'captcha', 'blocked', 'forbidden',
            'checking your browser', 'just a moment', 'rate limit',
            'access denied', 'security check', 'bot detected'
        ];

        for (const indicator of antiBotIndicators) {
            if (lowerHtml.includes(indicator.toLowerCase())) {
                validation.issues.push(`Anti-bot indicator found: ${indicator}`);
                validation.confidence = 90;
                return validation;
            }
        }

        // Check for legitimate content indicators
        const contentIndicators = [
            { pattern: 'selllistcontent', weight: 20 },
            { pattern: 'ershoufang', weight: 15 },
            { pattern: 'houseinfo', weight: 15 },
            { pattern: 'totalprice', weight: 10 },
            { pattern: 'unitprice', weight: 10 },
            { pattern: 'title', weight: 5 },
            { pattern: 'info', weight: 5 }
        ];

        let contentScore = 0;
        for (const indicator of contentIndicators) {
            if (lowerHtml.includes(indicator.pattern)) {
                contentScore += indicator.weight;
                validation.contentIndicators[indicator.pattern] = true;
            }
        }

        // Check for housing-specific data
        const housingPatterns = [
            { pattern: /\d+\.\d+万/, weight: 25 },
            { pattern: /[一二三四五六七八九十\d]+室[一二三四五六七八九十\d]+厅/, weight: 20 },
            { pattern: /\d+平米/, weight: 15 },
            { pattern: /[\d,]+元\/平/, weight: 15 }
        ];

        for (const pattern of housingPatterns) {
            if (pattern.pattern.test(html)) {
                contentScore += pattern.weight;
                validation.contentIndicators[pattern.pattern.source] = true;
            }
        }

        validation.confidence = Math.min(95, contentScore);
        validation.isValid = contentScore >= 30;
        
        if (!validation.isValid) {
            validation.issues.push(`Low content score: ${contentScore}`);
        }

        return validation;
    }

    // Multi-layer request approach
    async makeRequest(url, options = {}) {
        const maxAttempts = this.maxRetries;
        let lastError = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const approach = this.selectApproach(attempt);
                logger.debug(`Attempt ${attempt}/${maxAttempts} using ${approach} approach`, { url });
                
                let response;
                switch (approach) {
                    case 'direct':
                        response = await this.directRequest(url);
                        break;
                    case 'mobile':
                        response = await this.mobileRequest(url);
                        break;
                    case 'proxy':
                        response = await this.proxyRequest(url);
                        break;
                    case 'alternative-domain':
                        response = await this.alternativeDomainRequest(url);
                        break;
                    case 'stealth':
                        response = await this.stealthRequest(url);
                        break;
                }

                // Validate content
                const validation = this.validateContent(response.body, url);
                
                if (!validation.isValid) {
                    logger.warn('Content validation failed', {
                        issues: validation.issues,
                        confidence: validation.confidence,
                        attempt
                    });
                    
                    this.stats.failures++;
                    this.stats.consecutiveFailures++;
                    
                    if (attempt < maxAttempts) {
                        const delay = this.calculateBackoffDelay(attempt, validation);
                        logger.info(`Content validation failed, waiting ${Math.round(delay/1000)}s before retry`);
                        await this.sleep(delay);
                        continue;
                    } else {
                        throw new Error(`Content validation failed after ${maxAttempts} attempts: ${validation.issues.join(', ')}`);
                    }
                }

                // Success
                this.stats.successes++;
                this.stats.consecutiveFailures = 0;
                this.stats.lastSuccess = Date.now();
                
                logger.debug('Request successful', {
                    url,
                    contentScore: validation.confidence,
                    approach,
                    attempts: attempt
                });

                return {
                    ...response,
                    validation: validation
                };

            } catch (error) {
                lastError = error;
                this.stats.failures++;
                this.stats.consecutiveFailures++;
                
                logger.warn(`Request failed (attempt ${attempt}/${maxAttempts})`, {
                    url,
                    error: error.message,
                    attempt
                });

                if (attempt < maxAttempts) {
                    const delay = Math.pow(2, attempt) * 1000 + Math.random() * 3000;
                    logger.info(`Waiting ${Math.round(delay/1000)}s before retry`);
                    await this.sleep(delay);
                }
            }
        }

        throw new Error(`All ${maxAttempts} attempts failed. Last error: ${lastError?.message}`);
    }

    selectApproach(attempt) {
        // Progressive approach selection
        if (attempt <= 2) return 'direct';
        if (attempt <= 4) return 'mobile';
        if (attempt <= 6) return 'stealth';
        if (attempt <= 7 && this.proxyList.length > 0) return 'proxy';
        return 'alternative-domain';
    }

    calculateBackoffDelay(attempt, validation) {
        const baseDelay = validation.confidence > 50 ? 2000 : 4000;
        const multiplier = validation.issues.some(issue => issue.includes('Anti-bot')) ? 2 : 1;
        return Math.pow(2, attempt) * baseDelay * multiplier + Math.random() * 2000;
    }

    // Direct request approach
    async directRequest(url) {
        const headers = { ...this.headers };
        headers['User-Agent'] = this.getRandomUserAgent();
        headers['Referer'] = this.getSmartReferer(url);
        
        // Remove undefined headers
        Object.keys(headers).forEach(key => {
            if (headers[key] === undefined) {
                delete headers[key];
            }
        });

        const requestOptions = {
            hostname: new URL(url).hostname,
            port: 443,
            path: new URL(url).pathname + new URL(url).search,
            method: 'GET',
            headers: headers,
            timeout: 15000
        };

        return new Promise((resolve, reject) => {
            const req = https.request(requestOptions, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    // Store cookies
                    const cookies = res.headers['set-cookie'];
                    if (cookies) {
                        this.sessionData.cookies.set(url, cookies);
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

    // Mobile approach
    async mobileRequest(url) {
        let mobileUrl = url;
        if (url.includes('sh.lianjia.com')) {
            mobileUrl = url.replace('sh.lianjia.com', 'm.lianjia.com');
        }

        const mobileHeaders = {
            ...this.headers,
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
            'Sec-Ch-Ua-Mobile': '?1',
            'Referer': this.getSmartReferer(mobileUrl)
        };

        Object.keys(mobileHeaders).forEach(key => {
            if (mobileHeaders[key] === undefined) {
                delete mobileHeaders[key];
            }
        });

        const requestOptions = {
            hostname: new URL(mobileUrl).hostname,
            port: 443,
            path: new URL(mobileUrl).pathname + new URL(mobileUrl).search,
            method: 'GET',
            headers: mobileHeaders,
            timeout: 12000
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

    // Proxy approach
    async proxyRequest(url) {
        if (this.proxyList.length === 0) {
            throw new Error('No proxies configured');
        }

        const proxy = this.proxyList[Math.floor(Math.random() * this.proxyList.length)];
        const headers = { ...this.headers };
        headers['User-Agent'] = this.getRandomUserAgent();
        headers['Referer'] = this.getSmartReferer(url);

        Object.keys(headers).forEach(key => {
            if (headers[key] === undefined) {
                delete headers[key];
            }
        });

        const agent = new https.Agent({
            host: proxy.host,
            port: proxy.port,
            auth: proxy.auth ? `${proxy.auth.username}:${proxy.auth.password}` : undefined,
            rejectUnauthorized: false,
            timeout: 20000
        });

        const requestOptions = {
            hostname: new URL(url).hostname,
            port: 443,
            path: new URL(url).pathname + new URL(url).search,
            method: 'GET',
            headers: headers,
            agent: agent
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

            req.end();
        });
    }

    // Alternative domain approach
    async alternativeDomainRequest(originalUrl) {
        const alternatives = [
            'https://m.lianjia.com/sh/',
            'https://sh.ke.com/',
            'https://www.lianjia.com/city/shanghai/'
        ];

        const districtMatch = originalUrl.match(/ershoufang\/([^\/]+)/);
        const district = districtMatch ? districtMatch[1] : '';

        for (const baseUrl of alternatives) {
            try {
                const url = district ? `${baseUrl}ershoufang/${district}/` : baseUrl;
                logger.info(`Trying alternative domain: ${url}`);
                
                const response = await this.directRequest(url);
                const validation = this.validateContent(response.body, url);
                
                if (validation.isValid) {
                    logger.info(`Alternative domain successful: ${baseUrl}`);
                    return response;
                }
            } catch (error) {
                logger.debug(`Alternative domain failed: ${baseUrl}`, { error: error.message });
                continue;
            }
        }

        throw new Error('All alternative domains failed');
    }

    // Stealth approach with maximum realism
    async stealthRequest(url) {
        const headers = { ...this.headers };
        headers['User-Agent'] = this.getRandomUserAgent();
        headers['Referer'] = this.getSmartReferer(url);
        
        // Add realistic browser fingerprint headers
        headers['Viewport-Width'] = '1920';
        headers['Downlink'] = '10';
        headers['ECT'] = '4g';
        headers['RTT'] = '50';

        Object.keys(headers).forEach(key => {
            if (headers[key] === undefined) {
                delete headers[key];
            }
        });

        const requestOptions = {
            hostname: new URL(url).hostname,
            port: 443,
            path: new URL(url).pathname + new URL(url).search,
            method: 'GET',
            headers: headers,
            timeout: 20000,
            agent: new https.Agent({
                rejectUnauthorized: false,
                keepAlive: true
            })
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
                reject(new Error('Stealth request timeout'));
            });

            req.end();
        });
    }

    getSmartReferer(url) {
        const domain = new URL(url).hostname;
        const referers = [
            `https://${domain}/`,
            `https://${domain}/ershoufang/`,
            `https://${domain}/xiaoqu/`
        ];
        
        // Return a random referer, but prefer the same domain
        return referers[Math.floor(Math.random() * referers.length)];
    }

    getStats() {
        return {
            ...this.stats,
            successRate: this.stats.successes / Math.max(this.stats.requests, 1),
            sessionDuration: (Date.now() - this.stats.sessionStart) / 1000 / 60, // minutes
            proxiesAvailable: this.proxyList.length,
            userAgentPoolSize: this.userAgents.length,
            approachDistribution: this.approaches
        };
    }

    reset() {
        this.stats = {
            requests: 0,
            successes: 0,
            failures: 0,
            consecutiveFailures: 0,
            lastSuccess: Date.now(),
            sessionStart: Date.now()
        };
        this.sessionData.cookies.clear();
        this.sessionData.referers.clear();
        this.sessionData.domains.clear();
        logger.info('Anti-bot system reset');
    }
}

module.exports = FinalAntiBotSolution;