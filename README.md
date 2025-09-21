

# Scan Score Shine: Automated OMR Evaluation & Scoring System
Scan Score Shine is a web application to automate evaluation of OMR sheets.
It allows evaluators to upload OMR sheet images and CSV/XLSX answer keys,
and calculates the total marks accurately. The system reduces manual errors,
speeds up evaluation, and provides a dashboard to review results.

## Features
- Upload OMR sheets (images/PDFs)
- Upload answer keys (CSV/XLSX)
- Automatic image preprocessing (rotation, skew, perspective correction)
- Bubble detection using OpenCV
- Dynamic scoring based on answer key
- Total marks calculation (no hardcoded subjects)
- Dashboard to monitor evaluation and review flagged sheets
- Export results as CSV/XLSX
  
  ## Tech Stack
- Frontend: React + Vite + TypeScript + TailwindCSS + shadcn/ui
- Backend: Python (FastAPI / Flask)
- Database: PostgreSQL / SQLite
- OMR Processing: OpenCV, NumPy, SciPy, Pillow
- Optional ML: scikit-learn / TensorFlow Lite for ambiguous bubbles
- PDF Handling: PyMuPDF / PDFPlumber
- CSV/XLSX Handling: Pandas / openpyxl
5. Project Setup (For Developers)
## Setup

1. Clone the repo
   ```bash
   git clone https://github.com/rupasree97/scan-score-shine.git
   cd scan-score-shine


Install frontend dependencies

cd frontend/reactvite
npm install
npm run dev


Backend setup (example for FastAPI)

cd backend
python -m venv venv
source venv/bin/activate   # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
uvicorn main:app --reload


Open frontend in browser: http://localhost:5173


---

### **Usage**
```markdown
## Usage
1. Log in as evaluator (if authentication is implemented)
2. Upload OMR sheet images or PDFs
3. Upload CSV/XLSX answer key
4. Click "Evaluate"
5. View total marks in the dashboard
6. Export results as CSV/XLSX if needed




8. Contributing
## Contributing
Feel free to submit issues or pull requests. Make sure your changes follow the project’s coding conventions.

