from sqlalchemy import Column, String, Float, Text, ForeignKey, DateTime, Integer
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.core.database import Base
from app.models.models import GUID, JSONType

class ROICalculation(Base):
    __tablename__ = "roi_calculations"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    use_case_id = Column(GUID(), ForeignKey("use_cases.id"), nullable=False)
    workshop_id = Column(GUID(), ForeignKey("workshops.id"), nullable=False)
    
    # Storing structured data as JSON for flexibility as requested in user story
    costs = Column(JSONType, default={}, nullable=False)
    benefits = Column(JSONType, default={}, nullable=False)
    parameters = Column(JSONType, default={}, nullable=False)
    results = Column(JSONType, default={}, nullable=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    use_case = relationship("UseCase", back_populates="roi_calculation")
    workshop = relationship("Workshop")
    business_case = relationship("BusinessCase", back_populates="roi_calculation", uselist=False)

class BusinessCase(Base):
    __tablename__ = "business_cases"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    use_case_id = Column(GUID(), ForeignKey("use_cases.id"), nullable=False)
    roi_calculation_id = Column(GUID(), ForeignKey("roi_calculations.id"), nullable=False)
    
    content = Column(JSONType, default={}, nullable=False)
    template = Column(String(50), default="formal")
    status = Column(String(20), default="draft")
    document_urls = Column(JSONType, default={})
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    use_case = relationship("UseCase")
    roi_calculation = relationship("ROICalculation", back_populates="business_case")

