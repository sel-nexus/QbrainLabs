"""
Data Source Connector Models
Stores configuration and sync state for external data source integrations.
Supports: Web Crawler, GitHub, SharePoint, Confluence, REST API, Ontology Builder
"""
from sqlalchemy import Column, String, Boolean, Text, DateTime, Integer, Index
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.core.database import Base
from app.models.models import GUID, JSONType


class DataSourceConnector(Base):
    """
    Stores a configured data source connector that pulls content into the RAG KB.
    """
    __tablename__ = "data_source_connectors"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)

    # Identity
    name = Column(String(100), nullable=False)
    connector_type = Column(String(30), nullable=False)
    # web_crawler | github | sharepoint | confluence | rest_api | ontology

    description = Column(String(255), nullable=True)

    # Connector-specific config stored as JSON
    # web_crawler:  { url, depth, include_links }
    # github:       { repo, token, branch, path_filter }
    # sharepoint:   { site_url, tenant_id, client_id, client_secret, folder_path }
    # confluence:   { site_url, email, api_token, space_key }
    # rest_api:     { url, method, headers, params, body, title_field, content_field, response_path }
    # ontology:     { entities: [...], relationships: [...] }
    config = Column(JSONType, default=dict)

    # Status
    status = Column(String(20), default="inactive")
    # inactive | active | syncing | error
    last_synced = Column(DateTime, nullable=True)
    last_error = Column(Text, nullable=True)
    docs_synced = Column(Integer, default=0)

    is_active = Column(Boolean, default=True)

    created_by = Column(GUID(), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        Index("idx_dsc_type", "connector_type"),
        Index("idx_dsc_status", "status"),
        Index("idx_dsc_active", "is_active"),
    )

    def to_dict(self):
        cfg = dict(self.config or {})
        # Mask secrets in the response
        for secret_key in ("token", "client_secret", "api_token", "password"):
            if secret_key in cfg:
                cfg[secret_key] = "••••••••"
        return {
            "id": str(self.id),
            "name": self.name,
            "connector_type": self.connector_type,
            "description": self.description,
            "config": cfg,
            "status": self.status,
            "last_synced": self.last_synced.isoformat() if self.last_synced else None,
            "last_error": self.last_error,
            "docs_synced": self.docs_synced or 0,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
