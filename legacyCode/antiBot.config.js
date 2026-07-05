module.exports = {
    // Anti-Bot Protection Settings
    antiBot: {
        // Enable/disable anti-bot bypass
        enabled: true,
        
        // Proxy configuration
        proxies: [
            // Add your proxy servers here
            // {
            //     protocol: 'http',
            //     host: 'proxy.example.com',
            //     port: 8080,
            //     auth: {
            //         username: 'user',
            //         password: 'pass'
            //     }
            // }
        ],
        
        // User Agent Rotation
        userAgentRotation: {
            enabled: true,
            poolSize: 10,
            rotationInterval: 5 // Rotate every 5 requests
        },
        
        // Request Timing
        timing: {
            minDelay: 2000,      // Minimum delay between requests (ms)
            maxDelay: 5000,      // Maximum delay between requests (ms)
            pageDelay: 3000,     // Delay between pages (ms)
            districtDelay: 5000, // Delay between districts (ms)
            randomize: true      // Add randomness to delays
        },
        
        // Retry Configuration
        retry: {
            maxAttempts: 5,
            exponentialBackoff: true,
            baseDelay: 1000,
            maxDelay: 10000
        },
        
        // Session Management
        session: {
            rotateSessions: true,
            sessionLifetime: 300000, // 5 minutes
            maxRequestsPerSession: 20
        },
        
        // Detection Sensitivity
        detection: {
            strictMode: false,    // Enable for more aggressive detection
            customIndicators: [   // Add custom anti-bot indicators
                'security check',
                'rate limit',
                'blocked ip',
                'access forbidden'
            ]
        }
    },
    
    // Advanced Browser Simulation
    browserSimulation: {
        // Realistic browser headers
        headers: {
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
        },
        
        // Browser fingerprinting prevention
        fingerprinting: {
            canvas: true,
            webgl: true,
            audio: true,
            fonts: true
        }
    },
    
    // IP Management
    ipManagement: {
        // Rotate IP addresses
        ipRotation: {
            enabled: false,
            rotationInterval: 100, // Rotate every 100 requests
            proxyRequired: true
        },
        
        // Rate limiting
        rateLimiting: {
            requestsPerMinute: 10,
            burstLimit: 5,
            coolDownPeriod: 30000 // 30 seconds
        }
    },
    
    // Monitoring and Logging
    monitoring: {
        logLevel: 'debug',
        metrics: {
            trackSuccessRate: true,
            trackResponseTimes: true,
            trackAntiBotHits: true
        },
        alerts: {
            enableAlerts: true,
            failureThreshold: 0.3, // 30% failure rate
            alertMethods: ['console', 'file'] // 'email', 'slack', etc.
        }
    },
    
    // Fallback Strategies
    fallback: {
        // Switch to simulation mode when blocked
        simulationFallback: {
            enabled: true,
            triggerAfterFailures: 3
        },
        
        // Reduced crawling intensity
        reducedIntensity: {
            enabled: true,
            reduceByFactor: 2, // Half the normal speed
            triggerAfterBlocks: 2
        }
    }
};