# MergeGuard Frontend Dockerfile
# Stage 1: Build
FROM node:20-slim AS build

WORKDIR /app

# Install dependencies
COPY frontend/package.json ./
RUN npm install

EXPOSE 5173
EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
# Copy source and build
COPY frontend/ ./
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:stable-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Use custom nginx.conf for API proxying and routing
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
