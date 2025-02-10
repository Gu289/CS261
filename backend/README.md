To run the backend server:
1. Use Python 3.11.9
2. Run 'pip install -r requirements.txt' in the same directory as requirements.txt to install all required Python packages.
3. Run 'python manage.py runserver' in the same directory as manage.py

To reset the database:
1. Just delete the db.sqlite3
2. Run 'python manage.py makemigrations'
3. Run 'python manage.py migrate