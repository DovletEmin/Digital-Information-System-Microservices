import json
import re
from typing import Any

class CleanJSONDecoder(json.JSONDecoder):
    """Custom JSON decoder that cleans control characters from strings"""
    
    def decode(self, s: str, **kwargs) -> Any:
        # Remove control characters except newlines, tabs
        cleaned = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', s)
        return super().decode(cleaned, **kwargs)

def clean_json_string(text: str) -> str:
    """Remove problematic control characters from JSON string"""
    return re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', text)
