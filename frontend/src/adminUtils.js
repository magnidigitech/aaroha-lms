// Aaroha LMS - Enterprise Admin Utilities
// Includes CSV injection sanitization, date/time formatting, and role authorization helpers

/**
 * Sanitizes a cell string to prevent CSV Formula Injection (CWE-1236)
 * If a cell begins with '=', '+', '-', '@', '\t', '\r', prefix it with a single quote.
 */
export function sanitizeCsvCell(value) {
  if (value === null || value === undefined) return '""';
  let str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  // Escape quotes
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Generates and triggers download of a sanitized CSV file
 */
export function exportToCsv(filename, headers, rows) {
  const headerLine = headers.map(h => sanitizeCsvCell(h.label || h)).join(',');
  const rowLines = rows.map(row => {
    if (Array.isArray(row)) {
      return row.map(sanitizeCsvCell).join(',');
    }
    return headers.map(h => {
      const key = h.key || h;
      return sanitizeCsvCell(row[key]);
    }).join(',');
  });

  const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Currency formatter - Plain text INR format (No dollar symbols)
 */
export function formatCurrency(amount, currency = 'INR') {
  const num = Number(amount) || 0;
  return `${currency} ${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/**
 * Date and time formatter defaulting to Asia/Kolkata
 */
export function formatDateTime(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return isoString;
  }
}

export function formatDate(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return isoString;
  }
}

/**
 * Calculates access expiry date using calendar arithmetic with defined month-end handling.
 * Ensures that adding months to Jan 31 clamps to Feb 28 (or 29 in leap year), Aug 31 + 1 month = Sep 30, etc.
 * @param {string|Date} startDate - ISO string or Date
 * @param {number} value - Positive whole number
 * @param {'days'|'months'|'years'} unit - Time unit
 * @returns {Date} Expiry Date at 23:59:59 in target date
 */
export function calculateAccessExpiry(startDate, value = 6, unit = 'months') {
  const d = startDate ? new Date(startDate) : new Date();
  const val = Math.max(1, parseInt(value, 10) || 1);
  const u = String(unit).toLowerCase();

  const year = d.getFullYear();
  const month = d.getMonth(); // 0-indexed: 0 = Jan, 11 = Dec
  const day = d.getDate();

  if (u === 'days' || u === 'day') {
    const res = new Date(d);
    res.setDate(res.getDate() + val);
    res.setHours(23, 59, 59, 999);
    return res;
  }

  if (u === 'years' || u === 'year') {
    const targetYear = year + val;
    const isLeap = (targetYear % 4 === 0 && targetYear % 100 !== 0) || (targetYear % 400 === 0);
    const targetDay = (month === 1 && day === 29 && !isLeap) ? 28 : day;
    return new Date(targetYear, month, targetDay, 23, 59, 59, 999);
  }

  // Months calendar arithmetic with month-end clipping
  const totalMonths = month + val;
  const targetYear = year + Math.floor(totalMonths / 12);
  const targetMonth = totalMonths % 12;
  // Day count of target month
  const maxDays = new Date(targetYear, targetMonth + 1, 0).getDate();
  const targetDay = Math.min(day, maxDays);
  return new Date(targetYear, targetMonth, targetDay, 23, 59, 59, 999);
}

/**
 * Derives access status, remaining days, and expiring soon indicator.
 */
export function getAccessWindowInfo(expiresAt) {
  if (!expiresAt) {
    return {
      isExpired: false,
      remainingDays: 999,
      isExpiringSoon: false,
      statusLabel: 'Active',
      statusColor: 'emerald'
    };
  }
  const exp = new Date(expiresAt);
  const now = new Date();
  const diffMs = exp.getTime() - now.getTime();
  const isExpired = diffMs <= 0;
  const remainingDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  const isExpiringSoon = !isExpired && remainingDays <= 14;

  let statusLabel = 'Active';
  let statusColor = 'emerald';
  if (isExpired) {
    statusLabel = 'Expired';
    statusColor = 'rose';
  } else if (isExpiringSoon) {
    statusLabel = 'Expiring Soon';
    statusColor = 'amber';
  }

  return {
    isExpired,
    remainingDays,
    isExpiringSoon,
    statusLabel,
    statusColor
  };
}

/**
 * Role-Based Access Control matrix for Admin Portal tabs
 * Note: Fees, payments, and accounts are excluded from interface navigation.
 */
export const ROLE_MODULE_PERMISSIONS = {
  super_admin: [
    'dashboard', 'students', 'faculty', 'courses', 'batches', 'schedule',
    'attendance', 'materials', 'assessments', 'announcements',
    'reports', 'certificates', 'placement', 'support', 'users', 'settings', 'audit', 'followups'
  ],
  admin: [
    'dashboard', 'students', 'faculty', 'courses', 'batches', 'schedule',
    'attendance', 'materials', 'assessments', 'announcements',
    'reports', 'certificates', 'placement', 'support', 'users', 'settings', 'audit', 'followups'
  ],
  coordinator: [
    'dashboard', 'students', 'faculty', 'courses', 'batches', 'schedule',
    'attendance', 'materials', 'assessments', 'announcements', 'reports',
    'certificates', 'support', 'followups'
  ],
  placement_officer: [
    'dashboard', 'students', 'placement', 'reports'
  ],
  faculty: [
    'dashboard', 'batches', 'schedule', 'attendance', 'materials',
    'assessments', 'support'
  ],
  student: [
    'dashboard'
  ]
};

export function canAccessModule(role, moduleKey) {
  const normalized = (role || 'student').toLowerCase();
  const allowed = ROLE_MODULE_PERMISSIONS[normalized] || ROLE_MODULE_PERMISSIONS.student;
  return allowed.includes(moduleKey);
}
