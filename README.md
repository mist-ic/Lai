# Lai — Legal Document Intelligence System

A contract analysis platform that surfaces the critical 10% of a contract requiring human legal decisions while handling the other 90% automatically. Using advanced local parsing models and AI, Lai helps teams streamline contract review, risk mitigation, and side-by-side legal comparison.

---

## 📖 Comprehensive Documentation

To help you get started with installing, using, and understanding the Lai system, we have provided structured, highly detailed guides. 

Please consult the relevant files below:

| Guide | Description |
| :--- | :--- |
| 🚀 **[Setup & Installation Guide](docs/setup-guide.md)** | Step-by-step instructions for Windows, macOS, and Linux, including system prerequisites, environment variables configuration, running in development vs production modes, and common troubleshooting tips. |
| 🔌 **[API Reference Reference](docs/api-reference.md)** | Detailed specification of every endpoint, including path variables, JSON schemas, example responses, error codes reference, copy-pasteable `curl` commands, and a pre-packaged Postman collection. |
| 🏗️ **[Architecture & Design Guide](docs/architecture.md)** | Explanation of the system design, detailed pipeline sequence flows (Parse -> Extract -> Score -> Summarize), client-backend event sequences, and the complete database ER diagrams and schema metrics. |

---

## Screenshots

| Dashboard | Analysis Progress |
|-----------|-------------------|
| ![Dashboard overview](tests/screenshots/dashboard-overview.png) | ![Contract analysis](tests/screenshots/analysis-extracting.png) |

| Risk Overview | Extracted Clauses |
|---------------|-------------------|
| ![Contract risk overview](tests/screenshots/contract-risk-overview.png) | ![Extracted clauses](tests/screenshots/extracted-clauses.png) |

| Clause Comparison |
|-------------------|
| ![Confidentiality clause comparison](tests/screenshots/compare-confidentiality.png) |

---

## ⚡ 60-Second Quickstart


If your machine already has Node.js 18+, Python 3.11+, and Docker running, use this checklist to boot up the system instantly:

### 1. Provision PostgreSQL Database
```bash
docker compose up -d
```

### 2. Configure Backend Services
```bash
cd backend
python -m venv .venv

# Windows activation
.venv\Scripts\activate
# macOS/Linux activation
source .venv/bin/activate

# Install dependencies and configure credentials
pip install -e .
cp .env.example .env
# Edit .env and supply your GEMINI_API_KEY=AIzaSy...

# Start Backend Web Server
uvicorn app.main:app --reload --port 8000
```
*API Swagger interactive documentation is now available at [http://localhost:8000/docs](http://localhost:8000/docs).*

### 3. Configure Frontend Client
In a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
*Application is now served and running at [http://localhost:5173](http://localhost:5173).*

---

## 🎨 Tech Stack Summary

- **Frontend**: Vite + React 19 + TypeScript + Tailwind CSS v4 + Zustand + Lucide React + Recharts
- **Backend**: Python FastAPI + SQLAlchemy + Alembic
- **Database**: PostgreSQL 16 (via Docker)
- **Engine Core**: IBM Docling (parsing engine) + Google Gemini 3.5 Flash (extraction, scoring, Q&A, comparison)

---

## 👥 Development Team & Credits

This project was built by a collaborative group assignment team of 5 members.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) - see the LICENSE file for details.
