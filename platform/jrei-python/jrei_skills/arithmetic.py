"""Portable model-free exact arithmetic; no eval(), shell, SQL, LLM or network.

Supported expressions: bounded integers, +, -, *, /, unary signs and
parentheses; Persian/Arabic digits and multiplication/division glyphs.
This is NOT a general symbolic maths engine or a public chat router.
"""
from __future__ import annotations

import ast
from fractions import Fraction
import re
from typing import Literal

from pydantic import Field
from jrei_core.contracts import StrictContract

_TRANSLATE = str.maketrans(
    "۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩×÷−",
    "01234567890123456789*/-",
)
_ALLOWED = re.compile(r"^[0-9+*/()\s-]+$")
_MAX_INTEGER = 10**12
_MAX_RESULT_PART = 10**18
_MAX_DEPTH = 16


class ArithmeticRequest(StrictContract):
    schema_version: Literal["jr.jrei.arithmetic-request.v1"] = "jr.jrei.arithmetic-request.v1"
    expression: str = Field(min_length=1, max_length=96)


class ArithmeticResult(StrictContract):
    schema_version: Literal["jr.jrei.arithmetic-result.v1"] = "jr.jrei.arithmetic-result.v1"
    expression_normalized: str
    numerator: int
    denominator: int = Field(ge=1)
    exact_fraction: str
    skill_id: Literal["jrei.math.exact_arithmetic.v1"] = "jrei.math.exact_arithmetic.v1"
    performed_without_model: Literal[True] = True
    source_rights_approved: Literal[False] = False
    any_model_weights_changed: Literal[False] = False


class ArithmeticRejected(ValueError):
    pass


def _bounded(value: Fraction) -> Fraction:
    if (abs(value.numerator) > _MAX_RESULT_PART
            or value.denominator > _MAX_RESULT_PART):
        raise ArithmeticRejected("ARITHMETIC_RESULT_LIMIT")
    return value


def _compute(node: ast.AST, depth: int = 0) -> Fraction:
    if depth > _MAX_DEPTH:
        raise ArithmeticRejected("ARITHMETIC_DEPTH_LIMIT")
    if isinstance(node, ast.Expression):
        return _compute(node.body, depth + 1)
    if isinstance(node, ast.Constant) and type(node.value) is int:
        if abs(node.value) > _MAX_INTEGER:
            raise ArithmeticRejected("INTEGER_OPERAND_LIMIT")
        return Fraction(node.value, 1)
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
        value = _compute(node.operand, depth + 1)
        return _bounded(-value if isinstance(node.op, ast.USub) else value)
    if isinstance(node, ast.BinOp) and isinstance(
        node.op, (ast.Add, ast.Sub, ast.Mult, ast.Div)
    ):
        left = _compute(node.left, depth + 1)
        right = _compute(node.right, depth + 1)
        if isinstance(node.op, ast.Add):
            return _bounded(left + right)
        if isinstance(node.op, ast.Sub):
            return _bounded(left - right)
        if isinstance(node.op, ast.Mult):
            return _bounded(left * right)
        if right == 0:
            raise ArithmeticRejected("DIVISION_BY_ZERO")
        return _bounded(left / right)
    raise ArithmeticRejected("UNSUPPORTED_ARITHMETIC_SYNTAX")


def calculate_exact(payload: ArithmeticRequest) -> ArithmeticResult:
    normalized = payload.expression.translate(_TRANSLATE).strip()
    if not normalized or not _ALLOWED.fullmatch(normalized):
        raise ArithmeticRejected("NON_ARITHMETIC_INPUT")
    try:
        tree = ast.parse(normalized, mode="eval")
    except (SyntaxError, ValueError) as exc:
        raise ArithmeticRejected("MALFORMED_EXPRESSION") from exc
    answer = _compute(tree)
    return ArithmeticResult(
        expression_normalized=normalized,
        numerator=answer.numerator,
        denominator=answer.denominator,
        exact_fraction=(str(answer.numerator) if answer.denominator == 1
                        else f"{answer.numerator}/{answer.denominator}"),
    )
