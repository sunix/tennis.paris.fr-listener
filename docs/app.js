// Tennis Paris Listener - Search Configuration App

// Constants for tennis.paris.fr API
// Court surface types (selCoating): 96=Clay, 2095=Hard, 94=Synthetic, 1324=Carpet, 2016=Grass, 92=Other
// Indoor/Outdoor (selInOut): V=Outdoor (Vert/Green), F=Indoor (Fermé/Closed)
const API_COATING_TYPES = ['96', '2095', '94', '1324', '2016', '92'];
const API_IN_OUT_TYPES = ['V', 'F'];

// CORS proxy URL - can be set to null to disable proxy
// Using AllOrigins as a free CORS proxy service
// Note: Most free CORS proxies only support GET requests, so this may not work
// for POST endpoints. The code falls back to direct requests if the proxy fails.
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

// State
let searches = [];
let courtIdCounter = 0;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadSearches();
    renderSavedSearches();
    updateExportSelect();
    setupEventListeners();
    addCourtField(); // Add one court field by default
    setDefaultDate();
});

// Set default date to tomorrow
function setDefaultDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    document.getElementById('whenDay').value = tomorrow.getDate();
    document.getElementById('whenMonth').value = tomorrow.getMonth() + 1;
    document.getElementById('whenYear').value = tomorrow.getFullYear();
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('addCourtBtn').addEventListener('click', addCourtField);
    document.getElementById('saveBtn').addEventListener('click', saveSearch);
    document.getElementById('clearBtn').addEventListener('click', clearForm);
    document.getElementById('exportBtn').addEventListener('click', exportToEnv);
}

// Add court field
function addCourtField() {
    const courtId = courtIdCounter++;
    const container = document.getElementById('courtsContainer');
    
    const courtDiv = document.createElement('div');
    courtDiv.className = 'court-item';
    courtDiv.dataset.courtId = courtId;
    
    courtDiv.innerHTML = `
        <div class="court-header">
            <input type="text" 
                   placeholder="Tennis facility name (e.g., La Faluère)" 
                   class="court-name"
                   data-court-id="${courtId}">
            <button type="button" class="btn-remove" onclick="removeCourtField(${courtId})">Remove</button>
        </div>
        <div class="court-numbers">
            <label>Court numbers (comma-separated, e.g., 5,6,7,8,17,18,19,20,21):</label>
            <input type="text" 
                   placeholder="Leave empty for all courts" 
                   class="court-numbers-input"
                   data-court-id="${courtId}">
        </div>
    `;
    
    container.appendChild(courtDiv);
}

// Remove court field
function removeCourtField(courtId) {
    const courtDiv = document.querySelector(`[data-court-id="${courtId}"]`);
    if (courtDiv) {
        courtDiv.remove();
    }
}

// Save search
function saveSearch() {
    const searchName = document.getElementById('searchName').value.trim();
    
    if (!searchName) {
        showMessage('Please enter a search name', 'error');
        return;
    }
    
    // Get date
    const whenDay = parseInt(document.getElementById('whenDay').value);
    const whenMonth = parseInt(document.getElementById('whenMonth').value);
    const whenYear = parseInt(document.getElementById('whenYear').value);
    
    if (!whenDay || !whenMonth || !whenYear) {
        showMessage('Please enter a valid date', 'error');
        return;
    }
    
    // Get time range
    const hourRangeStart = parseInt(document.getElementById('hourRangeStart').value);
    const hourRangeEnd = parseInt(document.getElementById('hourRangeEnd').value);
    
    // Get options
    const coveredOnly = document.getElementById('coveredOnly').checked;
    const twoHours = document.getElementById('twoHours').checked;
    
    // Get courts
    const courtElements = document.querySelectorAll('.court-name');
    const courts = [];
    
    courtElements.forEach(courtEl => {
        const name = courtEl.value.trim();
        if (name) {
            const courtId = courtEl.dataset.courtId;
            const numbersInput = document.querySelector(`.court-numbers-input[data-court-id="${courtId}"]`);
            const numbersStr = numbersInput.value.trim();
            const numbers = numbersStr ? numbersStr.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n)) : [];
            
            courts.push({
                name: name,
                numbers: numbers
            });
        }
    });
    
    if (courts.length === 0) {
        showMessage('Please add at least one tennis facility', 'error');
        return;
    }
    
    // Create search object
    const search = {
        id: Date.now(),
        name: searchName,
        whenDay,
        whenMonth,
        whenYear,
        hourRangeStart,
        hourRangeEnd,
        coveredOnly,
        twoHours,
        courts,
        createdAt: new Date().toISOString()
    };
    
    // Save to array
    searches.push(search);
    saveSearches();
    renderSavedSearches();
    updateExportSelect();
    clearForm();
    
    showMessage('Search saved successfully!', 'success');
}

// Clear form
function clearForm() {
    document.getElementById('searchName').value = '';
    document.getElementById('coveredOnly').checked = false;
    document.getElementById('twoHours').checked = false;
    
    // Clear all court fields
    document.getElementById('courtsContainer').innerHTML = '';
    courtIdCounter = 0;
    addCourtField();
    
    setDefaultDate();
}

// Load search into form
function loadSearchIntoForm(searchId) {
    const search = searches.find(s => s.id === searchId);
    if (!search) return;
    
    document.getElementById('searchName').value = search.name;
    document.getElementById('whenDay').value = search.whenDay;
    document.getElementById('whenMonth').value = search.whenMonth;
    document.getElementById('whenYear').value = search.whenYear;
    document.getElementById('hourRangeStart').value = search.hourRangeStart;
    document.getElementById('hourRangeEnd').value = search.hourRangeEnd;
    document.getElementById('coveredOnly').checked = search.coveredOnly;
    document.getElementById('twoHours').checked = search.twoHours;
    
    // Clear and add courts
    document.getElementById('courtsContainer').innerHTML = '';
    courtIdCounter = 0;
    
    search.courts.forEach(court => {
        addCourtField();
        const lastCourtId = courtIdCounter - 1;
        const courtNameInput = document.querySelector(`.court-name[data-court-id="${lastCourtId}"]`);
        const courtNumbersInput = document.querySelector(`.court-numbers-input[data-court-id="${lastCourtId}"]`);
        
        if (courtNameInput) courtNameInput.value = court.name;
        if (courtNumbersInput) courtNumbersInput.value = court.numbers.join(',');
    });
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Delete search
function deleteSearch(searchId) {
    if (confirm('Are you sure you want to delete this search?')) {
        searches = searches.filter(s => s.id !== searchId);
        saveSearches();
        renderSavedSearches();
        updateExportSelect();
        showMessage('Search deleted successfully', 'success');
    }
}

// Render saved searches
function renderSavedSearches() {
    const container = document.getElementById('savedSearches');
    
    if (searches.length === 0) {
        container.innerHTML = '<p class="empty-state">No saved searches yet. Create one above!</p>';
        return;
    }
    
    container.innerHTML = searches.map(search => `
        <div class="saved-search">
            <div class="saved-search-header">
                <h3>${escapeHtml(search.name)}</h3>
                <div class="saved-search-actions">
                    <button class="btn-primary" onclick="executeQuery(${search.id})">Test Query</button>
                    <button class="btn-secondary" onclick="loadSearchIntoForm(${search.id})">Edit</button>
                    <button class="btn-danger" onclick="deleteSearch(${search.id})">Delete</button>
                </div>
            </div>
            <div class="saved-search-details">
                <p><strong>Date:</strong> ${search.whenDay}/${search.whenMonth}/${search.whenYear}</p>
                <p><strong>Time:</strong> ${search.hourRangeStart}:00 - ${search.hourRangeEnd}:00</p>
                <p><strong>Facilities:</strong> ${search.courts.map(c => {
                    let text = c.name;
                    if (c.numbers.length > 0) {
                        text += ` (courts: ${c.numbers.join(', ')})`;
                    }
                    return text;
                }).join('; ')}</p>
                ${search.coveredOnly ? '<p><strong>✓</strong> Covered courts only</p>' : ''}
                ${search.twoHours ? '<p><strong>✓</strong> Looking for 2 consecutive hours</p>' : ''}
            </div>
            <div id="results-${search.id}" class="query-results"></div>
        </div>
    `).join('');
}

// Update export select dropdown
function updateExportSelect() {
    const select = document.getElementById('exportSelect');
    select.innerHTML = '<option value="">-- Select a search --</option>' + 
        searches.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
}

// Export to .env format
function exportToEnv() {
    const selectEl = document.getElementById('exportSelect');
    const searchId = parseInt(selectEl.value);
    
    if (!searchId) {
        showMessage('Please select a search to export', 'error');
        return;
    }
    
    const search = searches.find(s => s.id === searchId);
    if (!search) return;
    
    // Generate .env content
    let envContent = '# Configuration for tennis.paris.fr-listener\n';
    envContent += `# Generated from search: ${search.name}\n\n`;
    
    // Basic fields
    envContent += `# Date to check (DD/MM/YYYY format)\n`;
    envContent += `WHEN_DAY=${search.whenDay}\n`;
    envContent += `WHEN_MONTH=${search.whenMonth}\n`;
    envContent += `WHEN_YEAR=${search.whenYear}\n\n`;
    
    envContent += `# Time range for checking availability (hours)\n`;
    envContent += `HOUR_RANGE_START=${search.hourRangeStart}\n`;
    envContent += `HOUR_RANGE_END=${search.hourRangeEnd}\n\n`;
    
    // Courts - comma-separated list
    const courtNames = search.courts.map(c => c.name).join(',');
    envContent += `# List of courts to monitor (comma-separated)\n`;
    envContent += `COURTS="${courtNames}"\n\n`;
    
    // Court-specific filters (new feature)
    if (search.courts.some(c => c.numbers.length > 0)) {
        envContent += `# Court numbers to filter (JSON format)\n`;
        const courtFilters = {};
        search.courts.forEach(c => {
            if (c.numbers.length > 0) {
                courtFilters[c.name] = c.numbers;
            }
        });
        envContent += `COURT_NUMBERS='${JSON.stringify(courtFilters)}'\n\n`;
    }
    
    // Additional options
    if (search.coveredOnly) {
        envContent += `# Filter for covered courts only\n`;
        envContent += `COVERED_ONLY=true\n\n`;
    }
    
    if (search.twoHours) {
        envContent += `# Look for 2 consecutive hours\n`;
        envContent += `TWO_HOURS=true\n\n`;
    }
    
    envContent += `# Google Chat webhook URL (for GitHub Actions notifications)\n`;
    envContent += `GOOGLE_CHAT_WEBHOOK=\n`;
    
    document.getElementById('envOutput').value = envContent;
    
    // Copy to clipboard
    navigator.clipboard.writeText(envContent).then(() => {
        showMessage('Configuration copied to clipboard!', 'success');
    }).catch(() => {
        showMessage('Configuration generated - please copy manually', 'success');
    });
}

// Local storage functions
function saveSearches() {
    localStorage.setItem('tennisSearches', JSON.stringify(searches));
}

function loadSearches() {
    const stored = localStorage.getItem('tennisSearches');
    if (stored) {
        searches = JSON.parse(stored);
    }
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showMessage(text, type) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.success-message, .error-message');
    existingMessages.forEach(msg => msg.remove());
    
    const message = document.createElement('div');
    message.className = type === 'success' ? 'success-message' : 'error-message';
    message.textContent = text;
    
    const firstCard = document.querySelector('.card');
    firstCard.insertBefore(message, firstCard.firstChild);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        message.remove();
    }, 5000);
}

// Execute query
async function executeQuery(searchId) {
    const search = searches.find(s => s.id === searchId);
    if (!search) return;
    
    const resultsContainer = document.getElementById(`results-${searchId}`);
    resultsContainer.innerHTML = '<div class="loading">⏳ Executing query...</div>';
    
    try {
        // Build API URL
        const apiUrl = 'https://tennis.paris.fr/tennis/jsp/site/Portal.jsp?page=recherche&action=ajax_disponibilite_map';
        
        // Fetch data from API with CORS proxy if available
        const formData = new URLSearchParams();
        formData.append('hourRange', `${search.hourRangeStart}-${search.hourRangeEnd}`);
        formData.append('when', `${search.whenDay}/${search.whenMonth}/${search.whenYear}`);
        
        // Add coating and in/out types
        API_COATING_TYPES.forEach(type => formData.append('selCoating[]', type));
        API_IN_OUT_TYPES.forEach(type => formData.append('selInOut[]', type));
        
        // Try with CORS proxy first, fallback to direct if proxy fails
        let response;
        let rawJson;
        
        if (CORS_PROXY) {
            try {
                // Use CORS proxy with POST data as query parameter
                const fullUrl = `${apiUrl}?${formData.toString()}`;
                const proxiedUrl = `${CORS_PROXY}${encodeURIComponent(fullUrl)}`;
                response = await fetch(proxiedUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                    }
                });
                
                if (response.ok) {
                    rawJson = await response.json();
                }
            } catch (proxyError) {
                console.warn('CORS proxy failed, trying direct request:', proxyError);
                // Fall through to direct request
            }
        }
        
        // If proxy didn't work or wasn't used, try direct request
        if (!rawJson) {
            response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString()
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            rawJson = await response.json();
        }
        
        // Apply filters
        let filteredResults = filterByFacilities(rawJson, search.courts);
        filteredResults = filterByCourtNumbers(filteredResults, search.courts);
        
        if (search.coveredOnly) {
            filteredResults = filterByCovered(filteredResults);
        }
        
        // Display results
        displayQueryResults(resultsContainer, filteredResults, search);
        
    } catch (error) {
        let errorMessage = escapeHtml(error.message);
        if (error.message.includes('Failed to fetch') || error.message.includes('CORS') || error.message.includes('NetworkError')) {
            errorMessage = 'Unable to connect to tennis.paris.fr API due to CORS restrictions. ' +
                          'Try using a browser extension like "CORS Unblock" or "Allow CORS" to test queries. ' +
                          'Note: The actual listener (main.sh) works correctly as it uses curl which bypasses CORS.';
        }
        resultsContainer.innerHTML = `<div class="error">❌ ${errorMessage}</div>`;
    }
}

// Helper to extract facility name from API response
function getFacilityName(feature) {
    return feature.properties.general._nomSrtm;
}

// Helper to extract facility ID from API response
function getFacilityId(feature) {
    return feature.properties.general._id;
}

// Helper to check if facility is available from API response
function isFacilityAvailable(feature) {
    return feature.properties.available;
}

// Filter by facilities
function filterByFacilities(rawJson, courts) {
    const facilityNames = courts.map(c => c.name);
    
    return rawJson.features
        .filter(feature => isFacilityAvailable(feature) && facilityNames.includes(getFacilityName(feature)))
        .map(feature => ({
            facility: getFacilityName(feature),
            facilityId: getFacilityId(feature),
            courts: feature.properties.courts.map(court => ({
                courtNumber: court._formattedAirNum,
                courtName: court._airNom,
                covered: court._airCvt
            }))
        }));
}

// Filter by court numbers
function filterByCourtNumbers(facilities, courtConfigs) {
    return facilities.map(facility => {
        const config = courtConfigs.find(c => c.name === facility.facility);
        
        if (!config || config.numbers.length === 0) {
            return facility;
        }
        
        return {
            ...facility,
            courts: facility.courts.filter(court => config.numbers.includes(court.courtNumber))
        };
    }).filter(facility => facility.courts.length > 0);
}

// Filter by covered courts
function filterByCovered(facilities) {
    return facilities.map(facility => ({
        ...facility,
        courts: facility.courts.filter(court => court.covered === 'V')
    })).filter(facility => facility.courts.length > 0);
}

// Display query results
function displayQueryResults(container, results, search) {
    if (results.length === 0) {
        container.innerHTML = `
            <div class="query-results-content no-results">
                <p>🔍 No courts available matching your criteria</p>
            </div>
        `;
        return;
    }
    
    const totalCourts = results.reduce((sum, facility) => sum + facility.courts.length, 0);
    
    let html = `
        <div class="query-results-content">
            <h4>✅ Found ${totalCourts} available court${totalCourts !== 1 ? 's' : ''}</h4>
    `;
    
    results.forEach(facility => {
        html += `
            <div class="facility-result">
                <h5>🎾 ${escapeHtml(facility.facility)}</h5>
                <ul>
        `;
        
        facility.courts.forEach(court => {
            const coveredIcon = court.covered === 'V' ? '☂️' : '☀️';
            html += `<li>${coveredIcon} Court ${court.courtNumber}: ${escapeHtml(court.courtName)}</li>`;
        });
        
        html += `
                </ul>
            </div>
        `;
    });
    
    html += '</div>';
    
    container.innerHTML = html;
}
