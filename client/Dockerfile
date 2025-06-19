# Stage 1: Build the Vite application
FROM node:18-alpine AS build

WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock or pnpm-lock.yaml)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:stable-alpine AS production

# Copy built assets from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy the Nginx configuration file
# This file will be created in the next step of the plan
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 3000 (as the client runs on 3000)
EXPOSE 3000

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
