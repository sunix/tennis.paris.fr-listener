#!/usr/bin/env node

/**
 * Unit tests for main.js (Node.js version)
 */

const { filterByFacilities, filterByCourtNumbers, filterByCovered, parsePlanningHTML } = require('./lib/tennis-api');

// Test utilities
let testsPassed = 0;
let testsFailed = 0;

function assertEquals(expected, actual, testName) {
    if (JSON.stringify(expected) === JSON.stringify(actual)) {
        console.log(`✓ PASS: ${testName}`);
        testsPassed++;
    } else {
        console.log(`✗ FAIL: ${testName}`);
        console.log(`  Expected: ${JSON.stringify(expected)}`);
        console.log(`  Actual: ${JSON.stringify(actual)}`);
        testsFailed++;
    }
}

function assertContains(haystack, needle, testName) {
    const haystackStr = JSON.stringify(haystack);
    if (haystackStr.includes(needle)) {
        console.log(`✓ PASS: ${testName}`);
        testsPassed++;
    } else {
        console.log(`✗ FAIL: ${testName}`);
        console.log(`  Expected '${haystackStr}' to contain '${needle}'`);
        testsFailed++;
    }
}

// Silent logger for tests
const silentLogger = () => {};

console.log('=========================================');
console.log('Running unit tests for main.js (Node.js)');
console.log('=========================================\n');

// Test 1: Filter by facilities
console.log('Test 1: Filter by facilities');
const mockApiResponse = {
    features: [
        {
            properties: {
                available: true,
                general: { _nomSrtm: 'La Faluère', _id: 126 },
                courts: [
                    { _formattedAirNum: 5, _airNom: 'Court 05', _airCvt: 'F' },
                    { _formattedAirNum: 6, _airNom: 'Court 06', _airCvt: 'F' }
                ]
            }
        },
        {
            properties: {
                available: true,
                general: { _nomSrtm: 'Other Court', _id: 999 },
                courts: [
                    { _formattedAirNum: 1, _airNom: 'Court 01', _airCvt: 'F' }
                ]
            }
        },
        {
            properties: {
                available: false,
                general: { _nomSrtm: 'Unavailable Court', _id: 888 },
                courts: []
            }
        }
    ]
};

const filtered1 = filterByFacilities(mockApiResponse, ['La Faluère'], { logger: silentLogger });
assertEquals(1, filtered1.length, 'Should return 1 facility');
assertEquals('La Faluère', filtered1[0].facility, 'Should return La Faluère');
assertEquals(2, filtered1[0].courts.length, 'Should return 2 courts');

console.log('');

// Test 2: Filter by court numbers
console.log('Test 2: Filter by court numbers');
const facilities = [
    {
        facility: 'La Faluère',
        facilityId: 126,
        courts: [
            { courtNumber: 5, courtName: 'Court 05', covered: 'F' },
            { courtNumber: 6, courtName: 'Court 06', covered: 'F' },
            { courtNumber: 7, courtName: 'Court 07', covered: 'F' },
            { courtNumber: 8, courtName: 'Court 08', covered: 'F' }
        ]
    }
];

const courtNumbers = { 'La Faluère': [5, 6] };
const filtered2 = filterByCourtNumbers(facilities, courtNumbers, { logger: silentLogger });
assertEquals(1, filtered2.length, 'Should return 1 facility');
assertEquals(2, filtered2[0].courts.length, 'Should return 2 courts after number filter');
assertEquals(5, filtered2[0].courts[0].courtNumber, 'First court should be 5');
assertEquals(6, filtered2[0].courts[1].courtNumber, 'Second court should be 6');

console.log('');

// Test 3: Filter by covered courts
console.log('Test 3: Filter by covered courts');
const facilitiesWithCovered = [
    {
        facility: 'Test Facility',
        facilityId: 1,
        courts: [
            { courtNumber: 1, courtName: 'Court 01', covered: 'V' },
            { courtNumber: 2, courtName: 'Court 02', covered: 'F' },
            { courtNumber: 3, courtName: 'Court 03', covered: 'V' }
        ]
    }
];

const filtered3 = filterByCovered(facilitiesWithCovered, { logger: silentLogger });
assertEquals(1, filtered3.length, 'Should return 1 facility');
assertEquals(2, filtered3[0].courts.length, 'Should return 2 covered courts');
assertEquals('V', filtered3[0].courts[0].covered, 'First court should be covered');
assertEquals('V', filtered3[0].courts[1].covered, 'Second court should be covered');

console.log('');

// Test 4: Empty court numbers filter
console.log('Test 4: Empty court numbers filter');
const filtered4 = filterByCourtNumbers(facilities, {}, { logger: silentLogger });
assertEquals(facilities.length, filtered4.length, 'Should return all facilities with empty filter');
assertEquals(facilities[0].courts.length, filtered4[0].courts.length, 'Should return all courts with empty filter');

console.log('');

// Test 5: Filter removes empty facilities
console.log('Test 5: Filter removes empty facilities');
const filtered5 = filterByCourtNumbers(facilities, { 'La Faluère': [999] }, { logger: silentLogger });
assertEquals(0, filtered5.length, 'Should remove facility with no matching courts');

console.log('');

// Test 6: Parse planning HTML with available slots
console.log('Test 6: Parse planning HTML with available slots');
const mockPlanningHTML = `
<table class="reservation">
    <thead>
        <tr>
            <th></th>
            <th class="sorttable_nosort">
                <span class="title">Court 01</span>
            </th>
            <th class="sorttable_nosort">
                <span class="title">Court 02</span>
            </th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>09h - 10h</td>
            <td>
                <span>LIBRE</span>
            </td>
            <td>
                <span>LIBRE</span>
            </td>
        </tr>
        <tr>
            <td>10h - 11h</td>
            <td class="reservation-cell">
                <p class="title-cell">PUBLIC</p>
                <br/>
                <span>Réservé le 13.02.2026 09:01</span>
            </td>
            <td>
                <span>LIBRE</span>
            </td>
        </tr>
    </tbody>
</table>
`;

const parsed = parsePlanningHTML(mockPlanningHTML);
assertEquals(2, parsed.courts.length, 'Should parse 2 courts');
assertEquals('Court 01', parsed.courts[0], 'First court should be Court 01');
assertEquals('Court 02', parsed.courts[1], 'Second court should be Court 02');
assertEquals(2, parsed.timeslots.length, 'Should parse 2 timeslots');
assertEquals('09h - 10h', parsed.timeslots[0].time, 'First timeslot should be 09h - 10h');
assertEquals(true, parsed.timeslots[0].courts['Court 01'].available, 'Court 01 at 09h should be available');
assertEquals('LIBRE', parsed.timeslots[0].courts['Court 01'].status, 'Court 01 at 09h should have LIBRE status');
assertEquals(false, parsed.timeslots[1].courts['Court 01'].available, 'Court 01 at 10h should not be available');
assertContains(parsed.timeslots[1].courts['Court 01'].status, 'Réservé', 'Court 01 at 10h should show Réservé');
assertEquals(true, parsed.timeslots[1].courts['Court 02'].available, 'Court 02 at 10h should be available');

console.log('');

// Print summary
console.log('=========================================');
console.log('Test Summary');
console.log('=========================================');
console.log(`Tests run:    ${testsPassed + testsFailed}`);
console.log(`Tests passed: ${testsPassed}`);
console.log(`Tests failed: ${testsFailed}`);
console.log('=========================================');

process.exit(testsFailed > 0 ? 1 : 0);
