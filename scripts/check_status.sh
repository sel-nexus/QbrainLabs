#!/bin/bash
# Quick status check script for QbrainLabs application

echo "🔍 Checking Application Status..."
echo ""

# Check Backend
echo "📡 Backend (Port 8000):"
if lsof -ti :8000 > /dev/null 2>&1; then
    echo "   ✅ Running"
    BACKEND_STATUS=$(curl -s http://localhost:8000/ 2>&1)
    if echo "$BACKEND_STATUS" | grep -q "Qbrain AI Labs"; then
        echo "   ✅ Responding correctly"
    else
        echo "   ⚠️  Responding but may have issues"
        echo "   Response: $BACKEND_STATUS"
    fi
else
    echo "   ❌ Not running"
fi

echo ""

# Check Frontend
echo "⚛️  Frontend (Port 5173):"
if lsof -ti :5173 > /dev/null 2>&1; then
    echo "   ✅ Running"
    FRONTEND_STATUS=$(curl -s http://localhost:5173 2>&1 | head -1)
    if echo "$FRONTEND_STATUS" | grep -q "html\|HTML"; then
        echo "   ✅ Serving HTML"
    else
        echo "   ⚠️  May have issues"
        echo "   Response: $FRONTEND_STATUS"
    fi
else
    echo "   ❌ Not running"
fi

echo ""

# Check CORS
echo "🔐 CORS Configuration:"
CORS_TEST=$(curl -s -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: GET" -X OPTIONS http://localhost:8000/api/workshops -v 2>&1 | grep -i "access-control-allow-origin")
if echo "$CORS_TEST" | grep -q "localhost:5173"; then
    echo "   ✅ CORS configured correctly for localhost:5173"
else
    echo "   ⚠️  CORS may not be configured correctly"
    echo "   $CORS_TEST"
fi

echo ""
echo "🌐 Access URLs:"
echo "   Frontend: http://localhost:5173"
echo "   Backend API: http://localhost:8000"
echo "   Backend Docs: http://localhost:8000/docs"
echo ""
echo "💡 If the application is not loading:"
echo "   1. Open http://localhost:5173 in your browser"
echo "   2. Check browser console for errors (F12)"
echo "   3. Try clearing browser cache (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)"
echo "   4. Check if any browser extensions are blocking the connection"
