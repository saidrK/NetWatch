from pydantic import BaseModel
from datetime import datetime

# -------- DEVICE --------
class DeviceBase(BaseModel):
    name: str
    ip_address: str

class DeviceCreate(DeviceBase):
    pass

class DeviceResponse(DeviceBase):
    id: int
    status: str

    class Config:
        from_attributes = True


# -------- METRIC --------
class MetricCreate(BaseModel):
    cpu: float
    ram: float
    bandwidth: float
    device_id: int

class MetricResponse(MetricCreate):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True


# -------- ALERT --------
class AlertCreate(BaseModel):
    message: str
    level: str

class AlertResponse(AlertCreate):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True


# -------- USER --------
class UserCreate(BaseModel):
    username: str
    password: str
    role: str

class UserResponse(BaseModel):
    id: int
    username: str
    role: str

    class Config:
        from_attributes = True