#!/bin/bash

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}   FYX STORY FLOW - INSTALAÇÃO SEGURA (VPS)      ${NC}"
echo -e "${BLUE}=================================================${NC}"

# 1. Verificações de Segurança do Ambiente
echo -e "${GREEN}>>> Verificando ambiente...${NC}"

# Verifica Node.js sem forçar reinstalação se já estiver numa versão compatível
if ! command -v node &> /dev/null; then
    echo "Node.js não detectado. Instalando..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
else
    NODE_VERSION=$(node -v)
    echo -e "Node.js já instalado: ${NODE_VERSION}"
fi

# Verifica PM2 sem deletar configurações existentes
if ! command -v pm2 &> /dev/null; then
    echo "PM2 não detectado. Instalando..."
    sudo npm install -g pm2
else
    echo -e "PM2 já instalado. Mantendo configuração atual."
fi

# 2. Garantir package.json (Caso o usuário não tenha copiado)
if [ ! -f "package.json" ]; then
    echo -e "${GREEN}>>> Gerando package.json...${NC}"
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

# 3. Instalação de Dependências
echo -e "${GREEN}>>> Instalando pacotes (npm install)...${NC}"
npm install

# 4. Playwright (Binários do Navegador)
echo -e "${GREEN}>>> Verificando binários do Playwright...${NC}"
npx playwright install chromium --with-deps

# 5. Build do Frontend
echo -e "${GREEN}>>> Compilando Dashboard (Build)...${NC}"
# Cria diretórios se não existirem para evitar erros de build
mkdir -p src server components services
npm run build

# 6. Gerenciamento de Processos (PM2) - MODO SEGURO
echo -e "${GREEN}>>> Configurando processos no PM2...${NC}"

# Remove APENAS os processos antigos deste aplicativo específico
pm2 delete fyx-api 2>/dev/null || true
pm2 delete fyx-worker 2>/dev/null || true

# Inicia com nomes específicos (Namespaced)
# API
pm2 start server/index.js --name "fyx-api" --watch --ignore-watch="node_modules data uploads dist"

# Worker
pm2 start server/worker.js --name "fyx-worker" --watch --ignore-watch="node_modules data uploads dist"

# Salva a lista de processos (Mescla com os existentes na VPS)
pm2 save

# Configura startup apenas se necessário (não sobrescreve se já configurado)
pm2 startup | tail -n 1 | bash 2>/dev/null || true

# Pegar IP externo para exibir
IP_EXTERNO=$(curl -s ifconfig.me || echo "SEU_IP")

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}   INSTALAÇÃO SEGURA CONCLUÍDA!   ${NC}"
echo -e "${GREEN}=========================================${NC}"
echo -e "Acesse: http://${IP_EXTERNO}:3001"
echo -e "Usuário: admin"
echo -e "Senha:   admin123"
echo -e ""
echo -e "Use ./storyflow.sh para gerenciar APENAS este sistema."
