package config

import (
	"fmt"
	"net/url"
)

// DatabaseURL 返回 postgres 连接 URL，供 golang-migrate 等工具使用。
func (d DatabaseConfig) DatabaseURL() string {
	if d.ConnURL != "" {
		return d.ConnURL
	}
	u := url.URL{
		Scheme: "postgres",
		User:   url.UserPassword(d.User, d.Password),
		Host:   fmt.Sprintf("%s:%s", d.Host, d.Port),
		Path:   "/" + d.DBName,
	}
	q := u.Query()
	q.Set("sslmode", d.SSLMode)
	u.RawQuery = q.Encode()
	return u.String()
}
