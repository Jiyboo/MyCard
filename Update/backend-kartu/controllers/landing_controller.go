package controllers

import (
	"backend-kartu/models"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type LandingController struct {
	DB *gorm.DB
}

func NewLandingController(db *gorm.DB) *LandingController {
	return &LandingController{DB: db}
}

func (ctrl *LandingController) GetLandingData(c *gin.Context) {
	var hero models.LandingHero
	var features []models.LandingFeature
	var sections []models.LandingStepSection
	var footer models.LandingFooter

	ctrl.DB.FirstOrCreate(&hero, models.LandingHero{ID: 1})
	ctrl.DB.Find(&features)
	
	ctrl.DB.Preload("Steps", func(db *gorm.DB) *gorm.DB {
		return db.Order("step_number asc")
	}).Find(&sections)

	ctrl.DB.FirstOrCreate(&footer, models.LandingFooter{ID: 1})

	c.JSON(http.StatusOK, gin.H{
		"hero":          hero,
		"features":      features,
		"step_sections": sections,
		"footer":        footer,
	})
}

func (ctrl *LandingController) UpdateHero(c *gin.Context) {
	var input models.LandingHero
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data tidak valid"})
		return
	}

	var hero models.LandingHero
	if err := ctrl.DB.FirstOrCreate(&hero, models.LandingHero{ID: 1}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	hero.Title = input.Title
	hero.Description = input.Description
	if input.ImageURL != "" {
		hero.ImageURL = input.ImageURL
	}

	if err := ctrl.DB.Save(&hero).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan database"})
		return
	}
	c.JSON(http.StatusOK, hero)
}

func (ctrl *LandingController) UpdateFooter(c *gin.Context) {
	var input models.LandingFooter
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var footer models.LandingFooter
	if err := ctrl.DB.FirstOrCreate(&footer, models.LandingFooter{ID: 1}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	footer.AboutText = input.AboutText
	footer.Email = input.Email
	footer.Phone = input.Phone
	footer.Address = input.Address
	footer.Copyright = input.Copyright
	footer.WebsiteLink = input.WebsiteLink
	footer.InstagramLink = input.InstagramLink

	if err := ctrl.DB.Save(&footer).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, footer)
}

func (ctrl *LandingController) CreateFeature(c *gin.Context) {
	var input models.LandingFeature
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := ctrl.DB.Create(&input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, input)
}

func (ctrl *LandingController) UpdateFeature(c *gin.Context) {
	id := c.Param("id")
	var input models.LandingFeature
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var feature models.LandingFeature
	if err := ctrl.DB.First(&feature, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Fitur tidak ditemukan"})
		return
	}
	feature.Icon = input.Icon
	feature.TitleFront = input.TitleFront
	feature.DescFront = input.DescFront
	feature.TitleBack = input.TitleBack
	feature.DescBack = input.DescBack
	if err := ctrl.DB.Save(&feature).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, feature)
}

func (ctrl *LandingController) DeleteFeature(c *gin.Context) {
	id := c.Param("id")
	if err := ctrl.DB.Delete(&models.LandingFeature{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Fitur berhasil dihapus"})
}

func (ctrl *LandingController) CreateStepSection(c *gin.Context) {
	var input models.LandingStepSection
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := ctrl.DB.Create(&input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, input)
}

func (ctrl *LandingController) UpdateStepSection(c *gin.Context) {
	id := c.Param("id")
	var input models.LandingStepSection
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var section models.LandingStepSection
	if err := ctrl.DB.First(&section, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Bagian panduan tidak ditemukan"})
		return
	}
	section.Title = input.Title
	if err := ctrl.DB.Save(&section).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, section)
}

func (ctrl *LandingController) DeleteStepSection(c *gin.Context) {
	id := c.Param("id")
	if err := ctrl.DB.Delete(&models.LandingStepSection{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Bagian panduan berhasil dihapus"})
}

func (ctrl *LandingController) CreateStep(c *gin.Context) {
	var input models.LandingStep
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := ctrl.DB.Create(&input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, input)
}

func (ctrl *LandingController) UpdateStep(c *gin.Context) {
	id := c.Param("id")
	var input models.LandingStep
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	var step models.LandingStep
	if err := ctrl.DB.First(&step, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Langkah tidak ditemukan"})
		return
	}
	step.StepNumber = input.StepNumber
	step.Title = input.Title
	step.Description = input.Description
	step.SectionID = input.SectionID
	
	if err := ctrl.DB.Save(&step).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, step)
}

func (ctrl *LandingController) DeleteStep(c *gin.Context) {
	id := c.Param("id")
	if err := ctrl.DB.Delete(&models.LandingStep{}, id).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Langkah berhasil dihapus"})
}