#!/bin/bash

while true; do
    clear
    echo "========================================================"
    echo "   FYX STORY FLOW - MENU DE CONTROLE"
    echo "========================================================"
    echo "1. 🟢 Ver Status (PM2)"
    echo "2. 📄 Logs em Tempo Real"
    echo "3. 🔄 Reiniciar Serviços"
    echo "4. 🛑 Parar Serviços"
    echo "5. 🧹 Limpar Cache/Sessões (Reseta logins)"
    echo "6. 🚪 Sair"
    echo "========================================================"
    read -p "Opção: " choice

    case $choice in
        1)
            pm2 status
            read -p "Enter para voltar..."
            ;;
        2)
            pm2 logs --lines 20
            ;;
        3)
            pm2 restart all
            echo "Reiniciado."
            sleep 1
            ;;
        4)
            pm2 stop all
            echo "Parado."
            sleep 1
            ;;
        5)
            echo "Deletando sessões salvas..."
            rm -f data/session_*.json
            pm2 restart worker
            echo "Concluído. Faça login novamente no painel."
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
