import re


def clean_phone_number(phone: str) -> str:
    return re.sub(r"\D+", "", phone)

