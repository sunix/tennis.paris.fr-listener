#!/usr/bin/env node

/**
 * Script to fetch facilities data from tennis.paris.fr API
 * This script fetches facility names, court numbers, and covered status
 * Run: node scripts/fetch-facilities.js
 */

const https = require('https');

const API_URL = 'https://tennis.paris.fr/tennis/jsp/site/Portal.jsp?page=recherche&action=ajax_disponibilite_map';

// Get a future date for the query (30 days from now)
const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 30);
const day = futureDate.getDate();
const month = futureDate.getMonth() + 1;
const year = futureDate.getFullYear();

// Build the form data
const formData = `hourRange=9-22&when=${day}%2F${month}%2F${year}&selCoating%5B%5D=96&selCoating%5B%5D=2095&selCoating%5B%5D=94&selCoating%5B%5D=1324&selCoating%5B%5D=2016&selCoating%5B%5D=92&selInOut%5B%5D=V&selInOut%5B%5D=F`;

console.log('Fetching facilities data from tennis.paris.fr...');
console.log(`Query date: ${day}/${month}/${year}\n`);

const options = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': formData.length
    }
};

const req = https.request(API_URL, options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const jsonData = JSON.parse(data);
            
            // Process facilities data
            const facilities = {};
            
            jsonData.features.forEach(feature => {
                const facilityName = feature.properties.general._nomSrtm;
                
                if (!facilities[facilityName]) {
                    facilities[facilityName] = [];
                }
                
                // Collect all courts with their covered status
                if (feature.properties.courts) {
                    feature.properties.courts.forEach(court => {
                        const courtNum = court._formattedAirNum;
                        const covered = court._airCvt === 'V'; // V = covered (Voûté/Vaulted)
                        
                        // Check if court already exists
                        const exists = facilities[facilityName].find(c => c.number === courtNum);
                        if (!exists) {
                            facilities[facilityName].push({
                                number: courtNum,
                                covered: covered
                            });
                        }
                    });
                }
            });
            
            // Sort courts by number
            Object.keys(facilities).forEach(name => {
                facilities[name].sort((a, b) => a.number - b.number);
            });
            
            // Sort facility names alphabetically
            const sortedFacilities = {};
            Object.keys(facilities).sort().forEach(name => {
                sortedFacilities[name] = facilities[name];
            });
            
            // Output results
            console.log('='.repeat(60));
            console.log(`Found ${Object.keys(sortedFacilities).length} facilities\n`);
            
            // Display summary
            Object.keys(sortedFacilities).forEach(name => {
                const courts = sortedFacilities[name];
                const coveredCount = courts.filter(c => c.covered).length;
                console.log(`${name}: ${courts.length} courts (${coveredCount} covered)`);
            });
            
            console.log('\n' + '='.repeat(60));
            console.log('JavaScript object for FALLBACK_FACILITIES:\n');
            
            // Generate JavaScript code
            console.log('const FALLBACK_FACILITIES = {');
            Object.keys(sortedFacilities).forEach((name, index) => {
                const courts = sortedFacilities[name];
                const isLast = index === Object.keys(sortedFacilities).length - 1;
                console.log(`    "${name}": [`);
                courts.forEach((court, courtIndex) => {
                    const isLastCourt = courtIndex === courts.length - 1;
                    const covered = court.covered ? 'true' : 'false';
                    console.log(`        {number: ${court.number}, covered: ${covered}}${isLastCourt ? '' : ','}`);
                });
                console.log(`    ]${isLast ? '' : ','}`);
            });
            console.log('};');
            
            console.log('\n' + '='.repeat(60));
            console.log('\nCopy the JavaScript object above to update FALLBACK_FACILITIES in docs/app.js');
            
        } catch (error) {
            console.error('Error parsing JSON:', error.message);
            process.exit(1);
        }
    });
});

req.on('error', (error) => {
    console.error('Error fetching data:', error.message);
    process.exit(1);
});

req.write(formData);
req.end();
