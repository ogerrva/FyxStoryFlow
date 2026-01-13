#!/bin/bash

# Definição dos nomes dos serviços
APP_API="fyx-api"
APP_WORKER="fyx-worker"

while true; do
    clear
    echo "========================================================"
    echo "   FYX STORY FLOW - GERENCIADOR SEGURO"
    echo "========================================================"
    echo "   Processos Alvo: $APP_API, $APP_WORKER"
    echo "========================================================"
    echo "1. 🟢 Ver Status (FyxStoryFlow)"
    echo "2. 📄 Logs em Tempo Real"
    echo "3. 🔄 Reiniciar Serviços FYX (Apenas)"
    echo "4. 🛑 Parar Serviços FYX (Apenas)"
    echo "5. 🧹 Limpar Sessões de Login (Instagram)"
    echo "6. 🚪 Sair"
    echo "========================================================"
    read -p "Opção: " choice

    case $choice in
        1)
            # Mostra apenas os processos do Fyx
            pm2 status | grep -E "fyx-api|fyx-worker|App name"
            read -p "Enter para voltar..."
            ;;
        2)
            # Logs apenas do Fyx
            pm2 logs $APP_API $APP_WORKER --lines 20
            ;;
        3)
            echo "Reiniciando $APP_API e $APP_WORKER..."
            pm2 restart $APP_API $APP_WORKER
            echo "Concluído."
            sleep 1
            ;;
        4)
            echo "Parando $APP_API e $APP_WORKER..."
            pm2 stop $APP_API $APP_WORKER
            echo "Parado."
            sleep 1
            ;;
        5)
            echo "Deletando arquivos de sessão..."
            rm -f data/session_*.json
            echo "Reiniciando worker..."
            pm2 restart $APP_WORKER
            echo "Concluído. Será necessário logar novamente no painel."
            sleep 2
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
