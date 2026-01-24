# AI Hotspot Matrix

An AI-driven Collaborative Workshop Platform for use case prioritization.
Hotspot Matrix allows real-time facilitation of "Hotspot" prioritization workshops. Participants join via mobile/web, submit use cases, and vote on criteria (e.g., Feasibility vs. Business Value) in real-time. The results are instantly visualized in an interactive Matrix (Bubble Chart) to identify "Strategic Bets," "Quick Wins," etc.

## ✨ Key Features

- **Facilitator Authentication**: Secure login/signup system for facilitators with JWT-based authentication.
- **Admin Panel**: System-wide dashboard for administrators with workshop and user management capabilities.
- **Real-Time Collaboration**: Powered by WebSockets (Socket.io), ensure instant updates for all participants.
- **Three-Phase Workshop Flow**:
  1.  **Intake Phase**: Participants submit use cases (Title, Description, KPIs).
  2.  **Scoring Phase**: Facilitator acts as "DJ", controlling which card is being voted on. Participants vote on 0-10 sliders.
  3.  **Analysis Phase**: Dynamic visualization of aggregated scores in a Matrix/Quadrant view.
- **Mobile-First Participant UI**: Optimized for phone intake and voting.
- **Facilitator Dashboard**: Powerful controls to manage flow, view submissions, and export data.
- **Advanced Prioritization Templates**: Includes standardized 7-point strategic evaluation metrics ("Business Impact", "Data Readiness", etc.).
- **QR Code Access**: Generate session QR codes for instant mobile joining.
- **Data Export**: Support for CSV export for offline analysis.

## 🛠 Tech Stack

### Frontend (Client)
- **Framework**: React (Vite)
- **Styling**: Tailwind CSS (v4)
- **State/Data**: React Context + Hooks
- **Visualization**: D3.js (Custom Interactive Matrix)
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

# Initialize database and create default admin user
python init_db.py

# Run the server
uvicorn app.main:app --reload
```
The server will start at `http://localhost:8000`.
API Docs available at: `http://localhost:8000/docs`.

**Default Admin Credentials:**
- Email: `admin@hotspotmatrix.ai`
- Password: `admin123`
- ⚠️ **Please change the default password after first login!**

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

### Administrator
1. Log in with admin credentials (`admin@hotspotmatrix.ai` / `admin123`).
2. **Important**: Change the default password immediately via the Key icon in the header.
3. Click the **Shield icon** in the dashboard header to access the **Admin Panel**.
4. From the Admin Panel, you can:
   - View system-wide statistics (total workshops, users, participants)
   - Manage all workshops (view, approve/reject, delete)
   - Manage user accounts (create, view, deactivate)
   - Access your own workshops via "My Workshops" link

### Facilitator
1. Open the client (`http://localhost:5173`) and click **"Facilitator Login"**.
2. **Sign up** for a new account or **log in** with existing credentials.
3. From the dashboard, click **"Create Workshop"** (or **"New Workshop"**).
4. Configure your criteria weights (e.g., Feasibility 50%, Value 50%) OR select a **Standard Template** (e.g., 7-Point Comprehensive).
5. Share the generated **PIN** or **QR Code** with your participants.
6. Click **Start Intake** to allow submissions.
7. Watch submissions roll in. When ready, click **Start Scoring**.
8. In **Scoring Phase**, click "Present for Voting" on a card to broadcast it to all phones.
9. Once done, proceed to **Analysis** to view the final Matrix.

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
