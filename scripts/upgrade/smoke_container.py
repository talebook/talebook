"""Prepare a disposable REAL backend for local upgrade acceptance (no production resources).

The optional HTTPS fixture adapter replaces only public-IP transport, allowing an isolated
loopback TLS server. Signature, TLS hostname/CA, manifests, download, extraction, Supervisor,
SQLite backup and process switching all run unchanged. Never copy fixture code to a release.
"""

import argparse
import base64
import datetime
import json
import shutil
import subprocess
from pathlib import Path

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ed25519, rsa
from cryptography.x509.oid import NameOID


ROOT = Path(__file__).resolve().parents[2]


def prepare(work, image, frontend):
    work.mkdir(parents=True, exist_ok=True)
    context = work / "context"
    context.mkdir()
    for name in ("webserver", "docker", "conf", "scripts/upgrade"):
        shutil.copytree(ROOT / name, context / name, ignore=shutil.ignore_patterns("__pycache__", "*.pyc"))
    shutil.copy(ROOT / "server.py", context)
    shutil.copy(ROOT / "requirements.txt", context)
    shutil.copytree(frontend, context / "app/dist")
    if not (context / "app/dist/index.html").exists():
        shutil.copy(context / "app/dist/200.html", context / "app/dist/index.html")
    (context / "webserver/version.py").write_text('VERSION = "v1"\nARCH = "amd64"\n')
    # Only these two files are test-only. The trusted executor itself is copied unmodified.
    (context / "fixture_executor.py").write_text("""import runpy, socket, sys
sys.path.insert(0, '/opt/talebook-upgrade')
import protocol

def connect(self):
    if self.host != 'updates.test':
        raise protocol.UpgradeError('source_address')
    self.sock = self._context.wrap_socket(socket.create_connection(('127.0.0.1', 8443), timeout=10), server_hostname=self.host)
protocol.PinnedHTTPS.connect = connect
runpy.run_path('/opt/talebook-upgrade/executor.py', run_name='__main__')
""")
    (context / "fixture_server.py").write_text("""import http.server, os, ssl
os.chdir('/fixture/resources')
server = http.server.ThreadingHTTPServer(('127.0.0.1', 8443), http.server.SimpleHTTPRequestHandler)
ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ctx.load_cert_chain('/fixture/tls.crt', '/fixture/tls.key')
server.socket = ctx.wrap_socket(server.socket, server_side=True)
server.serve_forever()
""")
    (context / "Dockerfile").write_text(f"""FROM {image}
COPY webserver/ /var/www/talebook/webserver/
COPY server.py /var/www/talebook/server.py
RUN rm -rf /var/www/talebook/app/dist
COPY app/dist/ /var/www/talebook/app/dist/
COPY docker/start.sh /var/www/talebook/docker/start.sh
COPY conf/nginx/talebook.conf /etc/nginx/conf.d/talebook.conf
COPY conf/supervisor/talebook.conf /etc/supervisor/conf.d/talebook.conf
COPY scripts/upgrade/protocol.py scripts/upgrade/executor.py scripts/upgrade/fingerprint.py /opt/talebook-upgrade/
COPY webserver/self_check.py /opt/talebook-upgrade/self_check.py
COPY fixture_executor.py fixture_server.py /test/
COPY Dockerfile requirements.txt /opt/contract/
COPY conf/ /opt/contract/conf/
COPY docker/start.sh /opt/contract/docker/start.sh
COPY webserver/models.py webserver/migrate_db.py webserver/self_check.py /opt/contract/webserver/
RUN python3 /opt/talebook-upgrade/fingerprint.py /opt/contract /opt/talebook-upgrade/image.json amd64 v1 1 {"1" * 40} \\
    && chmod +x /var/www/talebook/server.py /var/www/talebook/docker/start.sh \\
    && sed -i 's|command=python3 /opt/talebook-upgrade/executor.py|command=python3 /test/fixture_executor.py|' /etc/supervisor/conf.d/talebook.conf
ENV TALEBOOK_UPGRADE_MODE=spa SSL_CERT_FILE=/fixture/tls.crt
CMD ["/var/www/talebook/docker/start.sh"]
""")
    (context / "conf/supervisor/talebook.conf").write_text(
        (context / "conf/supervisor/talebook.conf").read_text()
        + """
[program:upgrade-fixture]
command=python3 /test/fixture_server.py
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/data/log/fixture.log
"""
    )
    fixture = work / "fixture"
    (fixture / "resources").mkdir(parents=True)
    key = ed25519.Ed25519PrivateKey.generate()
    (fixture / "signing.pem").write_bytes(
        key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
    )
    public = base64.b64encode(
        key.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
    ).decode()
    (fixture / "config.json").write_text(json.dumps({"keys": {"test": public}, "sources": ["https://updates.test"]}))
    tls_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "updates.test")])
    now = datetime.datetime.now(datetime.timezone.utc)
    cert = (
        x509.CertificateBuilder()
        .subject_name(name)
        .issuer_name(name)
        .public_key(tls_key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now - datetime.timedelta(minutes=5))
        .not_valid_after(now + datetime.timedelta(days=2))
        .add_extension(x509.SubjectAlternativeName([x509.DNSName("updates.test")]), critical=False)
        .sign(tls_key, hashes.SHA256())
    )
    (fixture / "tls.crt").write_bytes(cert.public_bytes(serialization.Encoding.PEM))
    (fixture / "tls.key").write_bytes(
        tls_key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
    )
    for path in fixture.glob("*.pem"):
        path.chmod(0o600)
    (fixture / "tls.key").chmod(0o600)
    subprocess.run(["docker", "build", "-t", "talebook:tb213-smoke", str(context)], check=True)
    # The bind mount persists over recreation. Do not use a production data directory.
    (work / "data").mkdir()
    print("Prepared disposable image and data. Fixture secrets remain local and must not be attached.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--work", type=Path, required=True)
    parser.add_argument("--runtime-image", default="talebook/talebook:master")
    parser.add_argument("--frontend", type=Path, required=True)
    args = parser.parse_args()
    prepare(args.work.resolve(), args.runtime_image, args.frontend.resolve())


if __name__ == "__main__":
    main()
