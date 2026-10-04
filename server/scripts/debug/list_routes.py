from app.main import app
import json

def list_routes():
    routes = []
    for route in app.routes:
        if hasattr(route, "path"):
            if "upload" in route.path or "knowledge-base" in route.path:
                routes.append({
                    "path": route.path,
                    "name": route.name,
                    "methods": list(route.methods) if hasattr(route, "methods") else []
                })
    
    # Sort by path
    routes.sort(key=lambda x: x["path"])
    
    print(json.dumps(routes, indent=2))

if __name__ == "__main__":
    list_routes()
