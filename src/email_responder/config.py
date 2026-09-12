import os
from dataclasses import dataclass


@dataclass
class AppConfig:
    api_key: str
    from_name: str = "Support Team"

    @classmethod
    def from_env(cls) -> "AppConfig":
        return cls(
            api_key=os.getenv("EMAIL_RESPONDER_API_KEY", ""),
            from_name=os.getenv("EMAIL_RESPONDER_FROM_NAME", "Support Team"),
        )
