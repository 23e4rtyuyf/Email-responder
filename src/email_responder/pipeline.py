from .config import AppConfig
from .models import EmailMessage
from .providers import DraftGenerator


class EmailResponder:
    def __init__(self, config: AppConfig) -> None:
        self.config = config
        self.generator = DraftGenerator(config.api_key)

    def should_auto_reply(self, email: EmailMessage) -> bool:
        lowered = f"{email.subject} {email.body}".lower()
        blocked_terms = ["unsubscribe", "legal notice", "do not reply"]
        return not any(term in lowered for term in blocked_terms)

    def create_reply(self, email: EmailMessage) -> str:
        return self.generator.generate(email=email, signer_name=self.config.from_name)

    def handle(self, email: EmailMessage) -> str:
        if not self.should_auto_reply(email):
            return "Manual review required."
        return self.create_reply(email)
