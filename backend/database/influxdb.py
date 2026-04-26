"""
database/influxdb.py — Connexion InfluxDB pour les séries temporelles
Schéma : measurement=metriques, tags=[equipement_id, source], fields=[cpu, ram, bp, dispo]
Rétention : 30 jours, downsampling horaire après 7 jours
"""
from datetime import datetime
from dataclasses import dataclass, field
import logging

from influxdb_client.client.influxdb_client_async import InfluxDBClientAsync
from influxdb_client import Point, WritePrecision

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Structure d'une métrique
@dataclass
class Metrique:
    equipement_id : int
    source        : str          # PROMETHEUS | SNMP | ZABBIX
    cpu_usage     : float = 0.0  # %
    ram_usage     : float = 0.0  # %
    bp_entrant    : float = 0.0  # Mbps
    bp_sortant    : float = 0.0  # Mbps
    disponible    : bool  = True
    timestamp     : datetime = field(default_factory=datetime.utcnow)

# Service InfluxDB 
class InfluxDBService:

    def __init__(self):
        self.url    = settings.influxdb_url
        self.token  = settings.influxdb_token
        self.org    = settings.influxdb_org
        self.bucket = settings.influxdb_bucket

    def _client(self) -> InfluxDBClientAsync:
        return InfluxDBClientAsync(
            url=self.url, token=self.token, org=self.org
        )

    # Écriture 
    async def ecrire(self, m: Metrique) -> bool:
        """Écrit une métrique dans InfluxDB."""
        point = (
            Point("metriques")
            .tag("equipement_id", str(m.equipement_id))
            .tag("source", m.source)
            .field("cpu_usage",  m.cpu_usage)
            .field("ram_usage",  m.ram_usage)
            .field("bp_entrant", m.bp_entrant)
            .field("bp_sortant", m.bp_sortant)
            .field("disponible", int(m.disponible))
            .time(m.timestamp, WritePrecision.SECONDS)
        )
        try:
            async with self._client() as client:
                await client.write_api().write(
                    bucket=self.bucket, org=self.org, record=point
                )
            return True
        except Exception as e:
            logger.error(f"❌ InfluxDB écriture : {e}")
            return False

    # Lecture — dernière métrique d'un équipement 
    async def derniere(self, equipement_id: int) -> Metrique | None:
        query = f"""
        from(bucket: "{self.bucket}")
          |> range(start: -1h)
          |> filter(fn: (r) => r._measurement == "metriques")
          |> filter(fn: (r) => r.equipement_id == "{equipement_id}")
          |> last()
          |> pivot(rowKey:["_time"], columnKey:["_field"], valueColumn:"_value")
        """
        rows = await self._query(query)
        return rows[0] if rows else None

    # Lecture — historique sur une période
    async def historique(
        self,
        equipement_id: int,
        debut: datetime,
        fin: datetime,
    ) -> list[Metrique]:
        query = f"""
        from(bucket: "{self.bucket}")
          |> range(start: {debut.strftime("%Y-%m-%dT%H:%M:%SZ")},
                   stop:  {fin.strftime("%Y-%m-%dT%H:%M:%SZ")})
          |> filter(fn: (r) => r._measurement == "metriques")
          |> filter(fn: (r) => r.equipement_id == "{equipement_id}")
          |> pivot(rowKey:["_time"], columnKey:["_field"], valueColumn:"_value")
        """
        return await self._query(query)

    # Lecture — toutes les dernières métriques (pour l'IA)
    async def toutes_dernieres(self) -> list[Metrique]:
        query = f"""
        from(bucket: "{self.bucket}")
          |> range(start: -5m)
          |> filter(fn: (r) => r._measurement == "metriques")
          |> last()
          |> pivot(rowKey:["_time","equipement_id"], columnKey:["_field"], valueColumn:"_value")
        """
        return await self._query(query)

    # Exécution requête Flux 
    async def _query(self, flux: str) -> list[Metrique]:
        resultats = []
        try:
            async with self._client() as client:
                tables = await client.query_api().query(flux, org=self.org)
                for table in tables:
                    for r in table.records:
                        v = r.values
                        resultats.append(Metrique(
                            equipement_id=int(v.get("equipement_id", 0)),
                            source=v.get("source", "PROMETHEUS"),
                            cpu_usage=float(v.get("cpu_usage", 0)),
                            ram_usage=float(v.get("ram_usage", 0)),
                            bp_entrant=float(v.get("bp_entrant", 0)),
                            bp_sortant=float(v.get("bp_sortant", 0)),
                            disponible=bool(v.get("disponible", 1)),
                            timestamp=r.get_time(),
                        ))
        except Exception as e:
            logger.error(f"❌ InfluxDB lecture : {e}")
        return resultats


# Dépendance FastAPI 
def get_influx() -> InfluxDBService:
    return InfluxDBService()
