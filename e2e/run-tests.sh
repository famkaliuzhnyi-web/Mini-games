#!/bin/bash

# E2E Test Runner Script
# This script helps set up and run e2e tests with proper error handling

set -e

echo "🎮 Mini Games E2E Test Runner"
echo "==============================="

# Function to check if browser is installed
check_browser() {
    if npx playwright list | grep -q "chromium"; then
        echo "✅ Chromium browser is installed"
        return 0
    else
        echo "❌ Chromium browser is not installed"
        return 1
    fi
}

# Function to install browser
install_browser() {
    echo "📦 Installing Chromium browser..."
    if npx playwright install chromium; then
        echo "✅ Browser installation successful"
        return 0
    else
        echo "⚠️ Browser installation failed, trying with dependencies..."
        if npx playwright install --with-deps chromium; then
            echo "✅ Browser installation with dependencies successful"
            return 0
        else
            echo "❌ Browser installation failed. Please install manually."
            echo "Try: sudo npx playwright install --with-deps chromium"
            return 1
        fi
    fi
}

# Function to check dev server
check_dev_server() {
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo "✅ Dev server is running on http://localhost:5173"
        return 0
    else
        echo "❌ Dev server is not running"
        echo "Please start the dev server: npm run dev"
        return 1
    fi
}

# Main execution
echo "🔍 Checking prerequisites..."

# Check if browser is installed
if ! check_browser; then
    echo "🚀 Installing browser..."
    if ! install_browser; then
        exit 1
    fi
fi

echo ""
echo "🌐 Checking development server..."
if ! check_dev_server; then
    echo "Starting dev server in background..."
    npm run dev &
    DEV_PID=$!
    echo "⏳ Waiting for dev server to start..."
    sleep 5
    
    if ! check_dev_server; then
        echo "❌ Failed to start dev server"
        kill $DEV_PID 2>/dev/null || true
        exit 1
    fi
else
    DEV_PID=""
fi

echo ""
echo "🧪 Running E2E tests..."

# Run tests with proper error handling
if [ "$1" = "headed" ]; then
    echo "🖥️  Running tests with visible browser..."
    npx playwright test --headed
elif [ "$1" = "debug" ]; then
    echo "🐛 Running tests in debug mode..."
    npx playwright test --debug
else
    echo "🤖 Running tests in headless mode..."
    npx playwright test
fi

TEST_EXIT_CODE=$?

# Cleanup
if [ ! -z "$DEV_PID" ]; then
    echo "🧹 Stopping dev server..."
    kill $DEV_PID 2>/dev/null || true
fi

# Show results
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ All tests passed!"
    echo "📊 View detailed report: npx playwright show-report"
else
    echo ""
    echo "❌ Some tests failed (exit code: $TEST_EXIT_CODE)"
    echo "📋 Check test results for details"
fi

exit $TEST_EXIT_CODE