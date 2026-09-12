from __future__ import annotations

from dataclasses import dataclass
from html import escape
from http.cookies import SimpleCookie
from urllib.parse import parse_qs
from wsgiref.simple_server import make_server

from .config import AppConfig
from .models import EmailMessage
from .onboarding import SignupManager, SignupSession
from .pipeline import EmailResponder

COOKIE_NAME = "email_responder_session"


@dataclass
class HttpResponse:
    status: str
    headers: list[tuple[str, str]]
    body: bytes


class ResponderWebApp:
    def __init__(self) -> None:
        self.signup = SignupManager()

    def __call__(self, environ: dict, start_response) -> list[bytes]:
        response = self.handle_request(environ)
        start_response(response.status, response.headers)
        return [response.body]

    def handle_request(self, environ: dict) -> HttpResponse:
        method = environ.get("REQUEST_METHOD", "GET").upper()
        path = environ.get("PATH_INFO", "/")

        session, set_cookie_header = self._session_from_request(environ)

        if method == "GET" and path == "/":
            return self._with_cookie(self._landing_page(), set_cookie_header)

        if method == "POST" and path == "/start":
            self.signup.start_setup(session.token)
            return self._with_cookie(self._redirect("/setup"), set_cookie_header)

        if method == "GET" and path == "/setup":
            return self._with_cookie(self._setup_page(session), set_cookie_header)

        if method == "POST" and path == "/connect-email":
            form = self._parse_post_data(environ)
            email = form.get("email", [""])[0]
            try:
                session = self.signup.connect_email(session.token, email)
                return self._with_cookie(self._redirect("/confirm"), set_cookie_header)
            except ValueError as err:
                return self._with_cookie(self._setup_page(session, error=str(err)), set_cookie_header)

        if method == "GET" and path == "/confirm":
            if not session.email:
                return self._with_cookie(self._redirect("/setup"), set_cookie_header)
            return self._with_cookie(self._confirm_page(session), set_cookie_header)

        if method == "POST" and path == "/activate":
            try:
                session = self.signup.activate(session.token)
            except ValueError as err:
                return self._with_cookie(self._setup_page(session, error=str(err)), set_cookie_header)

            sample_reply = EmailResponder(AppConfig.from_env()).handle(
                EmailMessage(
                    sender=session.email or "customer@example.com",
                    subject="Welcome",
                    body="I just signed up."
                )
            )
            return self._with_cookie(self._success_page(session, sample_reply), set_cookie_header)

        return self._with_cookie(
            HttpResponse(
                status="404 Not Found",
                headers=[("Content-Type", "text/html; charset=utf-8")],
                body=b"Not Found",
            ),
            set_cookie_header,
        )

    def _session_from_request(self, environ: dict) -> tuple[SignupSession, str]:
        cookie_header = environ.get("HTTP_COOKIE", "")
        cookie = SimpleCookie()
        cookie.load(cookie_header)

        token = None
        if COOKIE_NAME in cookie:
            token = cookie[COOKIE_NAME].value

        session = self.signup.get_or_create(token)
        set_cookie = f"{COOKIE_NAME}={session.token}; Path=/; HttpOnly; SameSite=Lax"
        return session, set_cookie

    def _parse_post_data(self, environ: dict) -> dict[str, list[str]]:
        try:
            length = int(environ.get("CONTENT_LENGTH", "0") or "0")
        except ValueError:
            length = 0

        body = environ.get("wsgi.input").read(length).decode("utf-8") if length > 0 else ""
        return parse_qs(body)

    def _landing_page(self) -> HttpResponse:
        return self._html_page(
            title="Email Responder Setup",
            content=(
                "<h1>Set up Email Responder</h1>"
                "<p>Three clicks to go live:</p>"
                "<ol><li>Start setup</li><li>Connect email</li><li>Activate</li></ol>"
                "<form method='post' action='/start'><button type='submit'>1) Start setup</button></form>"
            ),
        )

    def _setup_page(self, session: SignupSession, error: str | None = None) -> HttpResponse:
        error_html = f"<p style='color: red;'>{escape(error)}</p>" if error else ""
        started_note = "<p>Step 1 complete.</p>" if session.started else "<p>Please click start first.</p>"
        return self._html_page(
            title="Connect your email",
            content=(
                "<h1>Connect your email</h1>"
                f"{started_note}"
                f"{error_html}"
                "<form method='post' action='/connect-email'>"
                "<label>Email: <input type='email' name='email' required></label>"
                "<button type='submit'>2) Connect email</button>"
                "</form>"
            ),
        )

    def _confirm_page(self, session: SignupSession) -> HttpResponse:
        email = escape(session.email or "")
        return self._html_page(
            title="Activate auto replies",
            content=(
                "<h1>Activate auto replies</h1>"
                f"<p>Connected email: <strong>{email}</strong></p>"
                "<form method='post' action='/activate'>"
                "<button type='submit'>3) Activate</button>"
                "</form>"
            ),
        )

    def _success_page(self, session: SignupSession, sample_reply: str) -> HttpResponse:
        return self._html_page(
            title="You're live",
            content=(
                "<h1>Setup complete ✅</h1>"
                f"<p>Email <strong>{escape(session.email or '')}</strong> is active.</p>"
                f"<p>Clicks used: <strong>{session.click_count}</strong></p>"
                "<h2>Sample draft</h2>"
                f"<pre>{escape(sample_reply)}</pre>"
            ),
        )

    def _html_page(self, title: str, content: str) -> HttpResponse:
        html = (
            "<!doctype html><html><head>"
            f"<title>{escape(title)}</title>"
            "<meta charset='utf-8'></head><body>"
            f"{content}</body></html>"
        )
        return HttpResponse(
            status="200 OK",
            headers=[("Content-Type", "text/html; charset=utf-8")],
            body=html.encode("utf-8"),
        )

    def _redirect(self, location: str) -> HttpResponse:
        return HttpResponse(
            status="303 See Other",
            headers=[("Location", location)],
            body=b"",
        )

    def _with_cookie(self, response: HttpResponse, set_cookie_header: str) -> HttpResponse:
        headers = response.headers + [("Set-Cookie", set_cookie_header)]
        return HttpResponse(status=response.status, headers=headers, body=response.body)


def run_server(host: str = "127.0.0.1", port: int = 8000) -> None:
    app = ResponderWebApp()
    with make_server(host, port, app) as server:
        print(f"Email Responder site running at http://{host}:{port}")
        server.serve_forever()
