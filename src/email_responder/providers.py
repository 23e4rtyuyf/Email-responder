from .models import EmailMessage


class DraftGenerator:
    def __init__(self, api_key: str) -> None:
        self.api_key = api_key

    def generate(self, email: EmailMessage, signer_name: str) -> str:
        opening = f"Hi, thanks for your message about '{email.subject}'."
        body = "We received your email and will follow up shortly."
        closing = f"\n\nBest,\n{signer_name}"
        return f"{opening} {body}{closing}"
