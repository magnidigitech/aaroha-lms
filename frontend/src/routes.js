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
  'accounts',
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
 * Reads the active view from the browser URL search params and pathname.
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

    // Check direct pathname
    const rawPath = (window.location.pathname || '').replace(/\/+$/, '').toLowerCase();
    if (rawPath === '/admin') return ROUTES.ADMIN;
    if (rawPath === '/student') return ROUTES.STUDENT;
    if (rawPath === '/degrees') return ROUTES.DEGREES;
    if (rawPath === '/catalog' || rawPath === '/courses') return ROUTES.CATALOG;
    if (rawPath === '/brochure') return ROUTES.BROCHURE;
    if (rawPath === '/classroom') return ROUTES.CLASSROOM;

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

    // When navigating away from admin, prune admin-specific subparams
    if (currentView === ROUTES.ADMIN && view !== ROUTES.ADMIN) {
      params.delete('tab');
      params.delete('module');
      params.delete('student');
      params.delete('faculty');
      params.delete('batch');
      params.delete('ticket');
      params.delete('drawer');
      params.delete('subtab');
    }

    // When navigating away from classroom / brochure, prune lesson param
    if ((currentView === ROUTES.CLASSROOM || currentView === ROUTES.BROCHURE) && 
        view !== ROUTES.CLASSROOM && view !== ROUTES.BROCHURE) {
      params.delete('lesson');
      params.delete('course');
    }

    const newQuery = params.toString();
    const newPath = window.location.pathname + (newQuery ? ('?' + newQuery) : '') + window.location.hash;

    if (replace || currentView === view) {
      window.history.replaceState({ ...(window.history.state || {}), view }, document.title, newPath);
    } else {
      window.history.pushState({ ...(window.history.state || {}), view }, document.title, newPath);
    }
  } catch (e) {
    console.warn('URL update skipped:', e);
  }
}

/**
 * Reads a single query parameter from current URL.
 * @param {string} key
 * @param {string|null} defaultValue
 * @returns {string|null}
 */
export function getRouteParam(key, defaultValue = null) {
  try {
    if (typeof window === 'undefined') return defaultValue;
    const params = new URLSearchParams(window.location.search);
    const val = params.get(key);
    return val !== null ? val : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

/**
 * Sets or updates a single query parameter in browser URL without reloading.
 * @param {string} key
 * @param {string|number|null} value
 * @param {boolean} replace
 */
export function setRouteParam(key, value, replace = true) {
  try {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (value === null || value === undefined || value === '') {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
    const newQuery = params.toString();
    const newPath = window.location.pathname + (newQuery ? ('?' + newQuery) : '') + window.location.hash;
    if (replace) {
      window.history.replaceState(window.history.state, document.title, newPath);
    } else {
      window.history.pushState(window.history.state, document.title, newPath);
    }
  } catch (e) {
    console.warn('setRouteParam error:', e);
  }
}

/**
 * Removes a single query parameter from the URL.
 * @param {string} key
 * @param {boolean} replace
 */
export function removeRouteParam(key, replace = true) {
  setRouteParam(key, null, replace);
}

/**
 * Atomically sets or removes multiple query parameters in a single history call.
 * @param {Record<string, string|number|null|undefined>} paramsObj
 * @param {boolean} replace
 */
export function setRouteParams(paramsObj = {}, replace = true) {
  try {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    Object.entries(paramsObj).forEach(([k, v]) => {
      if (v === null || v === undefined || v === '') {
        params.delete(k);
      } else {
        params.set(k, String(v));
      }
    });
    const newQuery = params.toString();
    const newPath = window.location.pathname + (newQuery ? ('?' + newQuery) : '') + window.location.hash;
    if (replace) {
      window.history.replaceState(window.history.state, document.title, newPath);
    } else {
      window.history.pushState(window.history.state, document.title, newPath);
    }
  } catch (e) {
    console.warn('setRouteParams error:', e);
  }
}


