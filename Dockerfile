FROM nginx

COPY  dist /usr/share/nginx/html/

# Copy a configuration file from the current directory
COPY  nginx.conf /etc/nginx/

# RUN service nginx start
# Expose ports
# EXPOSE 80

# ENTRYPOINT ["bash", "/usr/share/nginx/html/changeIP.sh"]
