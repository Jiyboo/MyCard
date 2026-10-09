package routes

import (
	"backend-kartu/controllers"
	"backend-kartu/middlewares"
	"github.com/gin-gonic/gin"
)

func SetupAuthRoutes(r *gin.Engine, authCtrl *controllers.AuthController) {
	authGroup := r.Group("/api")
	authGroup.Use(middlewares.RateLimiter())
	authGroup.Use(middlewares.CSRFMiddleware())

	authGroup.GET("/csrf-token", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "CSRF token terpasang"})
	})

	authGroup.POST("/register", authCtrl.Register)
	authGroup.POST("/login", authCtrl.Login)
	authGroup.GET("/check-user", authCtrl.CheckUsername)
}