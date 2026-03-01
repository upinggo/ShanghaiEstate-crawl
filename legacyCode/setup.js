#!/usr/bin/env node

/**
 * Setup Script for Shanghai Real Estate Analyzer
 * 
 * This script helps initialize the project environment and
 * creates necessary directories and configuration files.
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

async function setupProject() {
    console.log('🏢 Setting up Shanghai Real Estate Analyzer...');
    console.log('===============================================\n');

    try {
        // Create necessary directories
        const dirs = ['./data', './logs', './examples'];
        
        for (const dir of dirs) {
            try {
                await fs.mkdir(dir, { recursive: true });
                console.log(`✅ Created directory: ${dir}`);
            } catch (error) {
                console.log(`ℹ️  Directory already exists: ${dir}`);
            }
        }

        // Check if dependencies are installed
        console.log('\n📦 Checking dependencies...');
        try {
            require('cheerio');
            require('winston');
            console.log('✅ Core dependencies found');
        } catch (error) {
            console.log('⚠️  Installing dependencies...');
            execSync('npm install', { stdio: 'inherit' });
            console.log('✅ Dependencies installed');
        }

        // Create sample configuration
        const sampleConfig = {
            crawling: {
                districts: ['xuhui', 'pudong'],
                maxPages: 3,
                requestDelay: 2000
            },
            storage: {
                dataDir: './data',
                retentionDays: 90
            }
        };

        try {
            await fs.writeFile(
                './config.sample.json',
                JSON.stringify(sampleConfig, null, 2)
            );
            console.log('✅ Created sample configuration: config.sample.json');
        } catch (error) {
            console.log('ℹ️  Sample configuration already exists');
        }

        // Create gitignore if it doesn't exist
        const gitignoreContent = `
# Dependencies
node_modules/

# Data files
data/
logs/

# Configuration
config.local.json

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
*.log
        `.trim();

        try {
            await fs.writeFile('./.gitignore', gitignoreContent);
            console.log('✅ Created .gitignore file');
        } catch (error) {
            console.log('ℹ️  .gitignore already exists');
        }

        console.log('\n🎉 Setup completed successfully!');
        console.log('\n🚀 Next steps:');
        console.log('   1. Run "npm start" for a complete analysis');
        console.log('   2. Run "npm run crawl" to collect data');
        console.log('   3. Run "npm run analyze" to analyze existing data');
        console.log('   4. Check the README.md for detailed usage instructions');

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    }
}

// Run setup if called directly
if (require.main === module) {
    setupProject();
}

module.exports = { setupProject };