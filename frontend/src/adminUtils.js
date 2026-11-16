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
