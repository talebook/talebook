"""Replay QA's SQL race with an explicit expected stale-call exception.

The original probe is retained verbatim. Only its replacement callback accepts
the new claim identity, and the old registration exception is captured so its
replacement heartbeat can still be checked after the stale call stops.
"""

import argparse
import json
import tempfile
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--expect", choices=("vulnerable", "fixed"), required=True)
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
source = Path(__file__).with_name("qa-original-invocation-boundary.py").read_text()
source = source[:source.index("\nresults = {}")]
source = source.replace("def process(job_id):", "def process(job_id, _identity=None):")
needle = '        scheduler._begin_invocation(f.job_id, 2, "GENERATING")'
assert source.count(needle) == 1
source = source.replace(
    needle,
    '        try:\n'
    '            scheduler._begin_invocation(f.job_id, 2, "GENERATING")\n'
    '        except RuntimeError as exc:\n'
    '            stopped.append({"type": type(exc).__name__, "message": str(exc)})',
)
stopped = []
namespace = {"stopped": stopped}
exec(compile(source, "qa-original-invocation-boundary.py", "exec"), namespace)
with tempfile.TemporaryDirectory() as temporary:
    result = namespace["lease_interleaving"](Path(temporary))
result["old_call_stopped"] = stopped
vulnerable = args.expect == "vulnerable"
assert result["interleaving_executed"]
assert result["stale_registration_overwrote_new_attempt"] is vulnerable
assert result["replacement_heartbeat_accepted"] is not vulnerable
assert bool(stopped) is not vulnerable
if stopped:
    assert stopped[0]["type"] == "AudiobookLeaseLost"
args.output.write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
