package controllers

import (
	"backend-kartu/models"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type RegionController struct {
	DB *gorm.DB
}

func NewRegionController(db *gorm.DB) *RegionController {
	return &RegionController{DB: db}
}

func (ctrl *RegionController) GetRegions(c *gin.Context) {
	var regions []models.Region
	ctrl.DB.Find(&regions)
	c.JSON(http.StatusOK, regions)
}

func (ctrl *RegionController) CreateRegion(c *gin.Context) {
	var region models.Region
	if err := c.ShouldBindJSON(&region); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctrl.DB.Create(&region)
	c.JSON(http.StatusOK, region)
}

func (ctrl *RegionController) UpdateRegion(c *gin.Context) {
	id := c.Param("id")
	var region models.Region
	if err := ctrl.DB.First(&region, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Data tidak ditemukan"})
		return
	}
	if err := c.ShouldBindJSON(&region); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctrl.DB.Save(&region)
	c.JSON(http.StatusOK, region)
}

func (ctrl *RegionController) DeleteRegion(c *gin.Context) {
	id := c.Param("id")
	ctrl.DB.Delete(&models.Region{}, id)
	c.JSON(http.StatusOK, gin.H{"message": "Data berhasil dihapus"})
}

func (ctrl *RegionController) ToggleStatus(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctrl.DB.Model(&models.Region{}).Where("id = ?", id).Update("status_aktivasi", req.Status)
	c.JSON(http.StatusOK, gin.H{"message": "Status diperbarui"})
}