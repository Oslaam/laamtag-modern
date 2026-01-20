# 1. Use a Node 20 image that includes build tools
FROM node:20-slim

# 2. Install Python, Make, and G++
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 3. Copy package files
COPY package*.json ./

# 4. Install dependencies
RUN npm install --legacy-peer-deps

# 5. Copy the rest of your code
COPY . .

# 6. Build the Next.js app
RUN npm run build

### --- NEW SECTION: PREPARE STANDALONE ASSETS --- ###
# Copy the static files into the standalone folder so they can be served
RUN cp -r .next/static .next/standalone/.next/static
RUN cp -r public .next/standalone/public
### ---------------------------------------------- ###

# 7. Expose the port Railway uses
EXPOSE 8080

# 8. Start the standalone server
# We use the absolute path to ensure node finds the server
CMD ["node", ".next/standalone/server.js"]