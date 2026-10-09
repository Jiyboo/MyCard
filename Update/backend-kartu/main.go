package main

import (
	"backend-kartu/controllers"
	"backend-kartu/middlewares"
	"backend-kartu/models"
	"log"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func main() {
	_ = godotenv.Load()

	dsn := os.Getenv("DB_DSN")
	if dsn == "" {
		dsn = "root:@tcp(127.0.0.1:3306)/db_kartu_anggota_rbac?charset=utf8mb4&parseTime=True&loc=Local"
	}
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

	db.AutoMigrate(
		&models.User{},
		&models.Region{},
		&models.LandingHero{},
		&models.LandingFeature{},
		&models.LandingStepSection{},
		&models.LandingStep{},
		&models.LandingFooter{},
		&models.Menu{},
		&models.MenuPermission{},
		&models.Conversation{},
		&models.ConversationParticipant{},
		&models.Message{},
		&models.CardTemplate{},
		&models.Member{},
		&models.MemberCard{},
	)

	authController := controllers.NewAuthController(db)
	userController := controllers.NewUserController(db)
	regionController := controllers.NewRegionController(db)
	landingController := controllers.NewLandingController(db)
	menuController := controllers.NewMenuController(db)
	chatController := controllers.NewChatController(db)
	cardController := controllers.NewCardController(db)
	dashboardController := controllers.NewDashboardController(db)
	scanController := controllers.NewScanController(db)

	r := gin.Default()

	r.Use(cors.New(cors.Config{
		AllowOriginFunc: func(origin string) bool {
			return true
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "Cache-Control", "Pragma", "X-CSRF-Token"},
		ExposeHeaders:    []string{"Content-Length", "X-CSRF-Token"},
		AllowCredentials: true,
	}))

	r.Static("/uploads", "./uploads")

	api := r.Group("/api")
	api.Use(middlewares.RateLimiter())
	{
		api.GET("/csrf-token", func(c *gin.Context) {
			token, err := c.Cookie("csrf_token")
			if err != nil || token == "" {
				token = middlewares.GenerateCSRFTokenPublic()
				c.SetCookie("csrf_token", token, 3600, "/", "", false, false)
			}
			c.Header("X-CSRF-Token", token)
			c.JSON(200, gin.H{"message": "CSRF token aktif", "csrf_token": token})
		})

		api.GET("/scan", scanController.ScanQR)

		api.GET("/dashboard/stats", dashboardController.GetStats)

		api.GET("/cards", cardController.GetCards)
		api.GET("/cards/eligible-users", cardController.GetEligibleUsers)
		api.POST("/cards/create", cardController.CreateCard)
		api.PUT("/cards/:id", cardController.UpdateCard)
		api.GET("/cards/templates", cardController.GetTemplates)
		api.POST("/cards/templates", cardController.CreateTemplate)
		api.DELETE("/cards/:id", cardController.DeleteCard)
		api.PATCH("/cards/:id/status", cardController.ToggleCardStatus)

		authGroup := api.Group("")
		authGroup.Use(middlewares.CSRFMiddleware())
		{
			authGroup.POST("/register", authController.Register)
			authGroup.POST("/login", authController.Login)
		}
		api.GET("/check-user", authController.CheckUsername)

		api.GET("/users", userController.GetUsers)
		api.POST("/users", userController.CreateUser)
		api.PUT("/users/:id", userController.UpdateUser)
		api.DELETE("/users/:id", userController.DeleteUser)
		api.PATCH("/users/:id/status", userController.ToggleStatus)
		api.PUT("/users/:id/profile", userController.UpdateProfile)
		api.PUT("/users/:id/settings", userController.UpdateSettings)

		api.GET("/regionals", regionController.GetRegions)
		api.POST("/regionals", regionController.CreateRegion)
		api.PUT("/regionals/:id", regionController.UpdateRegion)
		api.DELETE("/regionals/:id", regionController.DeleteRegion)
		api.PATCH("/regionals/:id/status", regionController.ToggleStatus)

		api.GET("/landing", landingController.GetLandingData)
		api.PUT("/landing/hero", landingController.UpdateHero)
		api.PUT("/landing/footer", landingController.UpdateFooter)

		api.POST("/landing/features", landingController.CreateFeature)
		api.PUT("/landing/features/:id", landingController.UpdateFeature)
		api.DELETE("/landing/features/:id", landingController.DeleteFeature)

		api.POST("/landing/step-sections", landingController.CreateStepSection)
		api.PUT("/landing/step-sections/:id", landingController.UpdateStepSection)
		api.DELETE("/landing/step-sections/:id", landingController.DeleteStepSection)

		api.POST("/landing/steps", landingController.CreateStep)
		api.PUT("/landing/steps/:id", landingController.UpdateStep)
		api.DELETE("/landing/steps/:id", landingController.DeleteStep)

		api.GET("/menus", menuController.GetMenus)
		api.GET("/menus/check-access", menuController.GetMenuAccess)
		api.GET("/menus/user-access", menuController.GetUserMenuAccess)
		api.GET("/menus/:id/permissions", menuController.GetMenuPermissions)
		api.PUT("/menus/:id/permissions", menuController.UpdateMenuPermissions)

		api.GET("/chats/ws", chatController.HandleWebSocket)
		api.GET("/chats", chatController.GetConversations)
		api.POST("/chats", chatController.CreateConversation)
		api.GET("/chats/:id/messages", chatController.GetMessages)
		api.POST("/chats/messages", chatController.SendMessage)
		api.POST("/chats/read", chatController.MarkAsRead)
		api.DELETE("/chats/:id", chatController.DeleteConversation)
		api.POST("/chats/:id/leave", chatController.LeaveConversation)
		api.DELETE("/chats/messages/:id", chatController.DeleteMessage)
		api.POST("/chats/:id/members", chatController.AddGroupMembers)
		api.PUT("/chats/:id/name", chatController.UpdateGroupName)
		api.POST("/chats/:id/promote", chatController.PromoteAdmin)
		api.POST("/chats/:id/demote", chatController.DemoteAdmin)
		api.POST("/chats/:id/remove", chatController.RemoveMember)
	}

	r.RunTLS(":8080", "cert.pem", "key.pem")
}