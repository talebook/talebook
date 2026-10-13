package metasource

import "crypto/sha512"

// 本文件复刻 CPython 的 random.seed(str) + random.choice(seq)。
//
// CPython 的 random 模块用 Mersenne Twister（MT19937），
// 字符串种子经 init_by_array 初始化（把字节序列按 32 位小端分组）。
// random.choice(seq) 等价于 seq[int(random() * len(seq))]，
// 其中 random() 由 genrand_res53 生成 53 位浮点。
//
// 七猫小说用 book_id 作为种子选择 app-version，必须逐位对齐。

const (
	mtN         = 624
	mtM         = 397
	mtMatrixA   = 0x9908b0df
	mtUpperMask = 0x80000000
	mtLowerMask = 0x7fffffff
)

// mt19937 是 CPython 兼容的 Mersenne Twister。
type mt19937 struct {
	state [mtN]uint32
	index int
}

// newMT19937FromString 复刻 random.seed(str) 的初始化路径。
//
// CPython 的 `random.Random.seed` 对 str/bytes 走 version=2 分支：
//
//	a = a.encode()
//	a = int.from_bytes(a + _sha512(a).digest())
//
// 即「UTF-8 字节 ‖ 其 SHA-512 摘要」按**大端**解释为整数，
// 再拆成 32 位小端分组交给 init_by_array。
func newMT19937FromString(seed string) *mt19937 {
	key := seedToKey(seed)
	mt := &mt19937{}
	mt.initByArray(key)
	return mt
}

// seedToKey 复刻 `int.from_bytes(a + sha512(a).digest())` 后的 32 位拆分。
//
// `_randommodule.c` 用 `_PyLong_AsByteArray(..., PY_LITTLE_ENDIAN, 0)`
// 把该整数写成小端字节，再按 uint32 读取，因此低位字在前。
func seedToKey(seed string) []uint32 {
	raw := []byte(seed)
	digest := sha512.Sum512(raw)

	// 拼接后按大端解释为整数。
	buf := make([]byte, 0, len(raw)+len(digest))
	buf = append(buf, raw...)
	buf = append(buf, digest[:]...)

	// 拆成 32 位小端分组：buf 的末尾是整数最低位。
	keyused := (len(buf) + 3) / 4
	out := make([]uint32, keyused)
	for i := 0; i < keyused; i++ {
		// 从末尾往前取 4 字节，构成第 i 个字（低位字在前）。
		var v uint32
		for b := 0; b < 4; b++ {
			idx := len(buf) - 1 - (i*4 + b)
			if idx < 0 {
				continue
			}
			v |= uint32(buf[idx]) << (8 * uint(b))
		}
		out[i] = v
	}
	return out
}

// initGenrand 复刻 init_genrand。
func (mt *mt19937) initGenrand(s uint32) {
	mt.state[0] = s
	for i := 1; i < mtN; i++ {
		prev := mt.state[i-1] ^ (mt.state[i-1] >> 30)
		mt.state[i] = 1812433253*(prev) + uint32(i)
	}
	mt.index = mtN
}

// initByArray 复刻 init_by_array。
func (mt *mt19937) initByArray(key []uint32) {
	mt.initGenrand(19650218)
	i, j := 1, 0
	k := mtN
	if len(key) > k {
		k = len(key)
	}
	for ; k > 0; k-- {
		prev := mt.state[i-1] ^ (mt.state[i-1] >> 30)
		mt.state[i] = (mt.state[i] ^ (prev * 1664525)) + key[j] + uint32(j)
		i++
		j++
		if i >= mtN {
			mt.state[0] = mt.state[mtN-1]
			i = 1
		}
		if j >= len(key) {
			j = 0
		}
	}
	for k = mtN - 1; k > 0; k-- {
		prev := mt.state[i-1] ^ (mt.state[i-1] >> 30)
		mt.state[i] = (mt.state[i] ^ (prev * 1566083941)) - uint32(i)
		i++
		if i >= mtN {
			mt.state[0] = mt.state[mtN-1]
			i = 1
		}
	}
	mt.state[0] = 0x80000000
	mt.index = mtN
}

// genrandUint32 复刻 genrand_uint32。
func (mt *mt19937) genrandUint32() uint32 {
	if mt.index >= mtN {
		kk := 0
		for ; kk < mtN-mtM; kk++ {
			y := (mt.state[kk] & mtUpperMask) | (mt.state[kk+1] & mtLowerMask)
			mt.state[kk] = mt.state[kk+mtM] ^ (y >> 1) ^ (-(y & 1) & mtMatrixA)
		}
		for ; kk < mtN-1; kk++ {
			y := (mt.state[kk] & mtUpperMask) | (mt.state[kk+1] & mtLowerMask)
			mt.state[kk] = mt.state[kk+(mtM-mtN)] ^ (y >> 1) ^ (-(y & 1) & mtMatrixA)
		}
		y := (mt.state[mtN-1] & mtUpperMask) | (mt.state[0] & mtLowerMask)
		mt.state[mtN-1] = mt.state[mtM-1] ^ (y >> 1) ^ (-(y & 1) & mtMatrixA)
		mt.index = 0
	}
	y := mt.state[mt.index]
	mt.index++
	y ^= y >> 11
	y ^= (y << 7) & 0x9d2c5680
	y ^= (y << 15) & 0xefc60000
	y ^= y >> 18
	return y
}

// random 复刻 random.random()：genrand_res53，返回 [0,1) 的 53 位浮点。
func (mt *mt19937) random() float64 {
	a := uint64(mt.genrandUint32()) >> 5
	b := uint64(mt.genrandUint32()) >> 6
	return (float64(a)*67108864.0 + float64(b)) / 9007199254740992.0
}

// getrandbits 复刻 random.getrandbits(k)：返回 k 位随机整数。
//
// 复刻 `_randommodule.c` 的 `_random_Random_getrandbits_impl`：
// k <= 32 时取 genrand_uint32() >> (32-k)。
func (mt *mt19937) getrandbits(k int) uint32 {
	if k <= 0 {
		return 0
	}
	if k <= 32 {
		return mt.genrandUint32() >> (32 - uint(k))
	}
	// 多字情形：低位字在前，最高字右移丢弃多余位。
	words := (k-1)/32 + 1
	out := make([]uint32, words)
	for i := 0; i < words; i++ {
		r := mt.genrandUint32()
		if k < 32 {
			r >>= (32 - uint(k))
		}
		out[i] = r
		k -= 32
	}
	// 这里只需低位字（choice 的 n 远小于 2^32）。
	return out[0]
}

// randBelow 复刻 random._randbelow_with_getrandbits：拒绝采样。
func (mt *mt19937) randBelow(n int) int {
	if n <= 0 {
		return 0
	}
	k := bitLength(n)
	r := int(mt.getrandbits(k))
	for r >= n {
		r = int(mt.getrandbits(k))
	}
	return r
}

// bitLength 复刻 int.bit_length()。
func bitLength(n int) int {
	bits := 0
	for n > 0 {
		n >>= 1
		bits++
	}
	return bits
}

// choice 复刻 random.choice(seq)：返回 seq[self._randbelow(len(seq))]。
func (mt *mt19937) choice(seq []string) string {
	if len(seq) == 0 {
		return ""
	}
	return seq[mt.randBelow(len(seq))]
}

// pyRandomChoice 复刻 `random.seed(seed); random.choice(seq)`。
func pyRandomChoice(seed string, seq []string) string {
	return newMT19937FromString(seed).choice(seq)
}
