#!/bin/bash

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}>>> INICIANDO CORREÇÃO E INSTALAÇÃO...${NC}"

# 1. Limpeza Bruta do NPM e PM2 (Corrige o erro ENOTEMPTY)
echo -e "${GREEN}>>> Limpando instalações corrompidas do PM2...${NC}"
pm2 kill 2>/dev/null
sudo npm uninstall -g pm2
sudo rm -rf /usr/lib/node_modules/pm2
sudo rm -rf /usr/local/lib/node_modules/pm2
sudo rm -rf ~/.pm2
sudo rm -rf /root/.pm2

# 2. Atualizar Node (Garantia)
echo -e "${GREEN}>>> Verificando Node.js...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# 3. Instalar PM2 Limpo
echo -e "${GREEN}>>> Reinstalando PM2...${NC}"
sudo npm install -g pm2

# 4. Verificar se package.json existe, se não, criar um básico para permitir npm install
if [ ! -f "package.json" ]; then
    echo -e "${RED}AVISO: package.json não encontrado! Criando um padrão...${NC}"
    cat <<EOF > package.json
{
  "name": "fyx-story-flow",
  "version": "3.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "server": "node server/index.js",
    "worker": "node server/worker.js",
    "start": "npm run build && concurrently \"npm run server\" \"npm run worker\"",
    "postinstall": "npx playwright install --with-deps"
  },
  "dependencies": {
    "react": "^19.2.3",
    "react-dom": "^19.2.3",
    "@google/genai": "^1.35.0",
    "express": "^4.18.2",
    "better-sqlite3": "^9.4.3",
    "playwright": "^1.57.0",
    "cors": "^2.8.5",
    "multer": "^1.4.5-lts.1",
    "dotenv": "^16.4.5",
    "node-cron": "^3.0.3",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "concurrently": "^8.2.2"
  },
  "devDependencies": {
    "@types/react": "^18.2.66",
    "@types/react-dom": "^18.2.22",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.2.2",
    "vite": "^5.2.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.3",
    "@types/better-sqlite3": "^7.6.9",
    "@types/express": "^4.17.21",
    "@types/bcryptjs": "^2.4.6",
    "@types/jsonwebtoken": "^9.0.6"
  }
}
EOF
fi

# 5. Instalar Dependências do Projeto
echo -e "${GREEN}>>> Instalando dependências (Isso pode demorar)...${NC}"
npm install

# 6. Instalar Playwright
echo -e "${GREEN}>>> Instalando binários do Playwright...${NC}"
npx playwright install --with-deps chromium

# 7. Build do Front-end
echo -e "${GREEN}>>> Compilando Dashboard React...${NC}"
# Garante que as pastas existem
mkdir -p src server components services
npm run build

# 8. Iniciar Serviços com PM2
echo -e "${GREEN}>>> Iniciando processos...${NC}"
pm2 delete all 2>/dev/null

# Backend API
pm2 start server/index.js --name "api" --watch --ignore-watch="node_modules data uploads"

# Worker Bot
pm2 start server/worker.js --name "worker" --watch --ignore-watch="node_modules data uploads"

# Salvar
pm2 save
pm2 startup | tail -n 1 | bash

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}   INSTALAÇÃO CONCLUÍDA!   ${NC}"
echo -e "${GREEN}=========================================${NC}"
echo -e "Painel rodando em: http://$(curl -s ifconfig.me):3001"
echo -e "Use ./storyflow.sh para gerenciar."
