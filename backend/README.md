To run the backend server:
- Make sure you are inside the 'backend' folder.
- Use Python 3.11.9
- Run 'pip install -r requirements.txt' in the same directory as requirements.txt to install all required Python packages.
- Run 'python manage.py makemigrations'
- Run 'python manage.py migrate'
- Run 'python manage.py runserver' in the same directory as manage.py to run Django server.
- Run 'celery -A traffic_sim worker --loglevel=info --pool=solo' to run the server responsible for executing background tasks.

To reset the database:
1. Just delete the db.sqlite3
2. Run 'python manage.py makemigrations'
3. Run 'python manage.py migrate

To run the backend server on virtual environment:
1. Make sure you have Python 3.11 installed
2. Activate the virtual environment by running
- venv\Scripts\activate on Windows
- source venv/Scripts/activate on Git Bash or Linux
3. Run 'pip install -r requirements.txt' in the same directory as requirements.txt to install all required Python packages.
4. Run 'python manage.py runserver' in the same directory as manage.py