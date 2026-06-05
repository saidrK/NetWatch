"""
api/v1/zabbix.py — Endpoints Zabbix intégrés dans NetWatch
"""
from fastapi import APIRouter, Depends
from models.utilisateur import Utilisateur
from api.v1.utilisateurs import get_current_user
from services.zabbix_service import ZabbixService

router = APIRouter()

@router.get("/hosts", summary="Hosts supervisés par Zabbix", response_model=None)
async def zabbix_hosts(_: Utilisateur = Depends(get_current_user)):
    return await ZabbixService().get_hosts()

@router.get("/problems", summary="Problèmes actifs Zabbix", response_model=None)
async def zabbix_problems(_: Utilisateur = Depends(get_current_user)):
    return await ZabbixService().get_problems()

@router.get("/resume", summary="Résumé supervision Zabbix", response_model=None)
async def zabbix_resume(_: Utilisateur = Depends(get_current_user)):
    return await ZabbixService().get_resume()
