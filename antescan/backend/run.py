"""Backend entry point.

Run:  flask --app run.py run -p 5000  (dev)
Or:   python run.py
"""
import os
from app import create_app
from app.extensions import db

app = create_app()


@app.cli.command('init-db')
def init_db():
    """Create all tables."""
    with app.app_context():
        db.create_all()
        print('Database initialized.')


if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
