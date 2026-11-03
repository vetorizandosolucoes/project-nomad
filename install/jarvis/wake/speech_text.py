"""Rewrites text so it sounds right when read aloud. Captions keep the original."""
import re

SPELLED_DIGITS = {
    "0": "zero",
    "1": "um",
    "2": "dois",
    "3": "três",
    "4": "quatro",
    "5": "cinco",
    "6": "seis",
    "7": "sete",
    "8": "oito",
    "9": "nove",
}

# A phone number is read digit by digit: "um nove dois", not "cento e noventa e dois".
PHONE_NUMBER = re.compile(
    r"\b(SAMU|Bombeiros|CVV|Pol[ií]cia|Defesa Civil|n[uú]mero|ligue(?: para)?|ligar(?: para)?)(\D{0,12}?)\b(\d{3})\b",
    re.IGNORECASE,
)

WORDS = {
    "SAMU": "Samu",
    "CVV": "cê vê vê",
    "GPT": "gê pê tê",
    "IA": "i á",
    "PDF": "pê dê éfe",
    "USB": "u ésse bê",
    "CPF": "cê pê éfe",
    "PF": "pê éfe",
    "km/h": "quilômetros por hora",
    "km": "quilômetros",
    "kg": "quilos",
}
WORD = re.compile(r"\b(" + "|".join(re.escape(word) for word in sorted(WORDS, key=len, reverse=True)) + r")\b")


def _money(match):
    reais = match.group(1).replace(".", "")
    cents = (match.group(2) or "").lstrip("0")
    spoken = f"{reais} {'real' if reais == '1' else 'reais'}"
    if cents:
        spoken += f" e {cents} {'centavo' if cents == '1' else 'centavos'}"
    return spoken


def speakable(text):
    text = re.sub(r"R\$\s*(\d[\d.]*)(?:,(\d{1,2}))?", _money, text)
    text = PHONE_NUMBER.sub(lambda m: f"{m.group(1)}{m.group(2)}{' '.join(SPELLED_DIGITS[d] for d in m.group(3))}", text)
    text = re.sub(r"\b(\d{1,3}(?:\.\d{3})+)\b", lambda m: m.group(1).replace(".", ""), text)
    text = re.sub(r"(\d)\s*°\s*C\b", r"\1 graus", text)
    text = re.sub(r"(\d)\s*%", r"\1 por cento", text)
    return WORD.sub(lambda m: WORDS[m.group(1)], text)
