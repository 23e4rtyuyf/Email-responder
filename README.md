# Email-responder

A starter Python project for automatically drafting safe email replies.

## What this project is made of

- `src/email_responder/models.py` — email data model
- `src/email_responder/config.py` — app configuration from environment variables
- `src/email_responder/providers.py` — draft generation provider abstraction
- `src/email_responder/pipeline.py` — filtering + reply orchestration
- `src/main.py` — runnable example
- `tests/test_pipeline.py` — unit tests
- `.env.example` — environment variable template

## Setup

1. Use Python 3.10+
2. Copy environment template:
   ```bash
   cp .env.example .env
   ```
3. Add your own `EMAIL_RESPONDER_API_KEY` value in `.env`

## Run

```bash
python src/main.py
```

## Test

```bash
python -m unittest discover -s tests -p "test_*.py"
```

## About the API key

This repository does not contain any real API key. You must create one from the provider you plan to use and put it in your local `.env` file.
