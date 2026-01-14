# TattooPro Infrastructure Fixes Report

## Project Status Assessment

This document outlines the required fixes to make the tattopro-web repository production-ready for full deployment on Yandex Cloud.

## Issues Found

### Issue #1: Missing Backend Dockerfile

**Status**: ❌ NOT FOUND
**Severity**: HIGH
**Impact**: Backend application cannot be containerized for deployment

**Current State**: 
- Backend folder exists with Node.js/Express application
- No Dockerfile present in `backend/` directory
- Cannot build Docker image for backend service

**Solution**: Create Dockerfile for backend application

---

## FIX #1: Create Backend Dockerfile

**File Location**: `backend/Dockerfile`
**File Type**: New file
**Place**: Create new file in the `backend/` directory (alongside package.json)

**Copy this entire block and paste it into the new Dockerfile:**

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY .npmrc ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src
COPY prisma ./prisma
COPY tsconfig.json ./

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init to handle signals properly
RUN apk add --no-cache dumb-init

# Copy package files
COPY package*.json ./
COPY .npmrc ./

# Install production dependencies only
RUN npm ci --production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy Prisma schema
COPY prisma ./prisma

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "start"]
```

---

### Issue #2: Missing Frontend Dockerfile

**Status**: ❌ NOT FOUND
**Severity**: HIGH
**Impact**: Frontend cannot be containerized for deployment

**Current State**:
- Frontend folder with Next.js application
- No Dockerfile present in `frontend/` directory
- Cannot build Docker image for frontend service

**Solution**: Create Dockerfile for frontend application

---

## FIX #2: Create Frontend Dockerfile

**File Location**: `frontend/Dockerfile`
**File Type**: New file
**Place**: Create new file in the `frontend/` directory (alongside package.json)

**Copy this entire block and paste it into the new Dockerfile:**

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY .npmrc ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build Next.js application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install dumb-init to handle signals properly
RUN apk add --no-cache dumb-init

# Copy package files
COPY package*.json ./
COPY .npmrc ./

# Install production dependencies only
RUN npm ci --production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "start"]
```

---

### Issue #3: Incomplete docker-compose.yml

**Status**: ⚠️ PARTIAL
**Severity**: HIGH
**Impact**: Docker Compose cannot orchestrate full application stack

**Current State**:
- `backend/docker-compose.yml` exists
- Only contains PostgreSQL database service
- Missing backend application service
- Missing frontend application service
- No network configuration

**Solution**: Add backend and frontend services to docker-compose.yml

---

## FIX #3: Update docker-compose.yml

**File Location**: `backend/docker-compose.yml`
**File Type**: Existing file (modify)
**Place**: After the `services:` section, after the `db:` service definition (around line 17, after the closing `}`)

**ADD THIS ENTIRE BLOCK after the database service and before the closing `volumes:` section:**

```yaml
  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: tattopro-api
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://${POSTGRES_USER:-pierc_user}:${POSTGRES_PASSWORD:-pierc_pass}@db:5432/${POSTGRES_DB:-pierc_db}
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=http://localhost:3000
    depends_on:
      - db
    volumes:
      - ./src:/app/src
      - ./prisma:/app/prisma
    networks:
      - tattopro-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s
    restart: unless-stopped

  web:
    build:
      context: ../frontend
      dockerfile: Dockerfile
    container_name: tattopro-web
    ports:
      - "3001:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=http://localhost:3000
    depends_on:
      - api
    networks:
      - tattopro-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 10s
    restart: unless-stopped
```

**ALSO ADD THIS NETWORK DEFINITION** at the end of the file (after the `volumes:` section, around line 17-18):

```yaml
networks:
  tattopro-network:
    driver: bridge
```

**ALSO MODIFY the `db:` service** to add the network configuration. Add this line after `volumes:` in the db service:

```yaml
    networks:
      - tattopro-network
```

---

### Issue #4: Missing CI/CD Configuration

**Status**: ❌ NOT FOUND
**Severity**: MEDIUM
**Impact**: No automated testing, building, or deployment pipeline

**Current State**:
- No GitHub Actions workflows
- No GitLab CI configuration
- No automated deployment pipeline

**Solution**: Will be addressed in separate GitHub Actions setup

---

## Implementation Checklist

- [ ] Create `backend/Dockerfile` (FIX #1)
- [ ] Create `frontend/Dockerfile` (FIX #2)
- [ ] Update `backend/docker-compose.yml` with api and web services (FIX #3)
- [ ] Add networks section to docker-compose.yml
- [ ] Test Docker build locally: `docker-compose build`
- [ ] Test Docker Compose: `docker-compose up`
- [ ] Verify backend health check at http://localhost:3000/health
- [ ] Verify frontend at http://localhost:3001

---

## Deployment Order

1. **Create Dockerfiles** (FIX #1 and FIX #2) - Enables containerization
2. **Update docker-compose.yml** (FIX #3) - Enables orchestration
3. **Test locally** - Verify Docker builds and containers run
4. **Push to repository** - Commit all changes
5. **Build on Yandex Cloud** - Push images to registry
6. **Deploy to production** - Run on Yandex Cloud VM

---

## Notes

- All Dockerfiles use multi-stage builds for smaller final images
- Both use Alpine Linux for reduced image size
- Health checks are configured for both services
- Services run as non-root user (security best practice)
- `dumb-init` is used to properly handle signals in containers
- Network isolation via custom bridge network

---

## References

- Backend Deployment Guide: `DEPLOYMENT_GUIDE.md`
- Docker Documentation: https://docs.docker.com/
- Docker Compose: https://docs.docker.com/compose/
- Yandex Cloud Container Registry: https://cloud.yandex.com/docs/container-registry/
