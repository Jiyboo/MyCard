package controllers

import (
	"backend-kartu/models"
	"encoding/base64"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type CardController struct {
	DB *gorm.DB
}

func NewCardController(db *gorm.DB) *CardController {
	return &CardController{DB: db}
}

func saveBase64ToFile(base64Data string, prefix string) string {
	if base64Data == "" || !strings.HasPrefix(base64Data, "data:image") {
		return base64Data
	}

	parts := strings.Split(base64Data, ",")
	if len(parts) != 2 {
		return base64Data
	}

	ext := ".png"
	if strings.Contains(parts[0], "jpeg") || strings.Contains(parts[0], "jpg") {
		ext = ".jpg"
	}

	data, err := base64.StdEncoding.DecodeString(parts[1])
	if err != nil {
		return base64Data
	}

	os.MkdirAll("./uploads/cards", os.ModePerm)

	fileName := fmt.Sprintf("%s_%d%s", prefix, time.Now().UnixNano(), ext)
	filePath := "./uploads/cards/" + fileName

	err = os.WriteFile(filePath, data, 0644)
	if err != nil {
		return base64Data
	}

	return "/uploads/cards/" + fileName
}

func (ctrl *CardController) GetCards(c *gin.Context) {
	role := c.Query("role")
	regionID := c.Query("region_id")
	userID := c.Query("user_id")
	crossRegions := c.QueryArray("cross_regions[]")

	var results []map[string]interface{}
	query := ctrl.DB.Table("member_cards").
		Select("member_cards.id, member_cards.kode_qr, member_cards.status, member_cards.created_at, member_cards.file_ttd, member_cards.file_background AS custom_bg, member_cards.template_id, members.nama_lengkap, users.id AS user_id, users.region, users.foto_profil, card_templates.file_background AS template_bg").
		Joins("JOIN members ON members.id = member_cards.member_id").
		Joins("JOIN users ON users.id = members.user_id").
		Joins("LEFT JOIN card_templates ON card_templates.id = member_cards.template_id").
		Order("member_cards.created_at DESC")

	if role == "user" {
		query = query.Where("users.id = ?", userID)
	} else if role == "admin_regional" {
		var validCrossRegions []string
		for _, cr := range crossRegions {
			if cr != "" {
				validCrossRegions = append(validCrossRegions, cr)
			}
		}

		// Menangani regionID sebagai integer agar aman dari panic error SQL
		var rID uint
		hasRID := false
		if parsedID, err := strconv.ParseUint(regionID, 10, 32); err == nil {
			rID = uint(parsedID)
			hasRID = true
		}

		if len(validCrossRegions) > 0 {
			hasSemua := false
			for _, cr := range validCrossRegions {
				if cr == "Semua" {
					hasSemua = true
					break
				}
			}
			if hasSemua {
				query = query.Where("users.role = 'user' OR users.id = ?", userID)
			} else {
				if hasRID {
					query = query.Where("(users.role = 'user' AND (users.region_id = ? OR users.region = ? OR users.region IN ?)) OR users.id = ?", rID, regionID, validCrossRegions, userID)
				} else {
					query = query.Where("(users.role = 'user' AND (users.region = ? OR users.region IN ?)) OR users.id = ?", regionID, validCrossRegions, userID)
				}
			}
		} else {
			if hasRID {
				query = query.Where("(users.role = 'user' AND (users.region_id = ? OR users.region = ?)) OR users.id = ?", rID, regionID, userID)
			} else {
				query = query.Where("(users.role = 'user' AND users.region = ?) OR users.id = ?", regionID, userID)
			}
		}
	} else if role != "superadmin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Akses ditolak"})
		return
	}

	if err := query.Find(&results).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data kartu"})
		return
	}

	c.JSON(http.StatusOK, results)
}

func (ctrl *CardController) GetEligibleUsers(c *gin.Context) {
	role := c.Query("role")
	regionID := c.Query("region_id")
	crossRegions := c.QueryArray("cross_regions[]")

	var users []models.User

	if role == "superadmin" {
		if err := ctrl.DB.Find(&users).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data pengguna"})
			return
		}
	} else if role == "admin_regional" {
		query := ctrl.DB.Where("role = ?", "user")

		var validCrossRegions []string
		for _, cr := range crossRegions {
			if cr != "" {
				validCrossRegions = append(validCrossRegions, cr)
			}
		}

		var rID uint
		hasRID := false
		if parsedID, err := strconv.ParseUint(regionID, 10, 32); err == nil {
			rID = uint(parsedID)
			hasRID = true
		}

		if len(validCrossRegions) > 0 {
			hasSemua := false
			for _, cr := range validCrossRegions {
				if cr == "Semua" {
					hasSemua = true
					break
				}
			}

			if !hasSemua {
				if hasRID {
					query = query.Where("region_id = ? OR region = ? OR region IN ?", rID, regionID, validCrossRegions)
				} else {
					query = query.Where("region = ? OR region IN ?", regionID, validCrossRegions)
				}
			}
		} else {
			if hasRID {
				query = query.Where("region_id = ? OR region = ?", rID, regionID)
			} else {
				query = query.Where("region = ?", regionID)
			}
		}

		if err := query.Find(&users).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data pengguna regional"})
			return
		}
	} else {
		c.JSON(http.StatusForbidden, gin.H{"error": "Akses ditolak"})
		return
	}

	c.JSON(http.StatusOK, users)
}

func (ctrl *CardController) GetTemplates(c *gin.Context) {
	var templates []models.CardTemplate
	if err := ctrl.DB.Find(&templates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil template"})
		return
	}
	c.JSON(http.StatusOK, templates)
}

func (ctrl *CardController) CreateTemplate(c *gin.Context) {
	var template models.CardTemplate
	if err := c.ShouldBindJSON(&template); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	template.FileBackground = saveBase64ToFile(template.FileBackground, "template_bg")

	if err := ctrl.DB.Create(&template).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan template"})
		return
	}

	c.JSON(http.StatusOK, template)
}

type CreateCardInput struct {
	UserID         uint   `json:"user_id"`
	Nik            string `json:"nik"`
	NamaLengkap    string `json:"nama_lengkap"`
	Region         string `json:"region"`
	FileBackground string `json:"file_background"`
	FileTtd        string `json:"file_ttd"`
	KodeQr         string `json:"kode_qr"`
	TemplateID     *uint  `json:"template_id"`
}

func (ctrl *CardController) CreateCard(c *gin.Context) {
	var input CreateCardInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var member models.Member
	if err := ctrl.DB.Where("user_id = ?", input.UserID).First(&member).Error; err != nil {
		var user models.User
		ctrl.DB.Select("region_id").Where("id = ?", input.UserID).First(&user)

		member = models.Member{
			UserID:      int(input.UserID),
			NamaLengkap: input.NamaLengkap,
			RegionID:    user.RegionID,
		}
		if err := ctrl.DB.Create(&member).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat data member: " + err.Error()})
			return
		}
	} else {
		member.NamaLengkap = input.NamaLengkap
		ctrl.DB.Save(&member)
	}

	bgPath := saveBase64ToFile(input.FileBackground, "bg")
	ttdPath := saveBase64ToFile(input.FileTtd, "ttd")

	card := models.MemberCard{
		MemberID:       member.ID,
		KodeQr:         input.KodeQr,
		FileTtd:        ttdPath,
		FileBackground: bgPath,
		Status:         "aktif",
		TemplateID:     input.TemplateID,
	}

	if err := ctrl.DB.Create(&card).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menerbitkan kartu: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Kartu berhasil dibuat",
		"data":    card,
	})
}

func (ctrl *CardController) UpdateCard(c *gin.Context) {
	id := c.Param("id")
	var input CreateCardInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}

	if input.FileBackground != "" {
		updates["file_background"] = saveBase64ToFile(input.FileBackground, "bg")
		updates["template_id"] = nil 
	} else if input.TemplateID != nil {
		updates["template_id"] = input.TemplateID
		updates["file_background"] = "" 
	}

	if input.FileTtd != "" {
		updates["file_ttd"] = saveBase64ToFile(input.FileTtd, "ttd")
	}

	if err := ctrl.DB.Model(&models.MemberCard{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui kartu: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Kartu berhasil diperbarui"})
}

func (ctrl *CardController) DeleteCard(c *gin.Context) {
	id := c.Param("id")
	if err := ctrl.DB.Delete(&models.MemberCard{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus kartu"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Kartu berhasil dihapus"})
}

func (ctrl *CardController) ToggleCardStatus(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := ctrl.DB.Model(&models.MemberCard{}).Where("id = ?", id).Update("status", req.Status).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui status kartu"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Status kartu diperbarui"})
}