"""Flask configuration."""
import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-change-me')
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', f'sqlite:///{os.path.join(BASE_DIR, "antescan.db")}')
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=int(os.getenv('JWT_ACCESS_TOKEN_EXPIRES_HOURS', 12)))
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=int(os.getenv('JWT_REFRESH_TOKEN_EXPIRES_DAYS', 30)))

    DATA_DIR = os.path.join(BASE_DIR, os.getenv('DATA_DIR', 'data'))
    DATASETS_DIR = os.path.join(BASE_DIR, os.getenv('DATASETS_DIR', 'data/datasets'))
    ML_MODELS_DIR = os.path.join(BASE_DIR, os.getenv('ML_MODELS_DIR', 'data/ml_models'))
    EXPORTS_DIR = os.path.join(BASE_DIR, os.getenv('EXPORTS_DIR', 'data/exports'))
    UPLOADS_DIR = os.path.join(BASE_DIR, os.getenv('UPLOADS_DIR', 'data/uploads'))

    # SMS
    AT_API_KEY = os.getenv('AT_API_KEY', '')
    AT_USERNAME = os.getenv('AT_USERNAME', 'sandbox')
    AT_SENDER_ID = os.getenv('AT_SENDER_ID', 'AnteScan')
    SMS_DRY_RUN = os.getenv('SMS_DRY_RUN', 'true').lower() == 'true'

    CORS_ORIGINS = [o.strip() for o in os.getenv('CORS_ORIGINS', '*').split(',')]
    MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500 MB
