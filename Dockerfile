FROM php:8.3-fpm

# Install Nginx and Supervisor, and GD dependencies
RUN apt-get update && apt-get install -y \
    nginx \
    supervisor \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) gd \
    && rm -rf /var/lib/apt/lists/*

# Nginx & PHP-FPM Configuration
COPY nginx-site.conf /etc/nginx/sites-available/default
RUN echo "[www]\nlisten = /var/run/php-fpm.sock\nlisten.owner = www-data\nlisten.group = www-data\nlisten.mode = 0660" > /usr/local/etc/php-fpm.d/zzz-custom.conf
RUN echo "[supervisord]\nnodaemon=true\n[program:nginx]\ncommand=nginx -g 'daemon off;'\nautostart=true\nautorestart=true\nstdout_logfile=/dev/stdout\nstdout_logfile_maxbytes=0\nstderr_logfile=/dev/stderr\nstderr_logfile_maxbytes=0\n[program:php-fpm]\ncommand=php-fpm -F\nautostart=true\nautorestart=true\nstdout_logfile=/dev/stdout\nstdout_logfile_maxbytes=0\nstderr_logfile=/dev/stderr\nstderr_logfile_maxbytes=0" > /etc/supervisor/conf.d/supervisord.conf

# Copy app code (including the Git symlinks)
COPY src/ /var/www/html/
# Fix the sticky bit and symlink ownership to prevent Linux kernel panics
RUN chmod 0755 /var/www/html && \
    chown -h www-data:www-data /var/www/html/wiki.d && \
    chown -h www-data:www-data /var/www/html/pub/uploads

# Copy data folder to a temporary "seed" location
COPY data/ /initial-data/

# Startup script
RUN echo '#!/bin/bash\n\
# Ensure the destination folder exists (crucial for local testing)\n\
mkdir -p /var/www/data\n\
\n\
# 2. If the wiki.d folder is missing, populate the volume with our seed data\n\
if [ ! -d "/var/www/data/wiki.d" ]; then\n\
  echo "First boot detected. Seeding persistent volume..."\n\
  cp -a /initial-data/. /var/www/data/\n\
fi\n\
\n\
# Ensure Nginx/PHP has permission to write to the volume\n\
chown -R www-data:www-data /var/www/data\n\
\n\
# Start the server\n\
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf' > /start.sh && chmod +x /start.sh

CMD ["/start.sh"]
