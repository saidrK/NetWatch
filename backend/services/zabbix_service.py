"""
services/zabbix_service.py — Intégration API Zabbix
Récupère hosts, problèmes, métriques depuis Zabbix Server
"""
import logging
import httpx
from typing import Optional

logger = logging.getLogger(__name__)

ZABBIX_URL = "http://zabbix_web:8080/api_jsonrpc.php"
ZABBIX_USER = "Admin"
ZABBIX_PASSWORD = "zabbix"


class ZabbixService:
    def __init__(self):
        self._token: Optional[str] = None

    async def _login(self) -> str:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(ZABBIX_URL, json={
                "jsonrpc": "2.0",
                "method": "user.login",
                "params": {"username": ZABBIX_USER, "password": ZABBIX_PASSWORD},
                "id": 1
            })
            data = r.json()
            self._token = data["result"]
            return self._token

    async def _call(self, method: str, params: dict) -> dict:
        token = self._token or await self._login()
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.post(ZABBIX_URL, json={
                "jsonrpc": "2.0",
                "method": method,
                "params": params,
                "auth": token,
                "id": 1
            })
            data = r.json()
            if "error" in data:
                # Token expiré — re-login
                await self._login()
                return await self._call(method, params)
            return data.get("result", [])

    async def get_hosts(self) -> list:
        try:
            hosts = await self._call("host.get", {
                "output": ["hostid", "host", "name", "status"],
                "selectInterfaces": ["ip", "port", "type"],
                "selectTriggers": ["triggerid", "description", "priority", "value"]
            })
            result = []
            for h in hosts:
                interfaces = h.get("interfaces", [])
                ip = interfaces[0]["ip"] if interfaces else "N/A"
                triggers = h.get("triggers", [])
                nb_problems = sum(1 for t in triggers if t.get("value") == "1")
                result.append({
                    "id":          h["hostid"],
                    "hostname":    h["name"],
                    "ip":          ip,
                    "statut":      "EN_LIGNE" if h["status"] == "0" else "HORS_LIGNE",
                    "nb_problems": nb_problems,
                    "source":      "ZABBIX"
                })
            return result
        except Exception as e:
            logger.error(f"Zabbix get_hosts error: {e}")
            return []

    async def get_problems(self) -> list:
        try:
            problems = await self._call("problem.get", {
                "output":       "extend",
                "selectHosts":  ["host", "name"],
                "recent":       True,
                "sortfield":    ["eventid"],
                "sortorder":    "DESC",
                "limit":        20
            })
            result = []
            for p in problems:
                hosts = p.get("hosts", [])
                hostname = hosts[0]["name"] if hosts else "Inconnu"
                severity_map = {
                    "0": "INFORMATION", "1": "INFORMATION", "2": "WARNING",
                    "3": "AVERAGE",     "4": "HIGH",        "5": "CRITIQUE"
                }
                result.append({
                    "id":        p["eventid"],
                    "hostname":  hostname,
                    "message":   p["name"],
                    "severity":  severity_map.get(p.get("severity", "0"), "INFORMATION"),
                    "timestamp": p["clock"],
                    "source":    "ZABBIX"
                })
            return result
        except Exception as e:
            logger.error(f"Zabbix get_problems error: {e}")
            return []

    async def get_resume(self) -> dict:
        try:
            hosts    = await self.get_hosts()
            problems = await self.get_problems()
            return {
                "total_hosts":    len(hosts),
                "hosts_ok":       sum(1 for h in hosts if h["statut"] == "EN_LIGNE"),
                "hosts_ko":       sum(1 for h in hosts if h["statut"] == "HORS_LIGNE"),
                "total_problems": len(problems),
                "critiques":      sum(1 for p in problems if p["severity"] == "CRITIQUE"),
                "warnings":       sum(1 for p in problems if p["severity"] in ("WARNING", "AVERAGE")),
                "source":         "ZABBIX"
            }
        except Exception as e:
            logger.error(f"Zabbix get_resume error: {e}")
            return {"error": str(e)}


_zabbix_service = ZabbixService()

def get_zabbix_service() -> ZabbixService:
    return _zabbix_service
