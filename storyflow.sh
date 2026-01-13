#!/bin/bash

APP_API="fyx-api"
APP_WORKER="fyx-worker"

while true; do
    clear
    echo "========================================================"
    echo "   FYX STORY FLOW - MENU DE CONTROLE"
    echo "========================================================"
    echo "1. 🟢 Status dos Processos"
    echo "2. 📄 Logs (Ao Vivo)"
    echo "3. 🔄 Reiniciar Sistema"
    echo "4. 🛑 Parar Tudo"
    echo "5. 🧹 Limpar Cache de Login (Instagram)"
    echo "6. 🚪 Sair"
    echo "========================================================"
    read -p "Opção: " choice

    case $choice in
        1)
            pm2 status | grep -E "$APP_API|$APP_WORKER|App name"
            read -p "Enter para voltar..."
            ;;
        2)
            pm2 logs $APP_API $APP_WORKER --lines 50
            ;;
        3)
            echo "Reiniciando..."
            pm2 restart $APP_API $APP_WORKER
            sleep 2
            ;;
        4)
            pm2 stop $APP_API $APP_WORKER
            echo "Parado."
            sleep 1
            ;;
        5)
            echo "Removendo sessões salvas..."
            rm -f data/session_*.json
            pm2 restart $APP_WORKER
            echo "Concluído."
            sleep 1
            ;;
        6)
            exit 0
            ;;
        *)
            echo "Opção inválida."
            sleep 1
            ;;
    esac
done