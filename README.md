# CS261 Group Project - Traffic Junction Simulation

### Setup
The web app consists of a frontend server run with vite, a backend server with django and another server for running the multithreaded part of the backend. It requires:
- Python 3.11.9
- Node.js 18+ or 20+
- Python venv module for virtual environment

### Running the frontend dev server
- Open a new terminal
- Change to frontend directory using 'cd frontend'
- Install frontend dependencies using 'npm install' (Required for the first setup)
- Run the frontend dev server using 'npm run dev'

### Running the backend server
- Open a new terminal
- Change to backend directory using 'cd backend'
- Activate virtual environment using venv/Scripts/activate or source venv/Scripts/activate for Linux
- Install all required Python packages using 'pip install -r requirements.txt'
- Run 'python manage.py makemigrations'
- Run 'python manage.py migrate'
- Run Django server using 'python manage.py runserver

### Runing the multithreading server
- Open a new terminal
- Change to backend directory using 'cd backend'
- Activate virtual environment using venv/Scripts/activate or source venv/Scripts/activate for Linux
- Install all required Python packages using 'pip install -r requirements.txt'
- Run the server using 'celery -A traffic_sim worker --loglevel=info --pool=solo'
