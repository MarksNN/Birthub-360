#!/bin/bash
# Script para configurar HTTPS no ambiente Docker existente

set -e

DOMAIN=${1:-app.birthhub360.com.br}

echo "=== Configurando HTTPS para ambiente Docker existente ==="
echo "Domínio: $DOMAIN"

# 1. Parar container atual que usa portas 80/443
echo "=== Parando container birthhub-app ==="
sudo docker stop birthhub-app || true
sudo docker rm birthhub-app || true

# 2. Instalar nginx e certbot se não estiverem instalados
echo "=== Verificando nginx/certbot ==="
if ! command -v nginx &> /dev/null; then
    sudo apt-get update -y
    sudo apt-get install -y nginx certbot python3-certbot-nginx
fi

# 3. Configurar nginx para HTTP (antes do SSL)
echo "=== Configurando nginx básico ==="
sudo cat > /etc/nginx/sites-available/birthhub360 <<'EOF'
server {
    listen 80;
    server_name _;

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

sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/birthhub360 /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 4. Recreate container sem expor portas 80/443 (apenas 3024)
echo "=== Recriando container da aplicação ==="
cd /home/ubuntu/app

# Atualizar .env para HTTPS
echo "=== Atualizando variáveis de ambiente ==="
cp .env .env.backup

# Atualizar configurações HTTPS
sed -i 's/TRUST_PROXY=false/TRUST_PROXY=true/g' .env || echo 'TRUST_PROXY=true' >> .env
sed -i "s|PUBLIC_BASE_URL=http://3.143.251.44|PUBLIC_BASE_URL=https://$DOMAIN|g" .env || echo "PUBLIC_BASE_URL=https://$DOMAIN" >> .env
sed -i "s|BETTER_AUTH_URL=http://3.143.251.44|BETTER_AUTH_URL=https://$DOMAIN|g" .env || echo "BETTER_AUTH_URL=https://$DOMAIN" >> .env
sed -i "s|ALLOWED_ORIGINS=http://3.143.251.44,https://3.143.251.44|ALLOWED_ORIGINS=https://$DOMAIN|g" .env || echo "ALLOWED_ORIGINS=https://$DOMAIN" >> .env
sed -i 's/SECURE_COOKIES=false/SECURE_COOKIES=true/g' .env || echo 'SECURE_COOKIES=true' >> .env

# Rebuild e start container apenas na porta 3024
sudo docker build -t birthhub-app .
sudo docker run -d \
  --name birthhub-app \
  --network app_default \
  --env-file .env \
  -p 3024:3024 \
  --restart unless-stopped \
  birthhub-app

echo "=== Container recriado na porta 3024 ==="

# 5. Configurar SSL
echo "=== Configurando SSL ==="
read -p "O domínio $Domain está apontando para 3.143.251.44? (s/n): " configure_ssl

if [ "$configure_ssl" = "s" ] || [ "$configure_ssl" = "S" ]; then
    sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

    # Configurar renovação automática
    (sudo crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | sudo crontab -

    echo "=== SSL configurado ==="
else
    echo "=== SSL não configurado. Configure depois quando o DNS estiver pronto ==="
    echo "Execute: sudo certbot --nginx -d $DOMAIN"
fi

# 6. Reiniciar nginx
sudo systemctl restart nginx

echo "=== Configuração concluída ==="
echo "Aplicação acessível em: http://3.143.251.44 (HTTP)"
if [ "$configure_ssl" = "s" ] || [ "$configure_ssl" = "S" ]; then
    echo "Aplicação acessível em: https://$DOMAIN (HTTPS)"
fi
