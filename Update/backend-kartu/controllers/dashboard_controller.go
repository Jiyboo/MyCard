package controllers

import (
	"backend-kartu/models"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type DashboardController struct {
	DB *gorm.DB
}

func NewDashboardController(db *gorm.DB) *DashboardController {
	return &DashboardController{DB: db}
}

func (ctrl *DashboardController) GetStats(c *gin.Context) {
	region := c.Query("region")

	var totalUsers int64
	var activeUsers int64
	var pendingUsers int64
	var inactiveUsers int64
	var totalCards int64
	var activeCards int64
	var inactiveCards int64
	var regionalAdmins int64

	baseUserQuery := func() *gorm.DB {
		q := ctrl.DB.Model(&models.User{})
		if region != "" && region != "global" {
			q = q.Where("region = ?", region)
		}
		return q
	}

	baseUserQuery().Count(&totalUsers)
	baseUserQuery().Where("status_aktivasi = ?", "aktif").Count(&activeUsers)
	baseUserQuery().Where("status_aktivasi = ?", "pending").Count(&pendingUsers)
	baseUserQuery().Where("status_aktivasi = ?", "tidak_aktif").Count(&inactiveUsers)
	baseUserQuery().Where("role = ?", "admin_regional").Count(&regionalAdmins)

	baseCardQuery := func() *gorm.DB {
		q := ctrl.DB.Model(&models.MemberCard{})
		if region != "" && region != "global" {
			q = q.Joins("JOIN members ON members.id = member_cards.member_id").
				Joins("JOIN users ON users.id = members.user_id").
				Where("users.region = ?", region)
		}
		return q
	}

	baseCardQuery().Count(&totalCards)
	baseCardQuery().Where("member_cards.status = ?", "aktif").Count(&activeCards)
	baseCardQuery().Where("member_cards.status = ?", "tidak_aktif").Count(&inactiveCards)

	c.JSON(http.StatusOK, gin.H{
		"regionName":     region,
		"totalUsers":     totalUsers,
		"totalCards":     totalCards,
		"regionalAdmins": regionalAdmins,
		"users": gin.H{
			"aktif":      activeUsers,
			"pending":    pendingUsers,
			"tidakAktif": inactiveUsers,
		},
		"cards": gin.H{
			"aktif":      activeCards,
			"tidakAktif": inactiveCards,
		},
	})
}