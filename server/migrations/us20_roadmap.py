"""
US20: Roadmap Generator Migration
Creates roadmap-related tables for AI implementation roadmap generator.
"""
import asyncio
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import engine, AsyncSessionLocal

async def create_tables():
    """Create roadmap tables."""
    
    # Roadmaps
    create_roadmaps = """
    CREATE TABLE IF NOT EXISTS roadmaps (
        id VARCHAR(36) PRIMARY KEY,
        workshop_id VARCHAR(36) REFERENCES workshops(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        start_date DATE,
        end_date DATE,
        status VARCHAR(20) DEFAULT 'DRAFT',
        constraints JSONB DEFAULT '{}',
        options JSONB DEFAULT '{}',
        confidence JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    """
    
    # Roadmap Phases
    create_roadmap_phases = """
    CREATE TABLE IF NOT EXISTS roadmap_phases (
        id VARCHAR(36) PRIMARY KEY,
        roadmap_id VARCHAR(36) REFERENCES roadmaps(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        order_index INTEGER NOT NULL,
        start_date DATE,
        end_date DATE,
        duration_weeks INTEGER,
        status VARCHAR(20) DEFAULT 'NOT_STARTED',
        description VARCHAR(500)
    );
    """
    
    # Roadmap Tasks
    create_roadmap_tasks = """
    CREATE TABLE IF NOT EXISTS roadmap_tasks (
        id VARCHAR(36) PRIMARY KEY,
        phase_id VARCHAR(36) REFERENCES roadmap_phases(id) ON DELETE CASCADE,
        use_case_id VARCHAR(36) REFERENCES use_cases(id) ON DELETE SET NULL,
        name VARCHAR(200) NOT NULL,
        description VARCHAR(1000),
        start_date DATE,
        end_date DATE,
        duration_days INTEGER,
        progress_percent INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'NOT_STARTED',
        assigned_resources JSONB DEFAULT '[]'
    );
    """
    
    # Task Dependencies
    create_task_dependencies = """
    CREATE TABLE IF NOT EXISTS task_dependencies (
        id VARCHAR(36) PRIMARY KEY,
        from_task_id VARCHAR(36) REFERENCES roadmap_tasks(id) ON DELETE CASCADE,
        to_task_id VARCHAR(36) REFERENCES roadmap_tasks(id) ON DELETE CASCADE,
        dependency_type VARCHAR(20) DEFAULT 'FINISH_TO_START',
        lag_days INTEGER DEFAULT 0
    );
    """
    
    # Roadmap Milestones
    create_roadmap_milestones = """
    CREATE TABLE IF NOT EXISTS roadmap_milestones (
        id VARCHAR(36) PRIMARY KEY,
        roadmap_id VARCHAR(36) REFERENCES roadmaps(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        target_date DATE,
        actual_date DATE,
        status VARCHAR(20) DEFAULT 'PENDING',
        deliverables JSONB DEFAULT '[]',
        owner VARCHAR(100),
        description VARCHAR(500)
    );
    """
    
    # Resource Allocations
    create_resource_allocations = """
    CREATE TABLE IF NOT EXISTS resource_allocations (
        id VARCHAR(36) PRIMARY KEY,
        task_id VARCHAR(36) REFERENCES roadmap_tasks(id) ON DELETE CASCADE,
        role VARCHAR(100) NOT NULL,
        fte VARCHAR(10) NOT NULL,
        skills_required JSONB DEFAULT '[]',
        notes VARCHAR(500)
    );
    """
    
    # Roadmap Scenarios
    create_roadmap_scenarios = """
    CREATE TABLE IF NOT EXISTS roadmap_scenarios (
        id VARCHAR(36) PRIMARY KEY,
        roadmap_id VARCHAR(36) REFERENCES roadmaps(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        adjustments JSONB DEFAULT '{}',
        results JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    """
    
    # Indexes
    create_indexes = """
    CREATE INDEX IF NOT EXISTS idx_roadmaps_workshop_id ON roadmaps(workshop_id);
    CREATE INDEX IF NOT EXISTS idx_roadmap_phases_roadmap_id ON roadmap_phases(roadmap_id);
    CREATE INDEX IF NOT EXISTS idx_roadmap_tasks_phase_id ON roadmap_tasks(phase_id);
    CREATE INDEX IF NOT EXISTS idx_roadmap_tasks_use_case_id ON roadmap_tasks(use_case_id);
    CREATE INDEX IF NOT EXISTS idx_task_dependencies_from_task ON task_dependencies(from_task_id);
    CREATE INDEX IF NOT EXISTS idx_task_dependencies_to_task ON task_dependencies(to_task_id);
    CREATE INDEX IF NOT EXISTS idx_roadmap_milestones_roadmap_id ON roadmap_milestones(roadmap_id);
    CREATE INDEX IF NOT EXISTS idx_resource_allocations_task_id ON resource_allocations(task_id);
    CREATE INDEX IF NOT EXISTS idx_roadmap_scenarios_roadmap_id ON roadmap_scenarios(roadmap_id);
    """
    
    async with engine.begin() as conn:
        print("Creating roadmaps table...")
        await conn.execute(text(create_roadmaps))
        
        print("Creating roadmap_phases table...")
        await conn.execute(text(create_roadmap_phases))
        
        print("Creating roadmap_tasks table...")
        await conn.execute(text(create_roadmap_tasks))
        
        print("Creating task_dependencies table...")
        await conn.execute(text(create_task_dependencies))
        
        print("Creating roadmap_milestones table...")
        await conn.execute(text(create_roadmap_milestones))
        
        print("Creating resource_allocations table...")
        await conn.execute(text(create_resource_allocations))
        
        print("Creating roadmap_scenarios table...")
        await conn.execute(text(create_roadmap_scenarios))
        
        print("Creating indexes...")
        await conn.execute(text(create_indexes))
        
        print("✅ Roadmap tables created successfully!")

if __name__ == "__main__":
    asyncio.run(create_tables())
