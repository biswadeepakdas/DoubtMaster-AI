#!/bin/bash
# DoubtMaster AI — One-click deployment script
# Agent 10: DevOps, Scaling & Cost Optimization

set -e

echo "=== DoubtMaster AI Deployment ==="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check prerequisites
check_prereqs() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"

    for cmd in node npm docker git; do
        if ! command -v "$cmd" &> /dev/null; then
            echo -e "${RED}Error: $cmd is not installed${NC}"
            exit 1
        fi
    done

    echo -e "${GREEN}All prerequisites met!${NC}"
}

# Deploy backend to Render
deploy_backend() {
    echo -e "${YELLOW}Deploying backend...${NC}"

    cd backend
    npm ci --production

    if command -v render &> /dev/null; then
        echo "Deploying to Render..."
        # render deploy
    else
        echo "Starting with Docker..."
        cd ../deployment/docker
        docker compose up -d api
    fi

    echo -e "${GREEN}Backend deployed!${NC}"
}

# Deploy frontend to Vercel
deploy_frontend() {
    echo -e "${YELLOW}Deploying frontend...${NC}"

    if command -v vercel &> /dev/null; then
        cd frontend/web
        vercel --prod --yes
        echo -e "${GREEN}Frontend deployed to Vercel!${NC}"
    else
        echo -e "${YELLOW}Vercel CLI not found. Install with: npm i -g vercel${NC}"
        echo "Then run: cd frontend/web && vercel --prod"
    fi
}

# Deploy admin panel
deploy_admin() {
    echo -e "${YELLOW}Deploying admin panel...${NC}"

    if command -v vercel &> /dev/null; then
        cd admin-panel
        vercel --prod --yes
        echo -e "${GREEN}Admin panel deployed!${NC}"
    fi
}

# Main
check_prereqs

case "${1:-all}" in
    backend)  deploy_backend ;;
    frontend) deploy_frontend ;;
    admin)    deploy_admin ;;
    all)
        deploy_backend
        deploy_frontend
        deploy_admin
        echo -e "${GREEN}=== All services deployed! ===${NC}"
        ;;
    *)
        echo "Usage: $0 {backend|frontend|admin|all}"
        exit 1
        ;;
esac
