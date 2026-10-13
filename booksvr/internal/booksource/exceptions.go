package booksource

// 本文件复刻 webserver/services/booksource/exceptions.py。

// BookSourceError 复刻 BookSourceError：书源相关错误基类。
type BookSourceError struct {
	Message string
}

func (e *BookSourceError) Error() string { return e.Message }

// RuleParseError 复刻 RuleParseError：规则解析失败。
type RuleParseError struct {
	BookSourceError
}

// NewRuleParseError 构造规则解析错误。
func NewRuleParseError(message string) *RuleParseError {
	return &RuleParseError{BookSourceError{Message: message}}
}

// SourceHttpError 复刻 SourceHttpError：书源 HTTP 请求失败。
type SourceHttpError struct {
	BookSourceError
}

// NewSourceHttpError 构造书源 HTTP 错误。
func NewSourceHttpError(message string) *SourceHttpError {
	return &SourceHttpError{BookSourceError{Message: message}}
}
