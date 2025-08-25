import { NextResponse } from "next/server";

export function createErrorResponse(message: string, status: number = 400) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

const requestCounts = new Map<string, { count: number; timestamp: number; hourlyCount: number; hourlyTimestamp: number }>();

export function checkRateLimit(ip: string, maxPerMinute: number, maxPerHour: number): boolean {
  const now = Date.now();
  const requestData = requestCounts.get(ip);

  if (!requestData || now - requestData.timestamp > 60 * 1000) {
    // Reset per-minute counter
    const hourlyCount = requestData ? requestData.hourlyCount : 0;
    const hourlyTimestamp = requestData ? requestData.hourlyTimestamp : now;
    
    requestCounts.set(ip, { 
      count: 1, 
      timestamp: now,
      hourlyCount: hourlyCount + 1,
      hourlyTimestamp: hourlyTimestamp
    });
    
    // Check hourly limit
    if (now - hourlyTimestamp > 60 * 60 * 1000) {
      // Reset hourly counter
      requestCounts.set(ip, { 
        count: 1, 
        timestamp: now,
        hourlyCount: 1,
        hourlyTimestamp: now
      });
    } else if (hourlyCount >= maxPerHour) {
      return false; // Hourly limit exceeded
    }
    
    return true;
  }

  if (requestData.count >= maxPerMinute) {
    return false; // Per-minute limit exceeded
  }

  requestData.count++;
  requestData.hourlyCount++;
  return true;
}

export function isValidDeviceId(deviceId: string): boolean {
  // Accept both UUID format and fingerprint format (hash-uuid)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const fingerprintRegex = /^[0-9a-f]+-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  return uuidRegex.test(deviceId) || fingerprintRegex.test(deviceId);
}