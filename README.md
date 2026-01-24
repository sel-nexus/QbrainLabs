# Hotspot Matrix

An AI-driven Collaborative Workshop Platform for use case prioritization.
Hotspot Matrix allows real-time facilitation of "Hotspot" prioritization workshops. Participants join via mobile/web, submit use cases, and vote on criteria (e.g., Feasibility vs. Business Value) in real-time. The results are instantly visualized in an interactive Matrix (Bubble Chart) to identify "Strategic Bets," "Quick Wins," etc.

## ✨ Key Features

- **Real-Time Collaboration**: Powered by WebSockets (Socket.io), ensure instant updates for all participants.
- **Three-Phase Workshop Flow**:
  1.  **Intake Phase**: Participants submit use cases (Title, Description, KPIs).
  2.  **Scoring Phase**: Facilitator acts as "DJ", controlling which card is being voted on. Participants vote on 0-10 sliders.
  3.  **Analysis Phase**: Dynamic visualization of aggregated scores in a Matrix/Quadrant view.
- **Mobile-First Participant UI**: Optimized for phone intake and voting.
- **Facilitator Dashboard**: Powerful controls to manage flow, view submissions, and export data.
- **Data Export**: Support for CSV export for offline analysis.

## 🛠 Tech Stack

### Frontend (Client)
- **Framework**: React (Vite)
- **Styling**: Tailwind CSS (v4)
- **State/Data**: React Context + Hooks
- **Visualization**: Recharts
- **Real-time**: Socket.io Client
- **Notifications**: Sonner

### Backend (Server)
- **Framework**: FastAPI (Python)
- **Database**: SQLite (SQLAlchemy ORM) - *Easily upgradeable to PostgreSQL*
- **Real-time**: Socket.io (AsyncServer)
- **Concurrency**: Python asyncio

## 🚀 Getting Started

### Prerequisites
- Python 3.9+
- Node.js 18+

### 1. Setup Backend (Server)

```bash
cd server
# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn app.main:app --reload
```
The server will start at `http://localhost:8000`.
API Docs available at: `http://localhost:8000/docs`.

### 2. Setup Frontend (Client)

```bash
cd client
# Install dependencies
npm install

# Run development server
npm run dev
```
The client will start at `http://localhost:5173`.

## 📖 Usage Guide

### Facilitator
1. Open the client (`http://localhost:5173`) and click **"Create Workshop"**.
2. Configure your criteria weights (e.g., Feasibility 50%, Value 50%).
3. Share the generated **PIN** with your participants.
4. Click **Start Intake** to allow submissions.
5. Watch submissions roll in. When ready, click **Start Scoring**.
6. In **Scoring Phase**, click "Present for Voting" on a card to broadcast it to all phones.
7. Once done, proceed to **Analysis** to view the final Matrix.

### Participant
1. Open the client on mobile (`http://localhost:5173/join`) or click **"Join Workshop"**.
2. Enter the **PIN** provided by the facilitator.
3. In **Intake**, submit your ideas.
4. In **Scoring**, wait for the facilitator to present a card, then move sliders and submit your vote.

## 📂 Project Structure

```
├── client/              # React Frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Route pages (Join, Detail, etc.)
│   │   └── lib/         # Utilities (API, Socket)
├── server/              # FastAPI Backend
│   ├── app/
│   │   ├── api/         # Rest Endpoints
│   │   ├── models/      # SQLAlchemy Database Models
│   │   ├── schemas/     # Pydantic Schemas
│   │   └── websockets/  # Socket.io events
├── docs/                # Project Documentation & Plans
```

## 📄 License
MIT
