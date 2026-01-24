"""
Structured logging configuration for production monitoring
"""
import logging
import sys
import json
from datetime import datetime
from typing import Any, Dict
from functools import lru_cache

import structlog
from pythonjsonlogger import jsonlogger


class CustomJsonFormatter(jsonlogger.JsonFormatter):
    """Custom JSON formatter for structured logging"""
    
    def add_fields(self, log_record: Dict, record: logging.LogRecord, message_dict: Dict) -> None:
        super().add_fields(log_record, record, message_dict)
        log_record['timestamp'] = datetime.utcnow().isoformat()
        log_record['level'] = record.levelname
        log_record['logger'] = record.name
        log_record['service'] = 'hotspotmatrix'
        
        if record.exc_info:
            log_record['exception'] = self.formatException(record.exc_info)


def configure_structlog() -> None:
    """Configure structlog for structured logging"""
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.StackInfoRenderer(),
            structlog.dev.set_exc_info,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer()
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


@lru_cache()
def get_logger(name: str = "hotspotmatrix") -> structlog.BoundLogger:
    """Get a configured logger instance"""
    return structlog.get_logger(name)


def setup_logging(
    level: str = "INFO",
    json_format: bool = True,
    log_file: str | None = None
) -> None:
    """
    Set up application logging
    
    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        json_format: Use JSON formatting for production
        log_file: Optional file path for log output
    """
    log_level = getattr(logging, level.upper(), logging.INFO)
    
    # Root logger configuration
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Clear existing handlers
    root_logger.handlers.clear()
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    
    if json_format:
        formatter = CustomJsonFormatter(
            '%(timestamp)s %(level)s %(name)s %(message)s'
        )
    else:
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
    
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # File handler (optional)
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(log_level)
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)
    
    # Configure structlog
    configure_structlog()
    
    # Suppress noisy loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


class RequestLogger:
    """Middleware helper for logging HTTP requests"""
    
    def __init__(self):
        self.logger = get_logger("http")
    
    def log_request(
        self,
        method: str,
        path: str,
        status_code: int,
        duration_ms: float,
        client_ip: str | None = None,
        user_id: str | None = None,
        extra: Dict[str, Any] | None = None
    ) -> None:
        """Log an HTTP request"""
        log_data = {
            "method": method,
            "path": path,
            "status_code": status_code,
            "duration_ms": round(duration_ms, 2),
        }
        
        if client_ip:
            log_data["client_ip"] = client_ip
        if user_id:
            log_data["user_id"] = user_id
        if extra:
            log_data.update(extra)
        
        # Choose log level based on status code
        if status_code >= 500:
            self.logger.error("HTTP Request", **log_data)
        elif status_code >= 400:
            self.logger.warning("HTTP Request", **log_data)
        else:
            self.logger.info("HTTP Request", **log_data)


class AuditLogger:
    """Logger for security and audit events"""
    
    def __init__(self):
        self.logger = get_logger("audit")
    
    def log_auth_event(
        self,
        event_type: str,
        user_id: str | None,
        success: bool,
        ip_address: str | None = None,
        details: Dict[str, Any] | None = None
    ) -> None:
        """Log authentication events"""
        log_data = {
            "event_type": event_type,
            "user_id": user_id,
            "success": success,
            "ip_address": ip_address,
        }
        if details:
            log_data["details"] = details
        
        if success:
            self.logger.info("Auth Event", **log_data)
        else:
            self.logger.warning("Auth Event", **log_data)
    
    def log_data_access(
        self,
        user_id: str,
        resource_type: str,
        resource_id: str,
        action: str,
        ip_address: str | None = None
    ) -> None:
        """Log data access events"""
        self.logger.info(
            "Data Access",
            user_id=user_id,
            resource_type=resource_type,
            resource_id=resource_id,
            action=action,
            ip_address=ip_address
        )


# Singleton instances
request_logger = RequestLogger()
audit_logger = AuditLogger()
