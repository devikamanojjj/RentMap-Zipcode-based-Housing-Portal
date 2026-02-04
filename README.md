# Project Main

## Overview

This project includes a React frontend and a Python backend for real estate ROI prediction and mapping. It visualizes property data and provides user authentication.

## Structure

- `backend/`: Python Flask backend
  - `app.py`: Main backend application
  - `requirements.txt`: Python dependencies
- `public/`: Static files for frontend
  - `index.html`: Main HTML file
  - `latlong.csv`, `sales_rent_result 1.csv`: Data files
- `src/`: React frontend source code
  - `App.js`, `App.css`, `index.js`: Main React files
  - `roi_prediction.py`: Python script for ROI prediction
  - `components/`: React components
    - `LoginRegister.js`, `MapContainer.js`, `MarkerPopup.js`, `USMapBackground.js` and their CSS files

## Setup

### Backend

1. Navigate to the `backend` folder:
   ```sh
   cd backend
   ```
2. Install Python dependencies:
   ```sh
   pip install -r requirements.txt
   ```
3. Run the backend server:
   ```sh
   python app.py
   ```

### Frontend

1. Navigate to the project root:
   ```sh
   cd ..
   ```
2. Install Node.js dependencies:
   ```sh
   npm install
   ```
3. Start the React app:
   ```sh
   npm start
   ```

## Data Files

- Place your CSV data files in the `public/` directory for frontend access.

## Environment Variables

- Mapbox token is stored in `src/components/REACT_APP_MAPBOX_TOKEN` (consider moving to `.env` for security).

## Usage

- Access the frontend at `http://localhost:3000`.
- Backend runs on the default Flask port (usually `5000`).

## License

Specify your license here.
