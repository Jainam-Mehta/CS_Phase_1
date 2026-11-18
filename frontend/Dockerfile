# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application with env vars
ARG VITE_SUPABASE_URL=https://vzoypfctadgyflzwodmp.supabase.co
ARG VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6b3lwZmN0YWRneWZsendvZG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNDc5NzcsImV4cCI6MjEwMDcyMzk3N30.oL-WZUgX2FQ2hvmahkDkqQLCuqdGoctrZiN8BtFw6y8

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine

WORKDIR /app

# Install serve to run static files
RUN npm install -g serve

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Create a simple server.json config for serve
RUN echo '{\n  "rewrites": [\n    {\n      "source": "**",\n      "destination": "/index.html"\n    }\n  ]\n}' > server.json

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start the application
CMD ["serve", "-s", "dist", "-l", "3000"]
