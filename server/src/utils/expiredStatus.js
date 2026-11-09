'use strict';

/**
 * Days before expiry at which a product is considered "mendekati expired".
 */
const WARNING_DAYS = 30;

/**
 * Calculate the expired status of a product based on its expiry date.
 *
 * Uses the Asia/Jakarta timezone (UTC+7) for the "today" reference so that
 * the result is consistent with the PostgreSQL trigger on the server.
 *
 * @param {string} expiredDate - ISO date string 'YYYY-MM-DD' from the DB.
 * @returns {'LAYAK_JUAL'|'MENDEKATI_EXPIRED'|'EXPIRED'}
 */
function calculateExpiredStatus(expiredDate) {
  if (!expiredDate) return 'EXPIRED';

  // Get today's date in Asia/Jakarta (UTC+7)
  const jakartaOffset = 7 * 60; // minutes
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60 * 1000;
  const jakartaMs = utcMs + jakartaOffset * 60 * 1000;
  const jakartaToday = new Date(jakartaMs);

  // Strip time portion to get a pure calendar date
  const todayYear = jakartaToday.getFullYear();
  const todayMonth = jakartaToday.getMonth();
  const todayDay = jakartaToday.getDate();
  const today = new Date(todayYear, todayMonth, todayDay);

  // Parse expired_date as local midnight (no timezone shift)
  const [year, month, day] = expiredDate.split('-').map(Number);
  const expiry = new Date(year, month - 1, day);

  const diffMs = expiry.getTime() - today.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'EXPIRED';
  if (diffDays <= WARNING_DAYS) return 'MENDEKATI_EXPIRED';
  return 'LAYAK_JUAL';
}

module.exports = { calculateExpiredStatus, WARNING_DAYS };
