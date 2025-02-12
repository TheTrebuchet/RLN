# Use the Node.js image as the base
# FROM node:16-alpine
FROM node:18-bullseye-slim

# Install required packages
RUN apt-get update && \
    apt-get install -y openbabel && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy application files
COPY package.json package-lock.json ./
COPY . .
RUN npm install

# Expose the server port
EXPOSE 3000

# Command to start the server
CMD ["node", "server.js"]
