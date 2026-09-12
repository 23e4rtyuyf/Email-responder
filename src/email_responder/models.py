from dataclasses import dataclass


@dataclass
class EmailMessage:
    sender: str
    subject: str
    body: str
