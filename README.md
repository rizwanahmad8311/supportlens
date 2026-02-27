# SupportLens

SupportLens is a lightweight observability platform for a SaaS customer support chatbot.

It includes:

- Django backend (LLM-powered response generation and classification)
- React dashboard (analytics and trace observability)
- Gemini for response generation and classification
- Dockerized setup with a single command

## Project Structure

supportlens
├── backend
├── frontend
└── docker-compose.yml

## Prerequisites

- Docker
- Docker Compose

## Environment Setup

Create the following file:
backend/.env

Add:
GEMINI_API_KEY=your_gemini_api_key_here

You can generate a free key from:
https://aistudio.google.com

## Run Locally

From the project root:
docker-compose up --build

Services will start at:

- Backend: http://localhost:8000
- Frontend: http://localhost:5173

## API Endpoints

### POST /api/chat/

Generates response, classifies trace, and stores it.

Example request body:

```json
{
  "user_message": "I want to cancel my subscription."
}
```