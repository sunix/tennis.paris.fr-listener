#!/usr/bin/env bash
# Unit tests for workflow scripts in scripts/ directory

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Temporary directory for tests
TEST_DIR=$(mktemp -d)
trap "rm -rf $TEST_DIR" EXIT

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

assert_exit_code() {
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
        echo "  Expected exit code: $expected"
        echo "  Actual exit code:   $actual"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Test 1: validate-webhook.sh without argument should fail
test_validate_webhook_no_arg() {
    echo "Test 1: validate-webhook.sh without argument should fail"
    
    unset GOOGLE_CHAT_WEBHOOK
    exit_code=0
    output=$(./scripts/validate-webhook.sh 2>&1) || exit_code=$?
    
    assert_exit_code "1" "$exit_code" "Should exit with code 1 when no webhook provided"
    assert_contains "$output" "ERROR" "Should show error message"
}

# Test 2: validate-webhook.sh with argument should succeed
test_validate_webhook_with_arg() {
    echo "Test 2: validate-webhook.sh with argument should succeed"
    
    output=$(./scripts/validate-webhook.sh "https://test.webhook.url" 2>&1)
    exit_code=$?
    
    assert_exit_code "0" "$exit_code" "Should exit with code 0 when webhook provided"
    assert_contains "$output" "configured" "Should show success message"
}

# Test 3: validate-webhook.sh with environment variable should succeed
test_validate_webhook_with_env() {
    echo "Test 3: validate-webhook.sh with environment variable should succeed"
    
    output=$(GOOGLE_CHAT_WEBHOOK="https://test.webhook.url" ./scripts/validate-webhook.sh 2>&1)
    exit_code=$?
    
    assert_exit_code "0" "$exit_code" "Should exit with code 0 when env var set"
    assert_contains "$output" "configured" "Should show success message"
}

# Test 4: detect-change.sh first run should detect change
test_detect_change_first_run() {
    echo "Test 4: detect-change.sh first run should detect change"
    
    local test_output="$TEST_DIR/output1.txt"
    local test_state="$TEST_DIR/state1"
    
    echo "test content" > "$test_output"
    output=$(./scripts/detect-change.sh "$test_output" "$test_state")
    exit_code=$?
    
    assert_exit_code "0" "$exit_code" "Should exit with code 0"
    assert_contains "$output" "changed=true" "First run should detect change"
}

# Test 5: detect-change.sh second run with same content should not detect change
test_detect_change_no_change() {
    echo "Test 5: detect-change.sh second run with same content should not detect change"
    
    local test_output="$TEST_DIR/output2.txt"
    local test_state="$TEST_DIR/state2"
    
    echo "test content" > "$test_output"
    ./scripts/detect-change.sh "$test_output" "$test_state" > /dev/null
    
    # Run again with same content
    output=$(./scripts/detect-change.sh "$test_output" "$test_state")
    exit_code=$?
    
    assert_exit_code "0" "$exit_code" "Should exit with code 0"
    assert_contains "$output" "changed=false" "Should not detect change when content is same"
}

# Test 6: detect-change.sh with changed content should detect change
test_detect_change_with_change() {
    echo "Test 6: detect-change.sh with changed content should detect change"
    
    local test_output="$TEST_DIR/output3.txt"
    local test_state="$TEST_DIR/state3"
    
    echo "first content" > "$test_output"
    ./scripts/detect-change.sh "$test_output" "$test_state" > /dev/null
    
    # Change content
    echo "second content" > "$test_output"
    output=$(./scripts/detect-change.sh "$test_output" "$test_state")
    exit_code=$?
    
    assert_exit_code "0" "$exit_code" "Should exit with code 0"
    assert_contains "$output" "changed=true" "Should detect change when content changes"
}

# Test 7: detect-change.sh with missing file should fail
test_detect_change_missing_file() {
    echo "Test 7: detect-change.sh with missing file should fail"
    
    output=$(./scripts/detect-change.sh "/nonexistent/file.txt" "$TEST_DIR/state_fail" 2>&1) || exit_code=$?
    
    assert_exit_code "1" "$exit_code" "Should exit with code 1 when output file missing"
    assert_contains "$output" "not found" "Should show error about missing file"
}

# Test 8: detect-change.sh saves hash correctly
test_detect_change_saves_hash() {
    echo "Test 8: detect-change.sh saves hash correctly"
    
    local test_output="$TEST_DIR/output4.txt"
    local test_state="$TEST_DIR/state4"
    
    echo "test content" > "$test_output"
    ./scripts/detect-change.sh "$test_output" "$test_state" > /dev/null
    
    # Check that hash file was created
    if [ -f "$test_state/last_hash.txt" ]; then
        result="exists"
    else
        result="not_exists"
    fi
    
    assert_equals "exists" "$result" "Should create hash file in state directory"
}

# Test 8: notify-google-chat.sh without webhook should fail
test_notify_no_webhook() {
    echo "Test 9: notify-google-chat.sh without webhook should fail"
    
    local test_output="$TEST_DIR/output5.txt"
    echo '[]' > "$test_output"
    
    unset GOOGLE_CHAT_WEBHOOK
    exit_code=0
    output=$(./scripts/notify-google-chat.sh "$test_output" 2>&1) || exit_code=$?
    
    assert_exit_code "1" "$exit_code" "Should exit with code 1 when no webhook provided"
    assert_contains "$output" "ERROR" "Should show error message"
}

# Test 10: notify-google-chat.sh with missing output file should fail
test_notify_missing_file() {
    echo "Test 10: notify-google-chat.sh with missing output file should fail"
    
    exit_code=0
    output=$(./scripts/notify-google-chat.sh "/nonexistent/file.txt" "https://test.webhook.url" 2>&1) || exit_code=$?
    
    assert_exit_code "1" "$exit_code" "Should exit with code 1 when output file missing"
    assert_contains "$output" "not found" "Should show error about missing file"
}

# Test 11: notify-google-chat.sh generates valid JSON payload
test_notify_json_payload() {
    echo "Test 11: notify-google-chat.sh generates valid JSON payload"
    
    local test_output="$TEST_DIR/output6.txt"
    echo '[{"nom":"Test Court","id":"123"}]' > "$test_output"
    
    # We can't actually send to webhook, but we can check that it generates payload
    output=$(./scripts/notify-google-chat.sh "$test_output" "https://httpbin.org/post" 2>&1) || true
    
    assert_contains "$output" '"text":' "Should generate JSON with 'text' field"
    assert_contains "$output" "Tennis listener update" "Should include message header"
}

# Run all tests
echo "========================================="
echo "Running unit tests for workflow scripts"
echo "========================================="
echo

test_validate_webhook_no_arg
echo
test_validate_webhook_with_arg
echo
test_validate_webhook_with_env
echo
test_detect_change_first_run
echo
test_detect_change_no_change
echo
test_detect_change_with_change
echo
test_detect_change_missing_file
echo
test_detect_change_saves_hash
echo
test_notify_no_webhook
echo
test_notify_missing_file
echo
test_notify_json_payload
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
