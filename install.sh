#!/bin/bash

# Cores para logs
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}>>> INICIANDO INSTALAÇÃO DO FYXSTORYFLOW...${NC}"

# 1. Atualizar Sistema e Instalar Dependências Básicas
echo -e "${GREEN}>>> Atualizando sistema...${NC}"
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git unzip build-essential

# 2. Instalar Node.js 20 (LTS)
echo -e "${GREEN}>>> Instalando Node.js 20...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Verificar Instalação do Node
node -v
npm -v

# 4. Instalar PM2 (Gerenciador de Processos)
echo -e "${GREEN}>>> Instalando PM2...${NC}"
sudo npm install -g pm2

# 5. Instalar Dependências do Projeto
echo -e "${GREEN}>>> Instalando dependências do projeto...${NC}"
# Assume que estamos na pasta raiz do projeto
npm install

# 6. Instalar Navegadores do Playwright (CRÍTICO PARA VPS)
echo -e "${GREEN}>>> Instalando binários do Playwright...${NC}"
npx playwright install --with-deps chromium

# 7. Build do Dashboard (React)
echo -e "${GREEN}>>> Compilando Dashboard React...${NC}"
npm run build

# 8. Criar Pastas Necessárias
mkdir -p data
mkdir -p uploads

# 9. Configurar PM2 para rodar Backend e Worker
echo -e "${GREEN}>>> Iniciando serviços...${NC}"

# Inicia o Servidor API
pm2 start server/index.js --name "storyflow-api"

# Inicia o Worker (Bot)
pm2 start server/worker.js --name "storyflow-worker"

# Salvar lista de processos para reiniciar com o sistema
pm2 save
pm2 startup | tail -n 1 | bash

echo -e "${GREEN}>>> INSTALAÇÃO CONCLUÍDA!${NC}"
echo -e "Acesse o painel via: http://$(curl -s ifconfig.me):3001"
echo -e "Login padrão inicial: admin / admin123"
