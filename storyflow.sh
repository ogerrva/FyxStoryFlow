#!/bin/bash

# CORES
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

while true; do
    clear
    echo -e "${BLUE}========================================${NC}"
    echo -e "${CYAN}   FYX STORY FLOW - CONTROLE VPS v3.0   ${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo -e "1) 🟢 Status do Sistema"
    echo -e "2) 🔄 Reiniciar Sistema"
    echo -e "3) 📜 Ver Logs (Ao Vivo)"
    echo -e "4) 🛑 Parar Sistema"
    echo -e "5) 🔐 Resetar Senha Admin (Apaga DB)"
    echo -e "6) 📦 Atualizar (Git Pull + Build)"
    echo -e "0) 🚪 Sair"
    echo -e "${BLUE}========================================${NC}"
    read -p "Escolha uma opção: " option

    case $option in
        1)
            pm2 status storyflow
            read -p "Pressione Enter para voltar..."
            ;;
        2)
            echo "Reiniciando..."
            pm2 restart storyflow
            echo -e "${GREEN}Sistema reiniciado!${NC}"
            sleep 2
            ;;
        3)
            echo "Exibindo logs (Ctrl+C para sair)..."
            pm2 logs storyflow
            ;;
        4)
            pm2 stop storyflow
            echo -e "${RED}Sistema parado.${NC}"
            sleep 2
            ;;
        5)
            echo "Esta função requer acesso direto ao DB (sqlite3)."
            echo "Para resetar, delete o arquivo data/storyflow.db e reinicie para recriar o admin padrão."
            read -p "Deseja deletar o DB agora? (s/n): " confirm
            if [[ $confirm == "s" ]]; then
                rm -f data/storyflow.db
                pm2 restart storyflow
                echo "Banco resetado. Admin: admin / Senha: admin123"
            fi
            read -p "Pressione Enter para voltar..."
            ;;
        6)
            echo "Atualizando repositório..."
            git pull
            echo "Reinstalando dependências..."
            npm install
            echo "Reconstruindo Painel..."
            npm run build
            pm2 restart storyflow
            echo -e "${GREEN}Atualização completa!${NC}"
            read -p "Pressione Enter para voltar..."
            ;;
        0)
            exit 0
            ;;
        *)
            echo "Opção inválida."
            sleep 1
            ;;
    esac
done
