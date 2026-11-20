import copy
import json
import os
import tempfile
import unittest
import uuid
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

from webserver.services import lan_discovery as discovery


INSTANCE_ID = "9f0c663b-8ffd-4e13-92d9-2b68572c08b1"
ENDPOINT = {"url": "http://192.168.50.10:8080", "addresses": ["192.168.50.10"], "interfaces": ["lan-a"]}
INVENTORY = {"lan-a": {"index": 2, "addresses": ["192.168.50.10"]}, "lan-b": {"index": 3, "addresses": ["192.168.50.11"]}}


class ProtocolTest(unittest.TestCase):
    def test_shared_publication_vectors(self):
        vectors = json.loads((Path(__file__).parent / "cases/discovery-v1-vectors.json").read_text())
        covered = 0
        for case in vectors["cases"]:
            # Receiver-only TXT, DNS completeness, TTL and source cases belong to Moke.
            payload = copy.deepcopy(vectors["base"])
            payload.update(case["patch"])
            if "txt_hex" in payload or "txt" not in payload:
                continue
            fields = {}
            for part in payload["txt"]:
                key, value = part.split("=", 1)
                fields.setdefault(key.lower(), value)
            if fields.get("txtvers") != "1" or fields.get("id") != INSTANCE_ID:
                continue
            relevant = case["case_id"] in {
                "valid_http",
                "valid_https_prefix",
                "valid_ula",
                "valid_default_http_port",
                "name_as_text",
                "unknown_key",
                "duplicate_key_first_wins",
                "duplicate_invalid_first",
                "name_control",
                "name_too_long",
                "credential_url",
                "url_query",
                "url_fragment",
                "path_traversal",
                "encoded_path",
                "ip_mismatch",
                "loopback",
                "public_address",
                "link_local_v6",
            }
            if not relevant:
                continue
            covered += 1
            with self.subTest(case=case["case_id"]):

                def validate(fields=fields, payload=payload):
                    discovery.public_name({"site_title": fields["name"]})
                    addresses = [discovery.lan_address(a) for a in payload["addresses"]]
                    return discovery.normalize_url(fields["url"], addresses)[0]

                if case["expected"]["decision"] == "candidate":
                    self.assertEqual(validate(), case["expected"].get("base_url", fields["url"]))
                else:
                    self.assertRaises(ValueError, validate)
        self.assertEqual(covered, 19)

    def test_txt_wire_order_ttl_and_no_private_fields(self):
        from zeroconf import ServiceInfo

        raw = discovery.encode_txt(INSTANCE_ID, "家中书库", ENDPOINT["url"])
        self.assertEqual(raw[1:10], b"txtvers=1")
        info = ServiceInfo(
            discovery.SERVICE_TYPE,
            "Talebook-%s-1.%s" % (INSTANCE_ID, discovery.SERVICE_TYPE),
            port=8080,
            properties=raw,
            server="tb-test.local.",
            addresses=[b"\xc0\xa8\x32\x0a"],
            host_ttl=discovery.TTL,
            other_ttl=discovery.TTL,
        )
        self.assertEqual(list(info.properties), [b"txtvers", b"id", b"name", b"url"])
        for record in [info.dns_pointer(), info.dns_service(), info.dns_text(), *info.dns_addresses()]:
            self.assertEqual(record.ttl, 120)
        self.assertLessEqual(len(raw), 400)
        self.assertRaises(ValueError, discovery.encode_txt, INSTANCE_ID, "x" * 256, ENDPOINT["url"])

    def test_config_strictness_and_deduplication(self):
        config = {"LAN_DISCOVERY_ENABLED": True, "site_title": "Test", "LAN_DISCOVERY_ENDPOINTS": [ENDPOINT]}
        self.assertEqual(discovery.validate_config(config), [ENDPOINT])
        for patch in (
            {"LAN_DISCOVERY_ENABLED": "false"},
            {"LAN_DISCOVERY_ENDPOINTS": []},
            {"LAN_DISCOVERY_ENDPOINTS": [ENDPOINT, ENDPOINT]},
            {"site_title": "x" * 97},
        ):
            with self.subTest(patch=patch):
                self.assertRaises(ValueError, discovery.validate_config, dict(config, **patch))
        for url in (
            "http://192.168.50.10:0",
            "http://192.168.50.10:",
            "http://192.168.50.10/a//b",
            "http://192.168.50.10/\n",
            "http://192.168.50.10/\\evil",
            "http://192.168.50.10/?",
        ):
            self.assertRaises(ValueError, discovery.normalize_url, url, ENDPOINT["addresses"])

    def test_id_survives_restart_and_umask(self):
        with tempfile.TemporaryDirectory() as directory:
            old_mask = os.umask(0o002)
            try:
                first = discovery.stable_instance_id(directory)
            finally:
                os.umask(old_mask)
            self.assertEqual(uuid.UUID(first).version, 4)
            self.assertEqual(discovery.stable_instance_id(directory), first)
            self.assertEqual((Path(directory) / "lan-discovery-id").stat().st_mode & 0o777, 0o600)
            (Path(directory) / "lan-discovery-id").write_text("broken")
            self.assertRaises(ValueError, discovery.stable_instance_id, directory)


class FakePublisher:
    active = []
    failure = False

    def __init__(self, interface, inventory):
        self.interface = interface
        self.closed = False
        self.active.append(self)

    async def publish(self, endpoints, instance_id, name):
        if self.failure:
            raise OSError("bind failed")
        self.payload = endpoints, instance_id, name

    async def close(self):
        self.closed = True


class ManagerTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.config = {
            "LAN_DISCOVERY_ENABLED": False,
            "LAN_DISCOVERY_ENDPOINTS": [copy.deepcopy(ENDPOINT)],
            "site_title": "Test",
            "settings_path": self.directory.name,
        }
        self.inventory = copy.deepcopy(INVENTORY)
        FakePublisher.active, FakePublisher.failure = [], False
        self.manager = discovery.DiscoveryManager(self.config, lambda: self.inventory, FakePublisher)

    async def asyncTearDown(self):
        await self.manager.close()
        self.directory.cleanup()

    async def test_disabled_has_no_resources_and_single_worker(self):
        with mock.patch.object(discovery, "stable_instance_id", side_effect=AssertionError("must not write ID")):
            await self.manager.reconcile()
        self.assertEqual(FakePublisher.active, [])
        self.manager.start()
        task = self.manager.task
        self.manager.start()
        self.assertIs(self.manager.task, task)

    async def test_hot_toggle_restart_name_change_and_id_reuse(self):
        self.config["LAN_DISCOVERY_ENABLED"] = True
        await self.manager.reconcile()
        instance_id = self.manager.instance_id
        publisher = FakePublisher.active[-1]
        await self.manager.reconcile(force=True)
        self.assertEqual(len(FakePublisher.active), 1)
        self.config["site_title"] = "Renamed"
        await self.manager.reconcile()
        self.assertTrue(publisher.closed)
        self.assertEqual(self.manager.instance_id, instance_id)
        self.config["LAN_DISCOVERY_ENABLED"] = False
        await self.manager.reconcile()
        self.assertEqual(self.manager.state, "disabled")
        self.assertTrue(FakePublisher.active[-1].closed)
        self.config["LAN_DISCOVERY_ENABLED"] = True
        await self.manager.reconcile()
        self.assertEqual(self.manager.instance_id, instance_id)

    async def test_network_loss_unregisters_and_recovers(self):
        self.config["LAN_DISCOVERY_ENABLED"] = True
        await self.manager.reconcile()
        publisher = FakePublisher.active[-1]
        self.inventory = {}
        await self.manager.reconcile()
        self.assertEqual(self.manager.state, "error")
        self.assertTrue(publisher.closed)
        self.inventory = copy.deepcopy(INVENTORY)
        await self.manager.reconcile()
        self.assertEqual(self.manager.state, "advertising")

    async def test_address_change_never_guesses_new_url(self):
        self.config["LAN_DISCOVERY_ENABLED"] = True
        await self.manager.reconcile()
        self.inventory["lan-a"]["addresses"] = ["192.168.50.99"]
        await self.manager.reconcile()
        self.assertEqual(self.manager.state, "error")
        self.assertEqual(self.config["LAN_DISCOVERY_ENDPOINTS"][0]["url"], ENDPOINT["url"])
        self.assertEqual(self.manager.resources, [])

    async def test_multiple_sources_and_socket_failure(self):
        self.config["LAN_DISCOVERY_ENABLED"] = True
        self.config["LAN_DISCOVERY_ENDPOINTS"][0]["interfaces"] = ["lan-a", "lan-b"]
        await self.manager.reconcile()
        self.assertEqual(len(FakePublisher.active), 2)
        self.assertEqual(len({p.payload[1] for p in FakePublisher.active}), 1)
        self.config["site_title"] = "Retry"
        FakePublisher.failure = True
        await self.manager.reconcile()
        self.assertEqual(self.manager.state, "error")
        self.assertTrue(all(p.closed for p in FakePublisher.active))
        FakePublisher.failure = False
        await self.manager.reconcile(force=True)
        self.assertEqual(self.manager.state, "advertising")

    async def test_partial_source_loss_preserves_healthy_endpoint(self):
        self.config["LAN_DISCOVERY_ENABLED"] = True
        second = {"url": "http://192.168.50.11:8080", "addresses": ["192.168.50.11"], "interfaces": ["lan-b"]}
        self.config["LAN_DISCOVERY_ENDPOINTS"].append(second)
        await self.manager.reconcile()
        healthy = next(p for p in self.manager.resources if p.interface == "lan-b")
        self.inventory.pop("lan-a")
        await self.manager.reconcile()
        self.assertEqual(self.manager.state, "advertising")
        self.assertIsNotNone(self.manager.error)
        self.assertEqual([p.interface for p in self.manager.resources], ["lan-b"])
        self.assertIs(self.manager.resources[0], healthy)
        self.assertFalse(healthy.closed)

    async def test_manual_override_and_failed_id_write(self):
        manual = SimpleNamespace(settings={"LAN_DISCOVERY_ENABLED": False})
        self.config["LAN_DISCOVERY_ENABLED"] = True
        with mock.patch.dict("sys.modules", manual=manual):
            await self.manager.reconcile()
            self.assertEqual(self.manager.state, "disabled")
        with mock.patch.object(discovery, "stable_instance_id", side_effect=PermissionError()):
            await self.manager.reconcile()
        self.assertEqual(self.manager.state, "error")
        self.assertEqual(FakePublisher.active, [])


if __name__ == "__main__":
    unittest.main()
