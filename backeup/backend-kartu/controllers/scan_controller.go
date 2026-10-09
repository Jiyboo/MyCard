package controllers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ScanController struct {
	DB *gorm.DB
}

func NewScanController(db *gorm.DB) *ScanController {
	return &ScanController{
		DB: db,
	}
}

type ScanResponse struct {
	Nama  string `json:"nama"`
	Nomor string `json:"nomor"`
	Role  string `json:"role"`
}

func (c *ScanController) ScanQR(ctx *gin.Context) {
	qrCode := strings.TrimSpace(ctx.Query("qr"))
	
	if qrCode == "" {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "Kode QR kosong"})
		return
	}

	var result ScanResponse

	err := c.DB.Table("member_cards").
		Select("members.nama_lengkap as nama, member_cards.kode_qr as nomor, users.role as role").
		Joins("LEFT JOIN members ON members.id = member_cards.member_id").
		Joins("LEFT JOIN users ON users.id = members.user_id").
		Where("member_cards.kode_qr = ? AND member_cards.status = ?", qrCode, "aktif").
		Scan(&result).Error

	if err != nil || result.Nama == "" {
		ctx.JSON(http.StatusNotFound, gin.H{"error": "Barcoded atau kartu tidak ada"})
		return
	}

	ctx.JSON(http.StatusOK, result)
}