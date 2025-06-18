# Use an official Node.js runtime as a parent image
FROM node:18-alpine AS development

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock or pnpm-lock.yaml)
COPY package*.json ./

# Install project dependencies
RUN npm install

# Copy the rest of the application's source code from the context
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# --- Production image ---
FROM node:18-alpine AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install --only=production

# Copy built application and Prisma files from the development stage
COPY --from=development /usr/src/app/dist ./dist
COPY --from=development /usr/src/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=development /usr/src/app/prisma ./prisma

# Expose the port the app runs on
EXPOSE 3000

# Define the command to run the application
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
