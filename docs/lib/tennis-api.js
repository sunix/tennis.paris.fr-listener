/**
 * Tennis Paris API Client
 * Shared module for fetching and filtering tennis court availability
 */

// Import fetch for Node.js environment
if (typeof window === 'undefined' && typeof fetch === 'undefined') {
    // Node.js environment - need to use node-fetch
    globalThis.fetch = require('node-fetch');
}

// Constants for tennis.paris.fr API
const API_COATING_TYPES = ['96', '2095', '94', '1324', '2016', '92'];
const API_IN_OUT_TYPES = ['V', 'F'];
const API_URL = 'https://tennis.paris.fr/tennis/jsp/site/Portal.jsp?page=recherche&action=ajax_disponibilite_map';
const API_PLANNING_URL = 'https://tennis.paris.fr/tennis/jsp/site/Portal.jsp?page=recherche&action=ajax_load_planning';

/**
 * Format date for API requests
 * @param {number} day - Day (e.g., 23)
 * @param {number} month - Month (e.g., 05)
 * @param {number} year - Year (e.g., 2021)
 * @returns {string} Formatted date string (DD/MM/YYYY)
 */
function formatDate(day, month, year) {
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

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
 * @param {string} options.corsProxy - CORS proxy URL (e.g., 'https://proxy.example.com/api')
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
    
    // Determine URL to use (with or without CORS proxy)
    let fetchUrl = API_URL;
    if (options.corsProxy) {
        const tennisUrl = new URL(API_URL);
        fetchUrl = `${options.corsProxy}${tennisUrl.pathname}${tennisUrl.search}`;
    }
    
    // Make API request
    const response = await fetch(fetchUrl, {
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
 * Parse HTML planning table to extract court availability
 * @param {string} html - HTML response from ajax_load_planning
 * @returns {Object} Parsed planning data with courts and timeslots
 */
function parsePlanningHTML(html) {
    const result = {
        courts: [],
        timeslots: []
    };
    
    // Extract court names from thead
    const courtRegex = /<span class="title">(Court \d+)<\/span>/g;
    let match;
    while ((match = courtRegex.exec(html)) !== null) {
        result.courts.push(match[1]);
    }
    
    // Extract time slots and availability from tbody
    // Match pattern: <td>HHh - HHh</td> followed by cells with <span>STATUS</span>
    const timeSlotRegex = /<td>(\d{2}h - \d{2}h)<\/td>/g;
    const timeSlots = [];
    while ((match = timeSlotRegex.exec(html)) !== null) {
        timeSlots.push({
            time: match[1],
            startPos: match.index
        });
    }
    
    // For each time slot, extract the availability of each court
    timeSlots.forEach((slot, slotIndex) => {
        const timeslotData = {
            time: slot.time,
            courts: {}
        };
        
        // Find the HTML section for this time slot
        // It starts after the time cell and continues until the next time slot or end of tbody
        const startPos = slot.startPos;
        const endPos = slotIndex < timeSlots.length - 1 
            ? timeSlots[slotIndex + 1].startPos 
            : html.indexOf('</tbody>', startPos);
        
        const slotHTML = html.substring(startPos, endPos);
        
        // Extract all <span> content within <td> elements for this row
        // The HTML has two patterns for cells:
        // 1. Available: <td><span>LIBRE</span></td>
        // 2. Reserved: <td class="reservation-cell"><p class="title-cell">PUBLIC</p><br/><span>Réservé le DD.MM.YYYY HH:MM</span></td>
        // 
        // This regex matches both patterns by:
        // - /<td[^>]*>/ - Match opening <td> tag with any attributes
        // - /(?:.*?)/ - Non-capturing group with lazy match for any content (handles the <p> and <br/> in reserved cells)
        // - /<span>([^<]+)<\/span>/ - Capture the text inside the <span> tag
        // - /\s*<\/td>/ - Match closing </td> tag with optional whitespace
        // - /gs/ - Global search with dot-matches-newline flag
        const cellRegex = /<td[^>]*>(?:.*?)<span>([^<]+)<\/span>\s*<\/td>/gs;
        const statuses = [];
        let cellMatch;
        while ((cellMatch = cellRegex.exec(slotHTML)) !== null) {
            statuses.push(cellMatch[1]);
        }
        
        // Map statuses to courts
        result.courts.forEach((courtName, courtIndex) => {
            if (courtIndex < statuses.length) {
                const status = statuses[courtIndex];
                timeslotData.courts[courtName] = {
                    status: status,
                    available: status === 'LIBRE'
                };
            }
        });
        
        result.timeslots.push(timeslotData);
    });
    
    return result;
}

/**
 * Fetch detailed planning data for a specific facility and date
 * @param {Object} params - Planning parameters
 * @param {string} params.facilityName - Name of the facility (e.g., "La Faluère")
 * @param {number} params.whenDay - Day (e.g., 23)
 * @param {number} params.whenMonth - Month (e.g., 05)
 * @param {number} params.whenYear - Year (e.g., 2021)
 * @param {Object} options - Optional settings
 * @param {Function} options.logger - Logger function for debug output
 * @param {string} options.corsProxy - CORS proxy URL (e.g., 'https://proxy.example.com/api')
 * @returns {Promise<Object>} Parsed planning data with courts and timeslots
 */
async function fetchCourtPlanning(params, options = {}) {
    const logger = options.logger || console.error;
    
    const dateStr = formatDate(params.whenDay, params.whenMonth, params.whenYear);
    
    logger(`Fetching detailed planning for ${params.facilityName} on ${dateStr}...`);
    
    // Build form data
    const formData = new URLSearchParams();
    formData.append('date_selected', dateStr);
    formData.append('name_tennis', params.facilityName);
    
    try {
        // Determine URL to use (with or without CORS proxy)
        let fetchUrl = API_PLANNING_URL;
        if (options.corsProxy) {
            const tennisUrl = new URL(API_PLANNING_URL);
            fetchUrl = `${options.corsProxy}${tennisUrl.pathname}${tennisUrl.search}`;
        }
        
        // Make API request
        const response = await fetch(fetchUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': '*/*'
            },
            body: formData.toString()
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const html = await response.text();
        
        // Parse the HTML response
        const planning = parsePlanningHTML(html);
        planning.facility = params.facilityName;
        planning.date = dateStr;
        
        logger(`✓ Fetched planning: ${planning.courts.length} courts, ${planning.timeslots.length} time slots`);
        
        return planning;
        
    } catch (error) {
        logger(`✗ Error fetching planning for ${params.facilityName}: ${error.message}`);
        throw error;
    }
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

/**
 * Get detailed availability with per-court timeslots
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
 * @returns {Promise<Array>} Facilities with detailed per-court availability
 */
async function getDetailedAvailability(searchParams, options = {}) {
    const logger = options.logger || console.error;
    
    logger('=====================================================');
    logger('=== Fetching Detailed Court Availability ===');
    logger('=====================================================');
    
    // First, get the basic facility-level availability
    const facilities = await getAvailability(searchParams, options);
    
    if (facilities.length === 0) {
        logger('No facilities with availability found.');
        return [];
    }
    
    logger('');
    logger('Fetching detailed planning for each facility...');
    logger('');
    
    // Fetch detailed planning for each facility
    const detailedFacilities = [];
    
    for (const facility of facilities) {
        try {
            const planning = await fetchCourtPlanning({
                facilityName: facility.facility,
                whenDay: searchParams.whenDay,
                whenMonth: searchParams.whenMonth,
                whenYear: searchParams.whenYear
            }, options);
            
            // Filter timeslots to only include the requested hour range
            const filteredTimeslots = planning.timeslots.filter(slot => {
                // Parse time from "08h - 09h" format
                const startHour = parseInt(slot.time.split('h')[0]);
                return startHour >= searchParams.hourRangeStart && startHour < searchParams.hourRangeEnd;
            });
            
            // Build a mapping of court numbers to apply filters
            // Extract numbers from facility courts (which have format "Court n° 01")
            const facilityCourts = facility.courts.map(c => ({
                number: c.courtNumber,
                covered: c.covered
            }));
            
            // Filter by court numbers if specified
            let allowedCourtNumbers = facilityCourts.map(c => c.number);
            if (searchParams.courtNumbers && searchParams.courtNumbers[facility.facility]) {
                allowedCourtNumbers = allowedCourtNumbers.filter(n => 
                    searchParams.courtNumbers[facility.facility].includes(n)
                );
            }
            
            // Filter by covered if specified
            if (searchParams.coveredOnly) {
                const coveredNumbers = facilityCourts
                    .filter(c => c.covered === 'V')
                    .map(c => c.number);
                allowedCourtNumbers = allowedCourtNumbers.filter(n => coveredNumbers.includes(n));
            }
            
            // Filter planning courts based on allowed numbers
            // Planning courts have format "Court 01", facility courts have "Court n° 01"
            const courtsToInclude = planning.courts.filter(courtName => {
                const match = courtName.match(/Court (\d+)/);
                if (match) {
                    const courtNum = parseInt(match[1]);
                    return allowedCourtNumbers.includes(courtNum);
                }
                return false;
            });
            
            // Filter planning data to only include relevant courts and timeslots
            const filteredPlanning = {
                facility: facility.facility,
                facilityId: facility.facilityId,
                date: planning.date,
                courts: courtsToInclude,
                timeslots: filteredTimeslots.map(slot => ({
                    time: slot.time,
                    courts: Object.fromEntries(
                        Object.entries(slot.courts)
                            .filter(([courtName]) => courtsToInclude.includes(courtName))
                    )
                })).filter(slot => Object.keys(slot.courts).length > 0)
            };
            
            // Only include if there are available slots
            const hasAvailability = filteredPlanning.timeslots.some(slot =>
                Object.values(slot.courts).some(court => court.available)
            );
            
            if (hasAvailability) {
                detailedFacilities.push(filteredPlanning);
            }
            
        } catch (error) {
            logger(`⚠️  Could not fetch detailed planning for ${facility.facility}: ${error.message}`);
            // Continue with other facilities
        }
    }
    
    logger('');
    logger('=====================================================');
    logger(`✅ Detailed availability: ${detailedFacilities.length} facilities`);
    
    if (detailedFacilities.length > 0) {
        detailedFacilities.forEach(f => {
            const availableSlots = f.timeslots.reduce((count, slot) => {
                return count + Object.values(slot.courts).filter(c => c.available).length;
            }, 0);
            logger(`  • ${f.facility}: ${f.courts.length} courts, ${availableSlots} available slots`);
        });
    }
    logger('=====================================================');
    
    return detailedFacilities;
}

// Export for Node.js (CommonJS)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchAvailability,
        filterByFacilities,
        filterByCourtNumbers,
        filterByCovered,
        getAvailability,
        fetchCourtPlanning,
        parsePlanningHTML,
        getDetailedAvailability
    };
}

// Export for browser (ES modules)
if (typeof window !== 'undefined') {
    window.TennisAPI = {
        fetchAvailability,
        filterByFacilities,
        filterByCourtNumbers,
        filterByCovered,
        getAvailability,
        fetchCourtPlanning,
        parsePlanningHTML,
        getDetailedAvailability
    };
}
