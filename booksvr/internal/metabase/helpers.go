package metabase

import (
	"fmt"
	"strconv"
)

// itoa 把 int64 转成十进制字符串。
func itoa(n int64) string {
	return strconv.FormatInt(n, 10)
}

// trimFloat 复刻 Python 的 str(float)：整数浮点去掉小数点。
func trimFloat(f float64) string {
	return fmt.Sprintf("%v", f)
}
