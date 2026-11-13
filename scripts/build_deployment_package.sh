#!/usr/bin/env bash
set -euo pipefail

# Aaroha LMS - Hostinger Production Deployment Packager
# Target Domain: lms.aaroha-inc.com
# Generates a pristine, production-ready artifact directory and zip bundle.
# Excludes: tests, development fixtures, seeded sample users, sqlite files, local credentials.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACKAGE_DIR="${ROOT_DIR}/deploy-package"
ZIP_FILE="${ROOT_DIR}/aaroha-lms-production-package.zip"

echo "================================================================"
echo "  AAROHA LMS - BUILDING HOSTINGER PRODUCTION DEPLOYMENT PACKAGE "
echo "================================================================"

# 1. Clean previous build artifacts
rm -rf "${PACKAGE_DIR}" "${ZIP_FILE}"
mkdir -p "${PACKAGE_DIR}/public_html/api"
mkdir -p "${PACKAGE_DIR}/database/migrations"

# 2. Build Frontend Production Assets
echo "-> Building frontend production bundle..."
(cd "${ROOT_DIR}/frontend" && npm run build)

# 3. Copy compiled SPA assets to public_html root
echo "-> Copying static SPA assets..."
cp -R "${ROOT_DIR}/frontend/dist/"* "${PACKAGE_DIR}/public_html/"

# 4. Generate root Apache / LiteSpeed .htaccess for Single Page App & security
echo "-> Generating public_html/.htaccess..."
cat << 'EOF' > "${PACKAGE_DIR}/public_html/.htaccess"
# Aaroha LMS - Production Apache / LiteSpeed Root Configuration
# Target Domain: lms.aaroha-inc.com

Options -Indexes
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # 1. Delegate /api/* requests directly to backend handler (do not rewrite to index.html)
  RewriteRule ^api/ - [L]

  # 2. Block direct HTTP access to hidden files and version control directories
  RewriteRule (^\.|\/\.) - [F,L]

  # 3. Serve existing physical static files (JS, CSS, images, fonts)
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # 4. Route all client-side navigation requests to SPA index.html
  RewriteRule ^ index.html [L]
</IfModule>

# Security Headers
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set X-Frame-Options "SAMEORIGIN"
  Header set X-XSS-Protection "1; mode=block"
  Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>
EOF

# 5. Assemble PHP 8.x Backend into public_html/api/
echo "-> Assembling backend API services..."
cp "${ROOT_DIR}/backend/index.php" "${PACKAGE_DIR}/public_html/api/"
cp "${ROOT_DIR}/backend/.htaccess" "${PACKAGE_DIR}/public_html/api/"

# Backend controllers
mkdir -p "${PACKAGE_DIR}/public_html/api/controllers"
cp "${ROOT_DIR}/backend/controllers/"*.php "${PACKAGE_DIR}/public_html/api/controllers/"

# Backend middleware
mkdir -p "${PACKAGE_DIR}/public_html/api/middleware"
cp "${ROOT_DIR}/backend/middleware/"*.php "${PACKAGE_DIR}/public_html/api/middleware/"

# Backend services
mkdir -p "${PACKAGE_DIR}/public_html/api/services"
cp "${ROOT_DIR}/backend/services/"*.php "${PACKAGE_DIR}/public_html/api/services/"

# Backend config (ONLY database.php, jwt.php, env.php.example, and .htaccess)
mkdir -p "${PACKAGE_DIR}/public_html/api/config"
cp "${ROOT_DIR}/backend/config/database.php" "${PACKAGE_DIR}/public_html/api/config/"
cp "${ROOT_DIR}/backend/config/jwt.php" "${PACKAGE_DIR}/public_html/api/config/"
cp "${ROOT_DIR}/backend/config/env.php.example" "${PACKAGE_DIR}/public_html/api/config/"
cp "${ROOT_DIR}/backend/config/.htaccess" "${PACKAGE_DIR}/public_html/api/config/"

# 6. Assemble Clean Database DDL & Migrations
echo "-> Assembling clean database schema and migrations..."
cp "${ROOT_DIR}/database/schema.sql" "${PACKAGE_DIR}/database/"
cp "${ROOT_DIR}/database/migrate.php" "${PACKAGE_DIR}/database/"
cp "${ROOT_DIR}/database/.htaccess" "${PACKAGE_DIR}/database/"
cp "${ROOT_DIR}/database/migrations/"*.sql "${PACKAGE_DIR}/database/migrations/"

# 7. Verification: Audit package contents for excluded files or credentials
echo "-> Auditing package contents..."
# Must NOT contain tests
if [ -d "${PACKAGE_DIR}/public_html/api/tests" ]; then
    echo "ERROR: tests leaked into package!" >&2
    exit 1
fi
# Must NOT contain sqlite database files
if find "${PACKAGE_DIR}" -name "*.sqlite*" | grep -q .; then
    echo "ERROR: SQLite files leaked into package!" >&2
    exit 1
fi
# Must NOT contain actual env.php
if [ -f "${PACKAGE_DIR}/public_html/api/config/env.php" ]; then
    echo "ERROR: Local env.php leaked into package!" >&2
    exit 1
fi

# 8. Create compressed ZIP bundle
echo "-> Compressing into ${ZIP_FILE}..."
(cd "${PACKAGE_DIR}" && zip -r -q "${ZIP_FILE}" .)

echo "================================================================"
echo "  SUCCESS: Deployment package built cleanly!                    "
echo "  Directory: ${PACKAGE_DIR}                                     "
echo "  ZIP Bundle: ${ZIP_FILE} ($(du -h "${ZIP_FILE}" | cut -f1))   "
echo "================================================================"

