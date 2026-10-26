"""The local worker route is exact, read-only and loopback-only."""
import asyncio
import unittest
from fastapi import HTTPException, Request
from jrei_service.app import loopback_fixed_worker_canary
from jrei_skills.arithmetic import ArithmeticRequest

def request(peer="127.0.0.1"):
    return Request({"type": "http", "method": "POST", "path": "/internal/v1/worker/arithmetic",
                    "headers": [], "client": (peer, 50001), "server": ("127.0.0.1", 8091)})

class FirstCanaryTests(unittest.TestCase):
    def test_loopback_exact_real_result(self):
        value = asyncio.run(loopback_fixed_worker_canary(ArithmeticRequest(expression="12*7"), request()))
        self.assertEqual(value.numerator, 84)
        self.assertEqual(value.denominator, 1)
        self.assertTrue(value.performed_without_model)
    def test_external_source_denied(self):
        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(loopback_fixed_worker_canary(ArithmeticRequest(expression="12*7"), request("192.0.2.1")))
        self.assertEqual(ctx.exception.status_code, 403)
    def test_arbitrary_math_denied(self):
        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(loopback_fixed_worker_canary(ArithmeticRequest(expression="100*100"), request()))
        self.assertEqual(ctx.exception.status_code, 422)
if __name__ == "__main__":
    unittest.main()
