"""In-app notifications for admins and CHWs."""
from app.extensions import db
from .user import TimestampMixin


class Notification(db.Model, TimestampMixin):
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True)
    kind = db.Column(db.String(40), nullable=False)  # alert | system | msg | broadcast
    title = db.Column(db.String(200), nullable=False)
    body = db.Column(db.Text, nullable=True)
    severity = db.Column(db.String(20), default='info')  # info | success | warning | error
    target_audience = db.Column(db.String(40), default='admin')  # admin | chw | both
    # When set, this notification is private to a single user and ignores
    # target_audience filtering. Used by the toast→notification bridge.
    recipient_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)
    link = db.Column(db.String(255), nullable=True)
    metadata_json = db.Column(db.Text, nullable=True)

    recipients = db.relationship('NotificationRecipient', backref='notification',
                                  cascade='all, delete-orphan', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'type': self.kind,            # front-end uses `type`
            'kind': self.kind,
            'title': self.title,
            'body': self.body,
            'severity': self.severity,
            'audience': self.target_audience,
            'link': self.link,
            'createdAt': self.created_at.isoformat(),
            'when': self.created_at.isoformat(),
        }


class NotificationRecipient(db.Model):
    __tablename__ = 'notification_recipients'

    id = db.Column(db.Integer, primary_key=True)
    notification_id = db.Column(db.Integer, db.ForeignKey('notifications.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    read = db.Column(db.Boolean, default=False)
    read_at = db.Column(db.DateTime, nullable=True)
    deleted = db.Column(db.Boolean, default=False, nullable=False)
    deleted_at = db.Column(db.DateTime, nullable=True)
