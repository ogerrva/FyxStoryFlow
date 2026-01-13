#!/bin/bash

# Cores para logs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}   FYX STORY FLOW - INSTALADOR DE RECUPERAÇÃO    ${NC}"
echo -e "${BLUE}=================================================${NC}"

# 1. Correção Bruta do PM2 (Para erro ENOTEMPTY)
echo -e "${GREEN}>>> Verificando e Corrigindo PM2...${NC}"
pm2 kill 2>/dev/null
# Remove forçadamente diretórios que costumam travar
sudo rm -rf /usr/lib/node_modules/pm2 2>/dev/null
sudo rm -rf /usr/local/lib/node_modules/pm2 2>/dev/null
sudo rm -rf ~/.pm2 2>/dev/null
sudo rm -rf /root/.pm2 2>/dev/null

# Reinstala PM2 Limpo
if ! command -v pm2 &> /dev/null; then
    echo "Reinstalando PM2..."
    sudo npm install -g pm2
fi

# 2. Verificação de Arquivos Críticos
echo -e "${GREEN}>>> Verificando arquivos do projeto...${NC}"
if [ ! -f "server/index.js" ] || [ ! -f "server/worker.js" ]; then
    echo -e "${RED}ERRO CRÍTICO: Arquivos 'server/index.js' ou 'server/worker.js' não encontrados!${NC}"
    echo "Você deve fazer upload dos arquivos do projeto para esta pasta antes de instalar."
    echo "Estrutura esperada:"
    echo "  /root/fyx/server/index.js"
    echo "  /root/fyx/src/..."
    echo "  /root/fyx/package.json"
    exit 1
fi

# 3. Instalação de Dependências
echo -e "${GREEN}>>> Instalando pacotes (npm install)...${NC}"
# Força instalação ignorando conflitos de upstream opcionais
npm install --no-audit

# 4. Instalação do Playwright (Essencial para VPS)
echo -e "${GREEN}>>> Instalando Navegador (Chromium)...${NC}"
npx playwright install chromium --with-deps

# 5. Build do React
echo -e "${GREEN}>>> Compilando Dashboard...${NC}"
npm run build

# 6. Iniciar Processos
echo -e "${GREEN}>>> Iniciando Aplicação...${NC}"
pm2 delete fyx-api 2>/dev/null
pm2 delete fyx-worker 2>/dev/null

# Inicia API (Usa porta 3001 ou process.env.PORT)
pm2 start server/index.js --name "fyx-api"

# Inicia Worker
pm2 start server/worker.js --name "fyx-worker"

pm2 save

# 7. Resumo
IP_EXTERNO=$(curl -s ifconfig.me || echo "SEU_IP")
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}   INSTALAÇÃO CONCLUÍDA!   ${NC}"
echo -e "${GREEN}=========================================${NC}"
echo -e "Acesse: http://${IP_EXTERNO}:3001"
echo -e "Use ./storyflow.sh para gerenciar."