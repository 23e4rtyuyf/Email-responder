from email_responder import AppConfig, EmailMessage, EmailResponder


def main() -> None:
    config = AppConfig.from_env()
    responder = EmailResponder(config)

    incoming = EmailMessage(
        sender="customer@example.com",
        subject="Order update",
        body="Can I get an update on my order status?",
    )

    reply = responder.handle(incoming)
    print(reply)


if __name__ == "__main__":
    main()
