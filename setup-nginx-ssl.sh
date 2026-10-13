#!/bin/bash
# Script para configurar nginx + SSL (Let's Encrypt) no AWS EC2
# Uso: sudo ./setup-nginx-ssl.sh seu-dominio.com

set -e

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
  echo "Erro: Domínio não fornecido"
  echo "Uso: sudo ./setup-nginx-ssl.sh seu-dominio.com"
  exit 1
fi

echo "=== Configurando nginx + SSL para $DOMAIN ==="

# Atualizar sistema
apt-get update -y

# Instalar nginx e certbot
apt-get install -y nginx certbot python3-certbot-nginx

# Configurar nginx para a aplicação
cat > /etc/nginx/sites-available/birthhub360 <<'EOF'
# Configuração nginx para Birth Hub 360
server {
    listen 80;
    server_name _;

    # Redirecionar HTTP para HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name _;

    # Configurações SSL (serão substituídas pelo certbot)
    ssl_certificate /etc/letsencrypt/live/DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/DOMAIN/privkey.pem;

    # Headers de segurança
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Raiz do frontend SPA
    root /home/ubuntu/birthhub-360/dist;
    index index.html;

    # Fallback SPA para permitir recarregamento (F5) e acesso direto por link sem retornar erro 403/500
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy para a API Node.js
    location /api/ {
        proxy_pass http://localhost:3024;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3024;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Substituir DOMAIN pelo domínio real
sed -i "s/DOMAIN/$DOMAIN/g" /etc/nginx/sites-available/birthhub360

# Remover configuração default
rm -f /etc/nginx/sites-enabled/default

# Habilitar configuração
ln -sf /etc/nginx/sites-available/birthhub360 /etc/nginx/sites-enabled/

# Testar configuração nginx
nginx -t

# Reiniciar nginx
systemctl restart nginx

# Obter certificado SSL com certbot
echo "=== Obtendo certificado SSL para $DOMAIN ==="
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

# Configurar renovação automática
echo "=== Configurando renovação automática do certificado ==="
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

# Ajustar configuração nginx para o domínio real
cat > /etc/nginx/sites-available/birthhub360 <<EOF
# Configuração nginx para Birth Hub 360
server {
    listen 80;
    server_name $DOMAIN;

    # Redirecionar HTTP para HTTPS
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    # Configurações SSL do certbot
    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Headers de segurança
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Raiz do frontend SPA
    root /home/ubuntu/birthhub-360/dist;
    index index.html;

    # Fallback SPA para permitir recarregamento (F5) e acesso direto por link sem retornar erro 403/500
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Proxy para a API Node.js
    location /api/ {
        proxy_pass http://localhost:3024;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3024;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Testar configuração nginx novamente
nginx -t

# Reiniciar nginx
systemctl restart nginx

echo "=== Configuração concluída com sucesso ==="
echo "Sua aplicação agora está disponível em: https://$DOMAIN"
echo "Certificado SSL configurado e renovação automática ativada"
