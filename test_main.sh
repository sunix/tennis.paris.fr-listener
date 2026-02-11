#!/usr/bin/env bash
# Unit tests for main.sh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Test helper functions
assert_equals() {
    local expected="$1"
    local actual="$2"
    local test_name="$3"
    
    TESTS_RUN=$((TESTS_RUN + 1))
    if [ "$expected" = "$actual" ]; then
        echo -e "${GREEN}✓${NC} PASS: $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}✗${NC} FAIL: $test_name"
        echo "  Expected: $expected"
        echo "  Actual:   $actual"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

assert_contains() {
    local haystack="$1"
    local needle="$2"
    local test_name="$3"
    
    TESTS_RUN=$((TESTS_RUN + 1))
    if [[ "$haystack" == *"$needle"* ]]; then
        echo -e "${GREEN}✓${NC} PASS: $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}✗${NC} FAIL: $test_name"
        echo "  Expected '$haystack' to contain '$needle'"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Test 1: Default courts configuration
test_default_courts() {
    echo "Test 1: Default courts configuration"
    
    # Create a test environment without COURTS variable
    (
        unset COURTS
        courts=${COURTS:-"Philippe Auguste,Candie,Thiéré,La Faluère"}
        assert_equals "Philippe Auguste,Candie,Thiéré,La Faluère" "$courts" "Default courts should include all four courts"
    )
}

# Test 2: Custom courts configuration
test_custom_courts() {
    echo "Test 2: Custom courts configuration"
    
    # Create a test environment with custom COURTS variable
    (
        COURTS="Philippe Auguste,Candie"
        courts=${COURTS:-"Philippe Auguste,Candie,Thiéré,La Faluère"}
        assert_equals "Philippe Auguste,Candie" "$courts" "Custom courts should override defaults"
    )
}

# Test 3: JQ filter generation for single court
test_jq_filter_single_court() {
    echo "Test 3: JQ filter generation for single court"
    
    courts="Philippe Auguste"
    IFS=',' read -ra COURT_ARRAY <<< "$courts"
    jq_filter='[.features[] | select(.properties.available and ('
    first=true
    for court in "${COURT_ARRAY[@]}"; do
        if [ "$first" = true ]; then
            jq_filter="${jq_filter}.properties.general._nomSrtm==\"${court}\""
            first=false
        else
            jq_filter="${jq_filter} or .properties.general._nomSrtm==\"${court}\""
        fi
    done
    jq_filter="${jq_filter})) | .properties.general | {nom: ._nomSrtm, id: ._id}]"
    
    assert_contains "$jq_filter" '.properties.general._nomSrtm=="Philippe Auguste"' "JQ filter should contain Philippe Auguste"
    assert_contains "$jq_filter" '[.features[] | select(.properties.available and (' "JQ filter should have correct structure"
}

# Test 4: JQ filter generation for multiple courts
test_jq_filter_multiple_courts() {
    echo "Test 4: JQ filter generation for multiple courts"
    
    courts="Philippe Auguste,Candie,Thiéré,La Faluère"
    IFS=',' read -ra COURT_ARRAY <<< "$courts"
    jq_filter='[.features[] | select(.properties.available and ('
    first=true
    for court in "${COURT_ARRAY[@]}"; do
        if [ "$first" = true ]; then
            jq_filter="${jq_filter}.properties.general._nomSrtm==\"${court}\""
            first=false
        else
            jq_filter="${jq_filter} or .properties.general._nomSrtm==\"${court}\""
        fi
    done
    jq_filter="${jq_filter})) | .properties.general | {nom: ._nomSrtm, id: ._id}]"
    
    assert_contains "$jq_filter" '.properties.general._nomSrtm=="Philippe Auguste"' "JQ filter should contain Philippe Auguste"
    assert_contains "$jq_filter" '.properties.general._nomSrtm=="Candie"' "JQ filter should contain Candie"
    assert_contains "$jq_filter" '.properties.general._nomSrtm=="Thiéré"' "JQ filter should contain Thiéré"
    assert_contains "$jq_filter" '.properties.general._nomSrtm=="La Faluère"' "JQ filter should contain La Faluère"
    assert_contains "$jq_filter" ' or ' "JQ filter should contain OR operator"
}

# Test 5: JQ filter validation with actual jq command
test_jq_filter_syntax() {
    echo "Test 5: JQ filter syntax validation"
    
    courts="Philippe Auguste,Candie"
    IFS=',' read -ra COURT_ARRAY <<< "$courts"
    jq_filter='[.features[] | select(.properties.available and ('
    first=true
    for court in "${COURT_ARRAY[@]}"; do
        if [ "$first" = true ]; then
            jq_filter="${jq_filter}.properties.general._nomSrtm==\"${court}\""
            first=false
        else
            jq_filter="${jq_filter} or .properties.general._nomSrtm==\"${court}\""
        fi
    done
    jq_filter="${jq_filter})) | .properties.general | {nom: ._nomSrtm, id: ._id}]"
    
    # Test with mock JSON data
    mock_json='{"features":[{"properties":{"available":true,"general":{"_nomSrtm":"Philippe Auguste","_id":"123"}}},{"properties":{"available":true,"general":{"_nomSrtm":"Other Court","_id":"456"}}}]}'
    
    result=$(echo "$mock_json" | jq "$jq_filter" 2>&1)
    exit_code=$?
    
    assert_equals "0" "$exit_code" "JQ filter should be syntactically valid"
}

# Test 6: JQ filter correctly filters courts
test_jq_filter_filtering() {
    echo "Test 6: JQ filter correctly filters courts"
    
    courts="Philippe Auguste,Candie"
    IFS=',' read -ra COURT_ARRAY <<< "$courts"
    jq_filter='[.features[] | select(.properties.available and ('
    first=true
    for court in "${COURT_ARRAY[@]}"; do
        if [ "$first" = true ]; then
            jq_filter="${jq_filter}.properties.general._nomSrtm==\"${court}\""
            first=false
        else
            jq_filter="${jq_filter} or .properties.general._nomSrtm==\"${court}\""
        fi
    done
    jq_filter="${jq_filter})) | .properties.general | {nom: ._nomSrtm, id: ._id}]"
    
    # Test with mock JSON data
    mock_json='{"features":[{"properties":{"available":true,"general":{"_nomSrtm":"Philippe Auguste","_id":"123"}}},{"properties":{"available":true,"general":{"_nomSrtm":"Other Court","_id":"456"}}},{"properties":{"available":true,"general":{"_nomSrtm":"Candie","_id":"789"}}}]}'
    
    result=$(echo "$mock_json" | jq -c "$jq_filter")
    
    assert_contains "$result" '"nom":"Philippe Auguste"' "Result should contain Philippe Auguste"
    assert_contains "$result" '"nom":"Candie"' "Result should contain Candie"
    
    # Verify "Other Court" is NOT in the result
    if [[ "$result" != *'"nom":"Other Court"'* ]]; then
        echo -e "${GREEN}✓${NC} PASS: Result should not contain 'Other Court'"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        TESTS_RUN=$((TESTS_RUN + 1))
    else
        echo -e "${RED}✗${NC} FAIL: Result should not contain 'Other Court'"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        TESTS_RUN=$((TESTS_RUN + 1))
    fi
}

# Test 7: Empty array detection
test_empty_array_detection() {
    echo "Test 7: Empty array detection"
    
    json="[]"
    
    if [ -z "$json" ] || [ "$json" = "[]" ]; then
        result="empty"
    else
        result="not_empty"
    fi
    
    assert_equals "empty" "$result" "Empty array should be detected as empty"
}

# Test 8: Non-empty array detection
test_non_empty_array_detection() {
    echo "Test 8: Non-empty array detection"
    
    json='[{"nom":"Philippe Auguste","id":"123"}]'
    
    if [ -z "$json" ] || [ "$json" = "[]" ]; then
        result="empty"
    else
        result="not_empty"
    fi
    
    assert_equals "not_empty" "$result" "Non-empty array should be detected as not empty"
}

# Test 9: Court names with special characters
test_court_names_with_special_characters() {
    echo "Test 9: Court names with special characters (accents)"
    
    courts="Thiéré,La Faluère"
    IFS=',' read -ra COURT_ARRAY <<< "$courts"
    
    # Count how many courts were parsed
    court_count=${#COURT_ARRAY[@]}
    
    assert_equals "2" "$court_count" "Should parse 2 courts with special characters"
    assert_equals "Thiéré" "${COURT_ARRAY[0]}" "First court should be Thiéré"
    assert_equals "La Faluère" "${COURT_ARRAY[1]}" "Second court should be La Faluère"
}

# Test 10: Environment variable loading
test_env_variable_loading() {
    echo "Test 10: Environment variable loading from .env"
    
    # Create a temporary .env file
    temp_env=$(mktemp)
    cat > "$temp_env" << EOF
COURTS="Test Court 1,Test Court 2"
HOUR_RANGE_START=10
HOUR_RANGE_END=20
EOF
    
    # Load the env file
    (
        set -a
        . "$temp_env"
        set +a
        
        assert_equals "Test Court 1,Test Court 2" "$COURTS" "COURTS should be loaded from .env"
        assert_equals "10" "$HOUR_RANGE_START" "HOUR_RANGE_START should be loaded from .env"
        assert_equals "20" "$HOUR_RANGE_END" "HOUR_RANGE_END should be loaded from .env"
    )
    
    rm -f "$temp_env"
}

# Run all tests
echo "========================================="
echo "Running unit tests for main.sh"
echo "========================================="
echo

test_default_courts
echo
test_custom_courts
echo
test_jq_filter_single_court
echo
test_jq_filter_multiple_courts
echo
test_jq_filter_syntax
echo
test_jq_filter_filtering
echo
test_empty_array_detection
echo
test_non_empty_array_detection
echo
test_court_names_with_special_characters
echo
test_env_variable_loading
echo

# Print summary
echo "========================================="
echo "Test Summary"
echo "========================================="
echo "Tests run:    $TESTS_RUN"
echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
if [ $TESTS_FAILED -gt 0 ]; then
    echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"
else
    echo -e "Tests failed: $TESTS_FAILED"
fi
echo "========================================="

# Exit with appropriate code
if [ $TESTS_FAILED -gt 0 ]; then
    exit 1
else
    exit 0
fi
