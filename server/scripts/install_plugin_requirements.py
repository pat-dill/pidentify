#!/usr/bin/env python3
"""
Script to discover and install requirements from all plugins in the plugins directory.
"""

import importlib
import inspect
import subprocess
import sys
from pathlib import Path

# Add the server directory to the path so we can import modules
server_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(server_dir))

from server.music_id.base import TrackIdPlugin


def discover_plugins(plugins_dir: Path) -> list[type[TrackIdPlugin]]:
    """Discover all plugin classes in the plugins directory."""
    plugins = []
    
    # Get all Python files in the plugins directory (excluding __init__.py and __pycache__)
    for plugin_file in plugins_dir.glob("*.py"):
        if plugin_file.name == "__init__.py":
            continue
            
        plugin_name = plugin_file.stem
        try:
            # Import the plugin module
            plugin_module = importlib.import_module(
                f"server.music_id.plugins.{plugin_name}",
                package="server.music_id.plugins"
            )
            
            # Find all classes that inherit from TrackIdPlugin
            for name, item in inspect.getmembers(plugin_module, inspect.isclass):
                if (issubclass(item, TrackIdPlugin) and 
                    item is not TrackIdPlugin and 
                    item.__module__ == plugin_module.__name__):
                    plugins.append(item)
        except Exception as e:
            print(f"Warning: Failed to load plugin {plugin_name}: {e}", file=sys.stderr)
            continue
    
    return plugins


def collect_requirements(plugins: list[type[TrackIdPlugin]]) -> set[str]:
    """Collect all unique requirements from plugins."""
    requirements = set()
    
    for plugin_class in plugins:
        plugin_requirements = getattr(plugin_class, 'requirements', [])
        if isinstance(plugin_requirements, list):
            requirements.update(plugin_requirements)
        elif plugin_requirements:
            requirements.add(str(plugin_requirements))
    
    return requirements


def install_requirements(requirements: set[str]) -> int:
    """Install requirements using pip."""
    if not requirements:
        print("No plugin requirements to install.")
        return 0
    
    print(f"Installing {len(requirements)} plugin requirement(s)...")
    for req in sorted(requirements):
        print(f"  - {req}")
    
    # Install all requirements at once
    cmd = [sys.executable, "-m", "pip", "install", "--no-cache-dir"] + sorted(requirements)
    
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print("Plugin requirements installed successfully.")
        return 0
    except subprocess.CalledProcessError as e:
        print(f"Error installing plugin requirements: {e}", file=sys.stderr)
        print(f"stdout: {e.stdout}", file=sys.stderr)
        print(f"stderr: {e.stderr}", file=sys.stderr)
        return 1


def main():
    """Main entry point."""
    # Get the plugins directory
    plugins_dir = server_dir / "music_id" / "plugins"
    
    if not plugins_dir.exists():
        print(f"Plugins directory not found: {plugins_dir}", file=sys.stderr)
        return 1
    
    print(f"Discovering plugins in {plugins_dir}...")
    plugins = discover_plugins(plugins_dir)
    
    if not plugins:
        print("No plugins found.")
        return 0
    
    print(f"Found {len(plugins)} plugin(s):")
    for plugin_class in plugins:
        print(f"  - {plugin_class.__name__}")
    
    requirements = collect_requirements(plugins)
    
    if requirements:
        return install_requirements(requirements)
    else:
        print("No requirements found in plugins.")
        return 0


if __name__ == "__main__":
    sys.exit(main())

