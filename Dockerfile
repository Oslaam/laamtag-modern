# 1. Use a Node 20 image that includes build tools
FROM node:20-slim

# 2. Install Python, Make, and G++ (needed for the 'usb' package error)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 3. Copy package files first for better caching
COPY package*.json ./

# 4. Install dependencies with the legacy flag to allow React 19 conflicts
RUN npm install --legacy-peer-deps

# 5. Copy the rest of your code
COPY . .

# 6. Build the Next.js app
RUN npm run build

# 7. Expose the port Railway uses
EXPOSE 8080

# 8. Start the standalone server directly
# We use the array format for CMD to ensure it handles signals correctly
CMD ["node", ".next/standalone/server.js"]