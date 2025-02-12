# Use the official Nginx image
FROM nginx:alpine

# Set working directory
WORKDIR /usr/share/nginx/html

# Remove default Nginx content
RUN rm -rf ./*

# Copy website files into the container
COPY app/index.html .
COPY app/style.css .
COPY app/script.js .
COPY ./app/chemdoodle chemdoodle
COPY ./app/node_modules/@rdkit node_modules/@rdkit
COPY ./app/node_modules/bootstrap node_modules/bootstrap

# Copy the custom Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
