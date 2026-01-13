#!/bin/bash

# Menu interativo para gerenciar o FyxStoryFlow

while true; do
    clear
    echo "========================================================"
    echo "   FYX STORY FLOW - PAINEL DE CONTROLE (VPS)"
    echo "========================================================"
    echo "1. 🟢 Status do Sistema"
    echo "2. 📄 Ver Logs (API + Worker)"
    echo "3. 🔄 Reiniciar Tudo"
    echo "4. 🛑 Parar Tudo"
    echo "5. 🗑️  Limpar Cache/Sessões (Correção de erros)"
    echo "6. 🚪 Sair"
    echo "========================================================"
    read -p "Escolha uma opção: " choice

    case $choice in
        1)
            pm2 status
            read -p "Pressione Enter para voltar..."
            ;;
        2)
            pm2 logs --lines 50
            ;;
        3)
            pm2 restart all
            echo "Sistema reiniciado!"
            sleep 2
            ;;
        4)
            pm2 stop all
            echo "Sistema parado."
            sleep 2
            ;;
        5)
            echo "Limpando sessões antigas..."
            rm -rf data/session_*.json
            pm2 restart storyflow-worker
            echo "Feito. Tente logar novamente pelo Dashboard."
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
