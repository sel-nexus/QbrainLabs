# Root Directory Structure

/hotspotmatrix
├── /client                # React.js Frontend
├── /server                # FastAPI/Python Backend
├── /ai_engine             # AI/RAG logic & Vector DB scripts
├── /infra                 # Docker, Terraform, and CI/CD configs
├── /docs                  # API Specs, User Stories (MD files)
├── .env.example           # Template for environment variables
└── docker-compose.yml     # Orchestration for local development

# Backend Structure (FastAPI)
/server
├── /app
│   ├── /api              # API Route Handlers (v1)
│   │   ├── workshops.py  # PIN validation & Session management
│   │   └── scoring.py    # Scoring & Aggregation endpoints
│   ├── /core             # Config, Security (JWT), Constants
│   ├── /models           # Database Models (SQLAlchemy/Pydantic)
│   ├── /services         # Business Logic (The "Weighting" engine)
│   │   └── aggregator.py # Calculates X, Y coordinates
│   ├── /websockets       # Socket.io event handlers
│   └── main.py           # Application Entry Point
├── /tests                # Unit & Integration tests
└── requirements.txt

# Frontend Structure (React + D3.js)
/client
├── /src
│   ├── /assets           # Styles, Images, Fonts
│   ├── /components       # Shared UI (Buttons, Modals, Sliders)
│   ├── /features         # Feature-based modules
│   │   ├── /workshop     # Intake Canvas & Participant UI
│   │   ├── /admin        # Facilitator Dashboard & PIN setup
│   │   └── /visualizer   # D3.js Hotspot Matrix implementation
│   ├── /hooks            # Custom hooks (e.g., useSocket, useAuth)
│   ├── /services         # API Client (Axios/Fetch wrappers)
│   ├── /store            # State Management (Redux/Zustand)
│   └── App.js            # Main routing
└── package.json

# Why this structure?

Scalability: By placing the AI Engine in its own folder, you can later spin it off into a microservice if the RAG processing becomes too heavy for the main API.

D3.js Isolation: Keeping the visualization logic in a dedicated visualizer feature folder prevents the complex math and SVG rendering of the Hotspot Matrix from cluttering the standard UI components.

Clean Scoring Logic: All the "weighted math" we discussed is contained in services/aggregator.py, making it easy to unit test without needing a database or frontend connection.

# Implementation Tip: The .env Strategy

Since this app deals with sensitive business strategy, ensure your .env file includes separate keys for:

DATABASE_URL (PostgreSQL)

REDIS_URL (For real-time scoring sync)

OPENAI_API_KEY (For the AI-powered canvas insights)