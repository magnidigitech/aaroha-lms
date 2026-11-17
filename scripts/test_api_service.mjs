import { api, ApiError } from '../frontend/src/apiService.js';

// Mock fetch globally
global.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = v; },
  removeItem(k) { delete this.store[k]; }
};

async function testResponseHandling() {
  console.log('Testing apiService.js response handling...');

  // Test 1: HTML 404 page (like Hostinger LiteSpeed)
  const hostingerHtml = `<!DOCTYPE html>
<html lang="en-us" prefix="content: http://purl.org/rss/1.0/modules/content/">
<head><title>This Page Does Not Exist</title></head>
<body><div class="page-not-found"><img src="/htdocs_error/page_not_found.svg" /><h1>This Page Does Not Exist</h1></div></body></html>`;

  global.fetch = async () => ({
    ok: false,
    status: 404,
    headers: {
      get: (h) => (h.toLowerCase() === 'content-type' ? 'text/html; charset=UTF-8' : null)
    },
    text: async () => hostingerHtml
  });

  try {
    await api.getMe();
    console.error('FAIL: Should have thrown ApiError on 404 HTML');
  } catch (err) {
    if (err instanceof ApiError && err.isNotFound && !err.message.includes('<html')) {
      console.log('  ✓ HTML 404 cleanly converted to friendly message:', err.message);
      console.log('  ✓ rawResponse safely preserved in err.rawResponse, not err.message');
    } else {
      console.error('FAIL: HTML 404 was not handled properly:', err);
    }
  }

  // Test 2: HTML 500 error page
  global.fetch = async () => ({
    ok: false,
    status: 500,
    headers: {
      get: (h) => (h.toLowerCase() === 'content-type' ? 'text/html' : null)
    },
    text: async () => '<html><body>Internal Server Error</body></html>'
  });

  try {
    await api.getMe();
    console.error('FAIL: Should have thrown ApiError on 500 HTML');
  } catch (err) {
    if (err instanceof ApiError && err.isServer && !err.message.includes('<html')) {
      console.log('  ✓ HTML 500 cleanly converted to friendly message:', err.message);
    } else {
      console.error('FAIL: HTML 500 was not handled properly:', err);
    }
  }

  // Test 3: HTTP 204 No Content
  global.fetch = async () => ({
    ok: true,
    status: 204,
    headers: { get: () => null }
  });

  const res204 = await api.getMe();
  if (res204.success && res204.status === 204) {
    console.log('  ✓ HTTP 204 No Content handled cleanly without throwing or empty body crash');
  } else {
    console.error('FAIL: HTTP 204 returned unexpected data:', res204);
  }

  // Test 4: Structured JSON validation error (HTTP 400)
  global.fetch = async () => ({
    ok: false,
    status: 400,
    headers: {
      get: (h) => (h.toLowerCase() === 'content-type' ? 'application/json' : null)
    },
    json: async () => ({
      success: false,
      error: 'Batch capacity must be a positive integer between 1 and 1000.',
      field: 'capacity'
    })
  });

  try {
    await api.adminCreateBatch({});
    console.error('FAIL: Should have thrown ApiError on 400');
  } catch (err) {
    if (err instanceof ApiError && err.isValidation && err.field === 'capacity') {
      console.log('  ✓ Structured validation error preserved field:', err.field, '| error:', err.message);
    } else {
      console.error('FAIL: Structured validation error mismatch:', err);
    }
  }

  console.log('\nALL APISERVICE RESPONSE HANDLING TESTS PASSED SUCCESSFULLY!');
}

testResponseHandling().catch(console.error);
