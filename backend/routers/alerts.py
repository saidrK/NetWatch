from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth_utils import get_current_user, require_admin
import crud, schemas
import models

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("/", response_model=list[schemas.AlertResponse])
def get_alerts(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return db.query(models.Alert).all()

@router.post("/", response_model=schemas.AlertResponse)
def create_alert(alert: schemas.AlertCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    return crud.create_alert(db, alert)

@router.delete("/{alert_id}")
def delete_alert(alert_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    db.delete(alert)
    db.commit()
    return {"message": "Alert deleted"}