"""Source-only model-off mathematical skill regression fixtures (NOT run)."""
from __future__ import annotations

import unittest
from pydantic import ValidationError
from jrei_skills.arithmetic import (
    ArithmeticRejected, ArithmeticRequest, calculate_exact,
)


def calculate(expr):
    return calculate_exact(ArithmeticRequest(expression=expr))


class ModelFreeArithmeticCases(unittest.TestCase):
    def test_qwen_failure_case_correct(self):
        answer = calculate("۱۲ × ۷")
        self.assertEqual((answer.numerator, answer.denominator), (84, 1))
        self.assertEqual(answer.exact_fraction, "84")
        self.assertTrue(answer.performed_without_model)

    def test_arabic_persian_digits_and_division(self):
        self.assertEqual(calculate("١٢ ÷ ٥").exact_fraction, "12/5")
        self.assertEqual(calculate("(۲ + ۳) * ۴").exact_fraction, "20")

    def test_exact_non_floating_arithmetic(self):
        self.assertEqual(calculate("1/3+1/6").exact_fraction, "1/2")
        self.assertEqual(calculate("-5 * (3-7)").exact_fraction, "20")

    def test_injection_not_interpreted_as_arithmetic(self):
        with self.assertRaises(ArithmeticRejected):
            calculate("__import__('os').system('id')")

    def test_no_exponents_or_attributes(self):
        for expr in ("2 ** 40", "1 .real", "2**10", "9999999999999999"):
            with self.subTest(expr=expr), self.assertRaises(ArithmeticRejected):
                calculate(expr)

    def test_zero_division_rejected(self):
        with self.assertRaises(ArithmeticRejected):
            calculate("12/(3-3)")

    def test_arbitrary_input_not_accepted(self):
        with self.assertRaises(ValidationError):
            ArithmeticRequest(expression="12" * 100)


if __name__ == "__main__":
    unittest.main()
