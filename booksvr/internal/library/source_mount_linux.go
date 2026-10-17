package library

import (
	"crypto/sha256"
	"fmt"
	"os"
	"strconv"
	"strings"
)

// Include nested mounts: a disconnected submount must quarantine its parent
// snapshot too. Marker checks additionally detect an empty underlying directory.
func sourceRootIdentity(root string, info os.FileInfo) string {
	data, err := os.ReadFile("/proc/self/mountinfo")
	if err != nil {
		return sourceFileIdentity(info)
	}
	var relevant []string
	var covering string
	longest := -1
	for _, line := range strings.Split(string(data), "\n") {
		fields := strings.Fields(line)
		if len(fields) < 6 {
			continue
		}
		signature := strings.Join(fields[2:5], " ")
		for i, f := range fields {
			if f == "-" && i+2 < len(fields) {
				signature += " " + fields[i+1] + " " + fields[i+2]
				break
			}
		}
		mount := fields[4]
		if decoded, e := strconv.Unquote(`"` + mount + `"`); e == nil {
			mount = decoded
		}
		if sourceWithin(mount, root) {
			relevant = append(relevant, signature)
		} else if sourceWithin(root, mount) && len(mount) > longest {
			longest = len(mount)
			covering = signature
		}
	}
	sum := sha256.Sum256([]byte(covering + "\n" + strings.Join(relevant, "\n")))
	return fmt.Sprintf("%s:%x", sourceFileIdentity(info), sum)
}
