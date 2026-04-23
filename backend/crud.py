from sqlalchemy.orm import Session
from password_utils import hash_password
import models, schemas

# DEVICE
def create_device(db: Session, device: schemas.DeviceCreate):
    db_device = models.Device(**device.dict())
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device

def get_devices(db: Session):
    return db.query(models.Device).all()


# METRIC
def create_metric(db: Session, metric: schemas.MetricCreate):
    db_metric = models.Metric(**metric.dict())
    db.add(db_metric)
    db.commit()
    db.refresh(db_metric)
    return db_metric


# ALERT
def create_alert(db: Session, alert: schemas.AlertCreate):
    db_alert = models.Alert(**alert.dict())
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    return db_alert

def get_device(db, device_id: int):
    return db.query(models.Device).filter(models.Device.id == device_id).first()

def delete_device(db, device_id: int):
    device = get_device(db, device_id)
    if device:
        db.delete(device)
        db.commit()
    return device

def update_device(db, device_id: int, data):
    device = get_device(db, device_id)
    if device:
        for key, value in data.dict().items():
            setattr(device, key, value)
        db.commit()
        db.refresh(device)
    return device

def get_metrics(db):
    return db.query(models.Metric).all()


# USER
def create_user(db: Session, user: schemas.UserCreate):
    hashed = hash_password(user.password)
    db_user = models.User(username=user.username, password=hashed, role=user.role)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_users(db: Session):
    return db.query(models.User).all()

def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def delete_user(db: Session, user_id: int):
    user = get_user(db, user_id)
    if user:
        db.delete(user)
        db.commit()
    return user