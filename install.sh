#!/bin/bash

# CORES
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}>>> INICIANDO INSTALAÇÃO FYX STORY FLOW <<<${NC}"

# 1. ATUALIZAR SISTEMA
echo -e "${GREEN}[1/7] Atualizando pacotes do sistema...${NC}"
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y curl unzip git build-essential

# 2. INSTALAR NODE.JS (Versão 20 LTS)
echo -e "${GREEN}[2/7] Instalando Node.js...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# 3. INSTALAR PM2 (Gerenciador de Processos)
echo -e "${GREEN}[3/7] Instalando PM2...${NC}"
sudo npm install -g pm2

# 4. INSTALAR DEPENDÊNCIAS DO PROJETO
echo -e "${GREEN}[4/7] Instalando dependências do projeto...${NC}"
npm install

# 5. INSTALAR PLAYWRIGHT BROWSERS E DEPENDÊNCIAS LINUX
echo -e "${GREEN}[5/7] Instalando Playwright e dependências de sistema...${NC}"
npx playwright install chromium
sudo npx playwright install-deps chromium

# 6. BUILD DO FRONTEND
echo -e "${GREEN}[6/7] Compilando painel de controle...${NC}"
npm run build

# 7. INICIAR SERVIÇO
echo -e "${GREEN}[7/7] Iniciando serviços...${NC}"

# Parar processo antigo se existir
pm2 delete storyflow 2>/dev/null || true

# Iniciar novo processo
pm2 start npm --name "storyflow" -- run start

# Salvar lista de processos
pm2 save
pm2 startup | tail -n 1 | bash > /dev/null 2>&1

# RECUPERAR IP
IP=$(curl -s ifconfig.me)

echo -e "\n${BLUE}==============================================${NC}"
echo -e "${GREEN}✅ INSTALAÇÃO CONCLUÍDA COM SUCESSO!${NC}"
echo -e "${BLUE}==============================================${NC}"
echo -e "Acesse seu painel em: http://$IP:3001"
echo -e "Login Padrão: admin"
echo -e "Senha Padrão: admin123"
echo -e "⚠️  IMPORTANTE: Vá em Settings e ative o MODO HEADLESS imediatamente."
echo -e "${BLUE}==============================================${NC}"
