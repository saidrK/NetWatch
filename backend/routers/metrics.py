from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from auth_utils import get_current_user, require_admin
import crud, schemas

router = APIRouter(prefix="/metrics", tags=["Metrics"])

@router.get("/", response_model=list[schemas.MetricResponse])
def get_metrics(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return crud.get_metrics(db)

@router.post("/", response_model=schemas.MetricResponse)
def create_metric(metric: schemas.MetricCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    return crud.create_metric(db, metric)