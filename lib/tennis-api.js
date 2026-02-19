/**
 * Tennis Paris API Client
 * Shared module for fetching and filtering tennis court availability
 */

// Import fetch for Node.js environment
let fetch;
if (typeof window === 'undefined') {
    // Node.js environment
    fetch = require('node-fetch');
}

// Constants for tennis.paris.fr API
const API_COATING_TYPES = ['96', '2095', '94', '1324', '2016', '92'];
const API_IN_OUT_TYPES = ['V', 'F'];
const API_URL = 'https://tennis.paris.fr/tennis/jsp/site/Portal.jsp?page=recherche&action=ajax_disponibilite_map';

/**
 * Fetch tennis court availability from tennis.paris.fr API
 * @param {Object} params - Search parameters
 * @param {number} params.hourRangeStart - Start hour (e.g., 9)
 * @param {number} params.hourRangeEnd - End hour (e.g., 22)
 * @param {number} params.whenDay - Day (e.g., 23)
 * @param {number} params.whenMonth - Month (e.g., 05)
 * @param {number} params.whenYear - Year (e.g., 2021)
 * @param {Object} options - Optional settings
 * @param {Function} options.logger - Logger function for debug output (default: console.error)
 * @returns {Promise<Object>} API response with features array
 */
async function fetchAvailability(params, options = {}) {
    const logger = options.logger || console.error;
    
    logger('=====================================================');
    logger('=== Tennis Court Availability Check ===');
    logger('=====================================================');
    logger(`Date: ${params.whenDay}/${params.whenMonth}/${params.whenYear}`);
    logger(`Time Range: ${params.hourRangeStart}:00 - ${params.hourRangeEnd}:00`);
    logger('=====================================================');
    logger('Fetching data from tennis.paris.fr API...');
    
    // Build form data
    const formData = new URLSearchParams();
    formData.append('hourRange', `${params.hourRangeStart}-${params.hourRangeEnd}`);
    formData.append('when', `${params.whenDay}/${params.whenMonth}/${params.whenYear}`);
    
    // Add coating and in/out types
    API_COATING_TYPES.forEach(type => formData.append('selCoating[]', type));
    API_IN_OUT_TYPES.forEach(type => formData.append('selInOut[]', type));
    
    // Make API request
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
    });
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const rawJson = await response.json();
    
    // Log API response summary
    const totalFacilities = rawJson.features?.length || 0;
    const availableFacilities = rawJson.features?.filter(f => f.properties?.available).length || 0;
    logger(`API Response: ${totalFacilities} facilities total, ${availableFacilities} with some availability`);
    logger('');
    logger('⚠️  IMPORTANT: The API returns facility-level availability only.');
    logger("   '.available=true' means the facility has SOME availability,");
    logger('   but NOT that all listed courts are available at the requested time.');
    logger('   Individual court availability must be checked on the website.');
    logger('=====================================================');
    
    return rawJson;
}

/**
 * Filter facilities by name and availability
 * @param {Object} rawJson - Raw API response
 * @param {string[]} facilityNames - Array of facility names to include
 * @param {Object} options - Optional settings
 * @param {Function} options.logger - Logger function for debug output
 * @returns {Array} Filtered facilities with their courts
 */
function filterByFacilities(rawJson, facilityNames, options = {}) {
    const logger = options.logger || console.error;
    
    logger('Applying facility and availability filters...');
    
    const filtered = rawJson.features
        .filter(feature => {
            const isAvailable = feature.properties?.available;
            const facilityName = feature.properties?.general?._nomSrtm;
            return isAvailable && facilityNames.includes(facilityName);
        })
        .map(feature => ({
            facility: feature.properties.general._nomSrtm,
            facilityId: feature.properties.general._id,
            courts: feature.properties.courts.map(court => ({
                courtNumber: court._formattedAirNum,
                courtName: court._airNom,
                covered: court._airCvt
            }))
        }));
    
    const totalCourts = filtered.reduce((sum, f) => sum + f.courts.length, 0);
    logger(`After facility filter: ${filtered.length} facilities matched with ${totalCourts} courts total`);
    
    return filtered;
}

/**
 * Filter courts by court numbers
 * @param {Array} facilities - Filtered facilities from filterByFacilities
 * @param {Object} courtNumbers - Object mapping facility names to allowed court numbers
 *                                Example: {"La Faluère": [5,6,7,8,17,18,19,20,21]}
 * @param {Object} options - Optional settings
 * @param {Function} options.logger - Logger function for debug output
 * @returns {Array} Facilities with courts filtered by numbers
 */
function filterByCourtNumbers(facilities, courtNumbers, options = {}) {
    const logger = options.logger || console.error;
    
    if (!courtNumbers || Object.keys(courtNumbers).length === 0) {
        return facilities;
    }
    
    logger('Applying court number filter...');
    
    const filtered = facilities
        .map(facility => {
            const allowedNumbers = courtNumbers[facility.facility] || [];
            
            if (allowedNumbers.length === 0) {
                return facility;
            }
            
            return {
                ...facility,
                courts: facility.courts.filter(court => 
                    allowedNumbers.includes(court.courtNumber)
                )
            };
        })
        .filter(facility => facility.courts.length > 0);
    
    const totalCourts = filtered.reduce((sum, f) => sum + f.courts.length, 0);
    logger(`After court number filter: ${filtered.length} facilities with ${totalCourts} courts`);
    
    return filtered;
}

/**
 * Filter for covered courts only
 * @param {Array} facilities - Filtered facilities
 * @param {Object} options - Optional settings
 * @param {Function} options.logger - Logger function for debug output
 * @returns {Array} Facilities with only covered courts
 */
function filterByCovered(facilities, options = {}) {
    const logger = options.logger || console.error;
    
    logger('Applying covered courts filter...');
    
    const filtered = facilities
        .map(facility => ({
            ...facility,
            courts: facility.courts.filter(court => court.covered === 'V')
        }))
        .filter(facility => facility.courts.length > 0);
    
    const totalCourts = filtered.reduce((sum, f) => sum + f.courts.length, 0);
    logger(`After covered filter: ${filtered.length} facilities with ${totalCourts} covered courts`);
    
    return filtered;
}

/**
 * Get availability for tennis courts with all filters applied
 * @param {Object} searchParams - Search parameters
 * @param {number} searchParams.hourRangeStart - Start hour
 * @param {number} searchParams.hourRangeEnd - End hour
 * @param {number} searchParams.whenDay - Day
 * @param {number} searchParams.whenMonth - Month
 * @param {number} searchParams.whenYear - Year
 * @param {string[]} searchParams.facilities - Array of facility names
 * @param {Object} searchParams.courtNumbers - Optional court numbers filter
 * @param {boolean} searchParams.coveredOnly - Optional covered courts filter
 * @param {Object} options - Optional settings
 * @param {Function} options.logger - Logger function for debug output
 * @returns {Promise<Array>} Filtered facilities with courts
 */
async function getAvailability(searchParams, options = {}) {
    const logger = options.logger || console.error;
    
    // Fetch raw data
    const rawJson = await fetchAvailability({
        hourRangeStart: searchParams.hourRangeStart,
        hourRangeEnd: searchParams.hourRangeEnd,
        whenDay: searchParams.whenDay,
        whenMonth: searchParams.whenMonth,
        whenYear: searchParams.whenYear
    }, options);
    
    // Apply filters
    let filtered = filterByFacilities(rawJson, searchParams.facilities, options);
    filtered = filterByCourtNumbers(filtered, searchParams.courtNumbers, options);
    
    if (searchParams.coveredOnly) {
        filtered = filterByCovered(filtered, options);
    }
    
    // Log final summary
    logger('=====================================================');
    const finalCourts = filtered.reduce((sum, f) => sum + f.courts.length, 0);
    logger(`✅ Final result: ${filtered.length} facilities with ${finalCourts} courts`);
    
    if (filtered.length > 0) {
        logger('');
        logger('⚠️  REMINDER: These courts are at facilities with SOME availability.');
        logger('   Verify specific court/time availability on tennis.paris.fr website.');
        logger('');
        logger('Facilities found:');
        filtered.forEach(f => {
            logger(`  • ${f.facility}: ${f.courts.length} courts`);
        });
    }
    logger('=====================================================');
    
    return filtered;
}

// Export for Node.js (CommonJS)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchAvailability,
        filterByFacilities,
        filterByCourtNumbers,
        filterByCovered,
        getAvailability
    };
}

// Export for browser (ES modules)
if (typeof window !== 'undefined') {
    window.TennisAPI = {
        fetchAvailability,
        filterByFacilities,
        filterByCourtNumbers,
        filterByCovered,
        getAvailability
    };
}
