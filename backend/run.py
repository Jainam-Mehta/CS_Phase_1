"""
FastAPI Development Server Runner

Usage:
    python run.py                  # Run on default port 8000
    python run.py --port 8080      # Run on custom port
    python run.py --no-reload      # Disable auto-reload
"""

import uvicorn
import argparse


def main():
    parser = argparse.ArgumentParser(description="Run ColdSense FastAPI Backend")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind to (default: 0.0.0.0)")
    parser.add_argument("--port", type=int, default=8000, help="Port to bind to (default: 8000)")
    parser.add_argument("--no-reload", action="store_true", help="Disable auto-reload")
    parser.add_argument("--log-level", default="info", help="Log level (default: info)")
    
    args = parser.parse_args()
    
    print("=" * 60)
    print("🚀 Starting ColdSense FastAPI Backend")
    print("=" * 60)
    print(f"📍 Host: {args.host}")
    print(f"🔌 Port: {args.port}")
    print(f"🔄 Auto-reload: {'Disabled' if args.no_reload else 'Enabled'}")
    print(f"📊 Log level: {args.log_level}")
    print("-" * 60)
    print(f"📖 API Docs: http://localhost:{args.port}/docs")
    print(f"📚 ReDoc: http://localhost:{args.port}/redoc")
    print("=" * 60)
    
    uvicorn.run(
        "app.main:app",
        host=args.host,
        port=args.port,
        reload=not args.no_reload,
        log_level=args.log_level,
    )


if __name__ == "__main__":
    main()
