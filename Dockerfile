# ==============================================================================
# Aaroha LMS - Production Multi-Stage Dockerfile for Coolify
# Automated CI/CD Webhook Build & Deployment
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build React Frontend
# ------------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Install frontend dependencies
COPY frontend/package*.json ./
RUN npm install

# Build static assets
COPY frontend/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production PHP 8.2 Apache Web Server & REST API
# ------------------------------------------------------------------------------
FROM php:8.2-apache

# Install PDO MySQL driver and enable Apache modules
RUN docker-php-ext-install pdo pdo_mysql \
    && a2enmod rewrite headers

# Configure Apache virtual host permissions & .htaccess overrides
RUN echo '<Directory /var/www/html>' > /etc/apache2/conf-available/aaroha.conf \
    && echo '    Options -Indexes +FollowSymLinks' >> /etc/apache2/conf-available/aaroha.conf \
    && echo '    AllowOverride All' >> /etc/apache2/conf-available/aaroha.conf \
    && echo '    Require all granted' >> /etc/apache2/conf-available/aaroha.conf \
    && echo '</Directory>' >> /etc/apache2/conf-available/aaroha.conf \
    && a2enconf aaroha

WORKDIR /var/www/html

# Copy backend PHP REST API into /var/www/html/api/
COPY backend/ /var/www/html/api/

# Copy compiled React frontend into root /var/www/html/
COPY --from=frontend-builder /app/dist/ /var/www/html/

# Copy root .htaccess for React SPA routing
COPY frontend/public/.htaccess /var/www/html/.htaccess

# Ensure proper permissions for Apache user
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html

EXPOSE 80

CMD ["apache2-foreground"]
