#!/usr/bin/env node

/**
 * Tennis Paris Listener - Main script
 * Checks tennis court availability and outputs results as JSON
 */

const fs = require('fs');
const { getAvailability, getDetailedAvailability } = require('./lib/tennis-api');

// Load environment variables from .env file if it exists
function loadEnv() {
    const envPath = '.env';
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        envContent.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, ...valueParts] = trimmed.split('=');
                if (key && valueParts.length > 0) {
                    const value = valueParts.join('=').trim();
                    // Remove quotes if present
                    const unquoted = value.replace(/^["']|["']$/g, '');
                    process.env[key.trim()] = unquoted;
                }
            }
        });
    }
}

// Parse configuration from environment
function getConfig() {
    loadEnv();
    
    const config = {
        hourRangeStart: parseInt(process.env.HOUR_RANGE_START || '9', 10),
        hourRangeEnd: parseInt(process.env.HOUR_RANGE_END || '22', 10),
        whenDay: parseInt(process.env.WHEN_DAY || '23', 10),
        whenMonth: parseInt(process.env.WHEN_MONTH || '05', 10),
        whenYear: parseInt(process.env.WHEN_YEAR || '2021', 10),
        facilities: (process.env.COURTS || 'Philippe Auguste,Candie,Thiéré,La Faluère').split(',').map(s => s.trim()),
        courtNumbers: null,
        coveredOnly: process.env.COVERED_ONLY === 'true',
        detailedMode: process.env.DETAILED_AVAILABILITY === 'true'
    };
    
    // Parse court numbers if provided
    if (process.env.COURT_NUMBERS && process.env.COURT_NUMBERS.trim() !== '' && process.env.COURT_NUMBERS !== '{}') {
        try {
            config.courtNumbers = JSON.parse(process.env.COURT_NUMBERS);
        } catch (e) {
            console.error(`Warning: Failed to parse COURT_NUMBERS: ${e.message}`, process.stderr);
        }
    }
    
    return config;
}

// Check if the configured date is in the past
function isDateInPast(whenDay, whenMonth, whenYear) {
    const targetDate = new Date(whenYear, whenMonth - 1, whenDay);
    targetDate.setHours(0, 0, 0, 0);
    
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    return targetDate < currentDate;
}

// Main function
async function main() {
    try {
        const config = getConfig();
        
        // Log configuration for debugging
        if (config.courtNumbers) {
            console.error(`Court Numbers Filter: ${JSON.stringify(config.courtNumbers)}`);
        }
        if (config.coveredOnly) {
            console.error('Covered Courts Only: Yes');
        }
        if (config.detailedMode) {
            console.error('Detailed Availability Mode: Enabled');
        }
        
        // Check if date is in the past
        if (isDateInPast(config.whenDay, config.whenMonth, config.whenYear)) {
            console.log('[]');
            console.error(`Date ${config.whenDay}/${config.whenMonth}/${config.whenYear} is in the past. Skipping availability check.`);
            process.exit(0);
        }
        
        // Fetch and filter availability
        let results;
        if (config.detailedMode) {
            results = await getDetailedAvailability(config, {
                logger: (...args) => console.error(...args)
            });
        } else {
            results = await getAvailability(config, {
                logger: (...args) => console.error(...args)
            });
        }
        
        // Read previous state
        const stateFile = '/tmp/tennis.json';
        let previousJson = null;
        if (fs.existsSync(stateFile)) {
            try {
                previousJson = fs.readFileSync(stateFile, 'utf-8');
            } catch (e) {
                // Ignore errors reading previous state
            }
        }
        
        // Convert results to JSON
        const json = JSON.stringify(results, null, 2);
        
        // Check if results have changed
        if (json !== previousJson) {
            fs.writeFileSync(stateFile, json, 'utf-8');
            console.error('####################################################');
            console.error('########### New value:');
            console.error(json);
        }
        
        // Always output the JSON to stdout for the GitHub Action workflow
        console.log(json);
        
    } catch (error) {
        console.error(`Error: ${error.message}`);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run main function
main();
