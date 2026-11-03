"""Run with: python3 -m unittest test_speech_text"""
import unittest

from speech_text import speakable


class SpeakableTest(unittest.TestCase):
    def test_money(self):
        self.assertEqual(speakable("O dólar está a R$ 5,49."), "O dólar está a 5 reais e 49 centavos.")
        self.assertEqual(speakable("Custa R$ 1"), "Custa 1 real")
        self.assertEqual(speakable("R$ 1.250,05"), "1250 reais e 5 centavos")
        self.assertEqual(speakable("R$ 3,00"), "3 reais")

    def test_phone_numbers_are_read_digit_by_digit(self):
        self.assertEqual(speakable("Ligue para o SAMU 192"), "Ligue para o Samu um nove dois")
        self.assertEqual(speakable("no número 188."), "no número um oito oito.")
        self.assertEqual(speakable("ligue 193 agora"), "ligue um nove três agora")
        self.assertEqual(speakable("Foram 192 pessoas"), "Foram 192 pessoas")

    def test_numbers_and_units(self):
        self.assertEqual(speakable("São 7.006.652 ao todo"), "São 7006652 ao todo")
        self.assertEqual(speakable("Agora 30°C, com 38% de chuva"), "Agora 30 graus, com 38 por cento de chuva")
        self.assertEqual(speakable("A 80 km/h"), "A 80 quilômetros por hora")

    def test_acronyms_only_as_whole_words(self):
        self.assertEqual(speakable("Use o GPT"), "Use o gê pê tê")
        self.assertEqual(speakable("A IA respondeu"), "A i á respondeu")
        self.assertEqual(speakable("IAGO e PDFs"), "IAGO e PDFs")


if __name__ == "__main__":
    unittest.main()
