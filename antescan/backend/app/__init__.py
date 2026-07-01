"""Flask application factory."""
import os
from flask import Flask, jsonify
from app.config import Config
from app.extensions import db, jwt, cors, migrate


def create_app(config=Config):
    app = Flask(__name__)
    app.config.from_object(config)

    # Ensure data dirs exist
    for d in [config.DATA_DIR, config.DATASETS_DIR, config.ML_MODELS_DIR,
              config.EXPORTS_DIR, config.UPLOADS_DIR]:
        os.makedirs(d, exist_ok=True)

    # Extensions
    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r'/api/*': {'origins': config.CORS_ORIGINS}}, supports_credentials=True)
    migrate.init_app(app, db)

    # Make sure models are imported so SQLAlchemy registers them
    from app import models  # noqa

    # Register all blueprints
    from app.routes.auth import bp as auth_bp
    from app.routes.clinical import patients_bp, screenings_bp
    from app.routes.clinical_ops import referrals_bp, alerts_bp, labs_bp
    from app.routes.data_ai import datasets_bp, models_bp, training_bp
    from app.routes.people import chws_bp, compounds_bp, leaderboard_bp
    from app.routes.analytics import dashboard_bp, reports_bp
    from app.routes.system import system_bp

    for bp in [auth_bp, patients_bp, screenings_bp,
               referrals_bp, alerts_bp, labs_bp,
               datasets_bp, models_bp, training_bp,
               chws_bp, compounds_bp, leaderboard_bp,
               dashboard_bp, reports_bp, system_bp]:
        app.register_blueprint(bp)

    @app.get('/api/health')
    def health():
        return jsonify({'status': 'ok', 'service': 'antescan-api', 'version': '1.0.0'})

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Not found'}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({'error': 'Internal server error', 'detail': str(e)}), 500

    return app
