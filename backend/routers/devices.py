from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth_utils import get_current_user, require_admin
import crud, schemas

router = APIRouter(prefix="/devices", tags=["Devices"])

@router.get("/", response_model=list[schemas.DeviceResponse])
def read_devices(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return crud.get_devices(db)

@router.get("/{device_id}", response_model=schemas.DeviceResponse)
def get_device(device_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    device = crud.get_device(db, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device

@router.post("/", response_model=schemas.DeviceResponse)
def create_device(device: schemas.DeviceCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    return crud.create_device(db, device)

@router.put("/{device_id}", response_model=schemas.DeviceResponse)
def update_device(device_id: int, data: schemas.DeviceCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    device = crud.update_device(db, device_id, data)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device

@router.delete("/{device_id}")
def delete_device(device_id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    device = crud.delete_device(db, device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return {"message": "Deleted"}