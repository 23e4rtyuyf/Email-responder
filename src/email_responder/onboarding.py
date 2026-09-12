from dataclasses import dataclass
from secrets import token_urlsafe


@dataclass
class SignupSession:
    token: str
    click_count: int = 0
    started: bool = False
    email: str | None = None
    activated: bool = False


class SignupManager:
    def __init__(self) -> None:
        self._sessions: dict[str, SignupSession] = {}

    def get_or_create(self, token: str | None = None) -> SignupSession:
        if token and token in self._sessions:
            return self._sessions[token]

        token = token_urlsafe(18)
        session = SignupSession(token=token)
        self._sessions[token] = session
        return session

    def start_setup(self, token: str) -> SignupSession:
        session = self._must_get(token)
        session.started = True
        session.click_count = max(session.click_count, 1)
        return session

    def connect_email(self, token: str, email: str) -> SignupSession:
        session = self._must_get(token)
        normalized = email.strip().lower()

        if not normalized or "@" not in normalized or "." not in normalized.rsplit("@", 1)[-1]:
            raise ValueError("Please enter a valid email address.")

        session.email = normalized
        session.click_count = max(session.click_count, 2)
        return session

    def activate(self, token: str) -> SignupSession:
        session = self._must_get(token)

        if not session.email:
            raise ValueError("Connect an email before activation.")

        session.activated = True
        session.click_count = max(session.click_count, 3)
        return session

    def _must_get(self, token: str) -> SignupSession:
        if token not in self._sessions:
            raise ValueError("Session not found.")
        return self._sessions[token]
