#!/usr/bin/env node

/**
 * Example script demonstrating the detailed availability feature
 * 
 * This shows how to use the new per-court availability API
 */

const { getDetailedAvailability } = require('./lib/tennis-api');

async function example() {
    console.log('='.repeat(80));
    console.log('EXAMPLE: Fetching per-court availability');
    console.log('='.repeat(80));
    console.log('');
    
    // Get a date 7 days from now
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    
    const config = {
        // Search for specific facilities
        facilities: ['La Faluère', 'Philippe Auguste'],
        
        // Time range (evening slots)
        hourRangeStart: 18,
        hourRangeEnd: 21,
        
        // Date to check
        whenDay: futureDate.getDate(),
        whenMonth: futureDate.getMonth() + 1,
        whenYear: futureDate.getFullYear(),
        
        // Optional: Filter for specific courts at La Faluère
        courtNumbers: {
            'La Faluère': [5, 6, 7, 8]
        },
        
        // Optional: Only show covered courts
        // coveredOnly: true
    };
    
    console.log('Configuration:');
    console.log(`  Facilities: ${config.facilities.join(', ')}`);
    console.log(`  Time range: ${config.hourRangeStart}:00 - ${config.hourRangeEnd}:00`);
    console.log(`  Date: ${config.whenDay}/${config.whenMonth}/${config.whenYear}`);
    if (config.courtNumbers) {
        console.log(`  Court filters: ${JSON.stringify(config.courtNumbers)}`);
    }
    console.log('');
    
    try {
        const results = await getDetailedAvailability(config, {
            logger: () => {} // Silent mode for cleaner output
        });
        
        if (results.length === 0) {
            console.log('❌ No availability found matching your criteria.');
            return;
        }
        
        console.log('✅ Found availability!');
        console.log('');
        
        // Display results in a readable format
        results.forEach(facility => {
            console.log('─'.repeat(80));
            console.log(`📍 ${facility.facility}`);
            console.log(`📅 ${facility.date}`);
            console.log(`🎾 Courts: ${facility.courts.join(', ')}`);
            console.log('');
            
            facility.timeslots.forEach(slot => {
                console.log(`  🕐 ${slot.time}`);
                
                Object.entries(slot.courts).forEach(([court, info]) => {
                    const icon = info.available ? '  ✓' : '  ✗';
                    const status = info.available ? 'Available' : info.status;
                    console.log(`    ${icon} ${court}: ${status}`);
                });
                console.log('');
            });
        });
        
        console.log('─'.repeat(80));
        
        // Summary
        const totalSlots = results.reduce((sum, f) => 
            sum + f.timeslots.reduce((s, t) => 
                s + Object.values(t.courts).filter(c => c.available).length, 0), 0);
        
        console.log('');
        console.log(`📊 Summary: ${results.length} facilities with ${totalSlots} available slots`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Run the example
example();
