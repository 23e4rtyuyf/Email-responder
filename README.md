# Email-responder

A Python email responder app with a built-in three-click website onboarding flow.

## What this project is made of

- `src/email_responder/models.py` — email data model
- `src/email_responder/config.py` — app configuration from environment variables
- `src/email_responder/providers.py` — draft generation provider abstraction
- `src/email_responder/pipeline.py` — filtering + reply orchestration
- `src/email_responder/onboarding.py` — session + signup state manager
- `src/email_responder/web.py` — lightweight website and onboarding routes
- `src/main.py` — CLI example
- `src/web_main.py` — website entrypoint
- `tests/test_pipeline.py` — responder tests
- `tests/test_onboarding.py` — onboarding flow tests
- `.env.example` — environment variable template

## Setup

1. Use Python 3.10+
2. Copy environment template:
   ```bash
   cp .env.example .env
   ```
3. Add your own `EMAIL_RESPONDER_API_KEY` value in `.env`

## Run website (three-click signup)

```bash
python src/web_main.py
```

Open `http://127.0.0.1:8000` and complete:

1. **Start setup**
2. **Connect email**
3. **Activate**

## Run CLI demo

```bash
python src/main.py
```

## Test

```bash
python -m unittest discover -s tests -p "test_*.py"
```

## About the API key

This repository does not contain any real API key. You must create one from the provider you plan to use and put it in your local `.env` file.
