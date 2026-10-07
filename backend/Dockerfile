FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY --from=builder /app/dist ./dist
COPY src/db/schema.sql ./dist/db/schema.sql
COPY src/db/seed.sql ./dist/db/seed.sql
EXPOSE 5000
CMD ["node", "dist/index.js"]
