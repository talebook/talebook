package library

import (
	"crypto/sha256"
	"fmt"
	"os"
	"sort"
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
	return sourceMountIdentity(root, info, data)
}

func sourceMountIdentity(root string, info os.FileInfo, data []byte) string {
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
		if mount != root && sourceWithin(mount, root) {
			relevant = append(relevant, signature)
		}
		if sourceWithin(root, mount) && len(mount) > longest {
			longest = len(mount)
			covering = signature
		}
	}
	sort.Strings(relevant)
	sum := sha256.Sum256([]byte(covering + "\n" + strings.Join(relevant, "\n")))
	return fmt.Sprintf("v2:%s:%x", sourceFileIdentity(info), sum)
}
