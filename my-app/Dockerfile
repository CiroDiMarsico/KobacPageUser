# Etapa 1: Compilacion de React
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Etapa 2: Servidor Nginx
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html