# Étape 1 : Build de l'application React
FROM node:20-alpine AS builder

WORKDIR /app

# Installation des dépendances
COPY package*.json ./
RUN npm install

# Build du projet
COPY . .
RUN npm run build

# Étape 2 : Serveur Nginx avec HTTPS
FROM nginx:alpine

# Installation de openssl pour générer les certificats auto-signés
RUN apk add --no-cache openssl

# Génération du certificat SSL auto-signé
RUN mkdir -p /etc/nginx/certs && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/certs/server.key \
    -out /etc/nginx/certs/server.crt \
    -subj "/C=MA/ST=State/L=City/O=PFE/CN=localhost"

# Configuration Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copier les fichiers statiques de React
COPY --from=builder /app/dist /usr/share/nginx/html

# Exposer HTTP et HTTPS
EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
