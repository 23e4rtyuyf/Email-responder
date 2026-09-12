import unittest

from src.email_responder.onboarding import SignupManager


class SignupManagerTests(unittest.TestCase):
    def setUp(self) -> None:
        self.manager = SignupManager()
        self.session = self.manager.get_or_create()

    def test_three_click_activation_flow(self) -> None:
        self.manager.start_setup(self.session.token)
        self.manager.connect_email(self.session.token, "user@example.com")
        final = self.manager.activate(self.session.token)

        self.assertTrue(final.activated)
        self.assertEqual(final.click_count, 3)
        self.assertEqual(final.email, "user@example.com")

    def test_rejects_invalid_email(self) -> None:
        self.manager.start_setup(self.session.token)
        with self.assertRaises(ValueError):
            self.manager.connect_email(self.session.token, "not-an-email")

    def test_activate_requires_email(self) -> None:
        self.manager.start_setup(self.session.token)
        with self.assertRaises(ValueError):
            self.manager.activate(self.session.token)


if __name__ == "__main__":
    unittest.main()
