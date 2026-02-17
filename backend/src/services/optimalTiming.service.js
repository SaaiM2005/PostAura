// services/optimalTiming.service.js

/**
 * Optimal Timing Service
 * Calculates the best times to post on social media for maximum engagement
 */

// Platform-specific optimal posting times (in 24-hour format)
const OPTIMAL_TIMES = {
    instagram: {
        weekday: [
            { start: 11, end: 13 }, // 11 AM - 1 PM
            { start: 19, end: 21 }, // 7 PM - 9 PM
        ],
        weekend: [
            { start: 10, end: 12 }, // 10 AM - 12 PM
        ],
    },
    twitter: {
        weekday: [
            { start: 8, end: 10 },  // 8 AM - 10 AM
            { start: 18, end: 21 }, // 6 PM - 9 PM
        ],
        weekend: [
            { start: 9, end: 11 },  // 9 AM - 11 AM
        ],
    },
};

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Get optimal time windows for a specific platform and date
 */
function getOptimalWindows(platform, date) {
    const platformTimes = OPTIMAL_TIMES[platform];
    if (!platformTimes) return [];

    return isWeekend(date) ? platformTimes.weekend : platformTimes.weekday;
}

/**
 * Find the next optimal time slot for a single platform
 */
export function getNextOptimalSlot(platform, fromDate = new Date()) {
    const searchDate = new Date(fromDate);
    const maxDaysToSearch = 7;

    for (let dayOffset = 0; dayOffset < maxDaysToSearch; dayOffset++) {
        const currentDate = new Date(searchDate);
        currentDate.setDate(currentDate.getDate() + dayOffset);

        const windows = getOptimalWindows(platform, currentDate);

        for (const window of windows) {
            const slotTime = new Date(currentDate);
            slotTime.setHours(window.start, 0, 0, 0);

            // Only consider future times
            if (slotTime > fromDate) {
                return slotTime;
            }

            // Try middle of the window if start time has passed
            const midTime = new Date(currentDate);
            midTime.setHours(Math.floor((window.start + window.end) / 2), 0, 0, 0);

            if (midTime > fromDate) {
                return midTime;
            }
        }
    }

    // Fallback: return tomorrow at 11 AM if no optimal slot found
    const fallback = new Date(fromDate);
    fallback.setDate(fallback.getDate() + 1);
    fallback.setHours(11, 0, 0, 0);
    return fallback;
}

/**
 * Find overlapping optimal time windows for multiple platforms
 */
function findOverlappingWindow(platforms, fromDate) {
    // Get the next optimal slot for each platform
    const platformSlots = platforms.map(platform => ({
        platform,
        slot: getNextOptimalSlot(platform, fromDate),
    }));

    // Find the earliest common time that works for all platforms
    // For simplicity, we'll use the latest of the earliest slots
    const latestSlot = platformSlots.reduce((latest, current) => {
        return current.slot > latest ? current.slot : latest;
    }, platformSlots[0].slot);

    return latestSlot;
}

/**
 * Calculate the optimal posting time for given platforms
 * @param {Array<string>} platforms - Array of platform names (e.g., ['instagram', 'twitter'])
 * @param {Date} fromDate - Starting date to search from (defaults to now)
 * @returns {Date} - The optimal posting time
 */
export function calculateOptimalTime(platforms = ['instagram'], fromDate = new Date()) {
    if (!platforms || platforms.length === 0) {
        platforms = ['instagram'];
    }

    // Normalize platform names
    const normalizedPlatforms = platforms.map(p => p.toLowerCase());

    if (normalizedPlatforms.length === 1) {
        return getNextOptimalSlot(normalizedPlatforms[0], fromDate);
    }

    // For multiple platforms, find overlapping windows
    return findOverlappingWindow(normalizedPlatforms, fromDate);
}

/**
 * Get human-readable description of why this time is optimal
 */
export function getOptimalTimeReason(platform, scheduledTime) {
    const hour = scheduledTime.getHours();
    const isWeekendDay = isWeekend(scheduledTime);
    const dayType = isWeekendDay ? 'weekend' : 'weekday';

    const windows = getOptimalWindows(platform, scheduledTime);
    const matchingWindow = windows.find(w => hour >= w.start && hour < w.end);

    if (matchingWindow) {
        return `Peak ${platform} engagement time on ${dayType}s (${matchingWindow.start}:00-${matchingWindow.end}:00)`;
    }

    return `Optimal posting time for ${platform}`;
}
