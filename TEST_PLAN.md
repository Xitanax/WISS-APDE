# Chocadies Test-Plan

## Implementierte Tests (gemäß Bewertungskriterien 4.2)

### Backend API Tests
- Health Check Endpoint
- Public Jobs API
- Authentication (Login/Register)
- CRUD Operations für Jobs

### Frontend Tests (gemäß Bewertungskriterien 4.3)
- Component Rendering Tests
- Navigation Tests
- Form Validation

### Systemtests
- Docker Integration
- End-to-End Workflow

## Test-Ausführung
```bash
# Backend
cd backend && npm test

# Frontend  
cd frontend && npm test

# Docker
docker compose up -d
curl http://localhost:3000/api/health
