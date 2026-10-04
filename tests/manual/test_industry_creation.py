"""
Test script to verify new industry creation when adding usecases
"""
import json

# Path to knowledge base file
KB_FILE = r"c:\Users\azvmuser1\windsurf-wrkspace\QbrainLabs\server\app\data\knowledge_base.json"

def check_industries():
    """Check current industries in knowledge base"""
    try:
        with open(KB_FILE, 'r') as f:
            kb_data = json.load(f)
        
        print("Current Industries in Knowledge Base:")
        print("=" * 60)
        
        industries = kb_data.get("industries", [])
        for ind in industries:
            use_case_count = len(ind.get("use_cases", []))
            print(f"- {ind['name']} (ID: {ind['id']}) - {use_case_count} use cases")
        
        print(f"\nTotal Industries: {len(industries)}")
        
        # Check for "General" industry
        general_found = any(
            ind['id'] == 'general' or ind['name'].lower() == 'general' 
            for ind in industries
        )
        
        if general_found:
            print("\n✓ 'General' industry exists")
        else:
            print("\n✗ 'General' industry does NOT exist - will be created on first add")
        
        return industries
        
    except FileNotFoundError:
        print(f"✗ Knowledge base file not found at: {KB_FILE}")
        return []
    except json.JSONDecodeError as e:
        print(f"✗ Error parsing knowledge base JSON: {e}")
        return []
    except Exception as e:
        print(f"✗ Error: {e}")
        return []

if __name__ == "__main__":
    check_industries()
