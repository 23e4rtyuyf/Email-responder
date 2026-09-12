import unittest

from src.email_responder import AppConfig, EmailMessage, EmailResponder


class EmailResponderTests(unittest.TestCase):
    def setUp(self) -> None:
        self.responder = EmailResponder(AppConfig(api_key="test-key"))

    def test_blocks_manual_review_terms(self) -> None:
        email = EmailMessage(
            sender="x@example.com",
            subject="Legal Notice",
            body="Please review this legal notice",
        )
        self.assertEqual(self.responder.handle(email), "Manual review required.")

    def test_generates_reply_for_normal_message(self) -> None:
        email = EmailMessage(
            sender="x@example.com",
            subject="Help",
            body="Need help with account",
        )
        reply = self.responder.handle(email)
        self.assertIn("Hi, thanks for your message", reply)
        self.assertIn("Best,", reply)


if __name__ == "__main__":
    unittest.main()
