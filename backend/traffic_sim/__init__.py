# Import celery app when django server starts
from .celery import app as celery_app
__all__ = ("celery_app",)
