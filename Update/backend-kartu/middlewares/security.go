package middlewares

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

var visitors = make(map[string]*rate.Limiter)
var mu sync.Mutex

func getVisitor(ip string) *rate.Limiter {
	mu.Lock()
	defer mu.Unlock()

	limiter, exists := visitors[ip]
	if !exists {
		limiter = rate.NewLimiter(rate.Limit(50), 100)
		visitors[ip] = limiter
	}
	return limiter
}

func RateLimiter() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		limiter := getVisitor(ip)

		if !limiter.Allow() {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "Terlalu banyak permintaan, coba lagi nanti"})
			return
		}
		c.Next()
	}
}

func generateCSRFToken() string {
	bytes := make([]byte, 32)
	rand.Read(bytes)
	return hex.EncodeToString(bytes)
}

func CSRFMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Method == "GET" {
			token, err := c.Cookie("csrf_token")
			if err != nil || token == "" {
				token = generateCSRFToken()
				c.SetCookie("csrf_token", token, 3600, "/", "", false, false)
			}
			c.Header("X-CSRF-Token", token)
			c.Set("csrf_token", token)
			c.Next()
			return
		}

		cookieToken, err := c.Cookie("csrf_token")
		headerToken := c.GetHeader("X-CSRF-Token")

		if err != nil || cookieToken == "" || headerToken == "" || cookieToken != headerToken {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "CSRF token tidak valid"})
			return
		}
		c.Next()
	}
}