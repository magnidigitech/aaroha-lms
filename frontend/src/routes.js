/**
 * Centralized Route & View Configuration for Aaroha LMS
 * Defines canonical application routes, homepage route, and role-based dashboard mapping.
 */

export const ROUTES = {
  CATALOG: 'catalog',
  STUDENT: 'student',
  ADMIN: 'admin',
  DEGREES: 'degrees',
  BROCHURE: 'course-brochure',
  CLASSROOM: 'course-classroom'
};

// Application configured homepage route
export const HOMEPAGE_ROUTE = ROUTES.CATALOG;

// Canonical URL search query parameter for active view
export const VIEW_PARAM_KEY = 'view';

// List of faculty and administrative roles authorised for the administrative console
export const FACULTY_ROLES = [
  'super_admin',
  'admin',
  'coordinator',
  'placement_officer',
  'faculty',
  'instructor'
];

/**
 * Returns whether a role has faculty/administrative clearance.
 * @param {string} role
 * @returns {boolean}
 */
export function isFacultyRole(role) {
  return FACULTY_ROLES.includes(String(role || '').toLowerCase());
}

/**
 * Resolves the authorised role-based dashboard view for an authenticated user.
 * - Admin/Faculty/Coordinator/Placement -> 'admin'
 * - Student/Learner -> 'student'
 * - Guest/Unauthenticated -> 'catalog' (homepage)
 * @param {object|null} user
 * @returns {string} Target view identifier
 */
export function getAuthorizedDashboardView(user) {
  if (!user) return HOMEPAGE_ROUTE;
  const role = (user.role || '').toLowerCase();
  if (isFacultyRole(role)) {
    return ROUTES.ADMIN;
  }
  return ROUTES.STUDENT;
}

/**
 * Reads the active view from the browser URL search params.
 * Falls back to null if no recognized view is in the URL.
 * @returns {string|null}
 */
export function getViewFromUrl() {
  try {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const view = params.get(VIEW_PARAM_KEY);
    if (view && Object.values(ROUTES).includes(view)) {
      return view;
    }
    // Backward compatibility for course-detail alias
    if (view === 'course-detail') return ROUTES.BROCHURE;
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Synchronizes the browser URL query parameter with the active view.
 * Uses history.pushState or history.replaceState without page reloads.
 * Homepage ('catalog') clears the query param for a clean root URL '/'.
 * @param {string} view
 * @param {boolean} replace - Use replaceState instead of pushState
 */
export function updateViewUrl(view, replace = false) {
  try {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const currentView = params.get(VIEW_PARAM_KEY);

    if (view === HOMEPAGE_ROUTE) {
      params.delete(VIEW_PARAM_KEY);
    } else {
      params.set(VIEW_PARAM_KEY, view);
    }

    const newQuery = params.toString();
    const newPath = window.location.pathname + (newQuery ? ('?' + newQuery) : '') + window.location.hash;

    if (replace || currentView === view) {
      window.history.replaceState({ view }, document.title, newPath);
    } else {
      window.history.pushState({ view }, document.title, newPath);
    }
  } catch (e) {
    console.warn('URL update skipped:', e);
  }
}

