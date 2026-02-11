
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

print("Attempting to import app.main...")
try:
    from app.main import app
    print("SUCCESS: app.main imported.")
except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"FAILURE: {e}")
