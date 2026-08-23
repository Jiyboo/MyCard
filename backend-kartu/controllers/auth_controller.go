package controllers

import (
	"backend-kartu/models"
	"encoding/json"
	"math"
	"net/http"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthController struct {
	DB *gorm.DB
}

func NewAuthController(db *gorm.DB) *AuthController {
	return &AuthController{DB: db}
}

func (ctrl *AuthController) Register(c *gin.Context) {
	var user models.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	user.Password = string(hashedPassword)
	user.StatusAktivasi = "pending"
	user.Role = "user"

	if err := ctrl.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mendaftarkan pengguna"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Registrasi berhasil, menunggu aktivasi admin", "user": user})
}

func (ctrl *AuthController) CheckUsername(c *gin.Context) {
	username := c.Query("username")
	if username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username wajib diisi"})
		return
	}

	var user models.User
	if err := ctrl.DB.Where("username = ?", username).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Username tidak ditemukan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"biometric_enabled": user.BiometricEnabled,
	})
}

func compareFaceDescriptors(savedData, incomingData string) bool {
	var savedDescriptor []float64
	var incomingDescriptor []float64

	if err := json.Unmarshal([]byte(savedData), &savedDescriptor); err != nil {
		return false
	}
	if err := json.Unmarshal([]byte(incomingData), &incomingDescriptor); err != nil {
		return false
	}

	if len(savedDescriptor) != 128 || len(incomingDescriptor) != 128 {
		return false
	}

	var distance float64
	for i := 0; i < 128; i++ {
		diff := savedDescriptor[i] - incomingDescriptor[i]
		distance += diff * diff
	}
	distance = math.Sqrt(distance)

	return distance <= 0.45
}

func (ctrl *AuthController) Login(c *gin.Context) {
	var req struct {
		Username      string `json:"username"`
		Password      string `json:"password"`
		LoginMethod   string `json:"login_method"`
		LoginFaceData string `json:"login_face_data"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := ctrl.DB.Where("username = ?", req.Username).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Username tidak terdaftar"})
		return
	}

	if req.LoginMethod == "face_id" {
		if !user.BiometricEnabled || user.FaceData == "" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Face ID belum terdaftar dengan benar"})
			return
		}
		if req.LoginFaceData == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Kamera tidak menangkap gambar wajah"})
			return
		}

		isMatch := compareFaceDescriptors(user.FaceData, req.LoginFaceData)
		if !isMatch {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Wajah tidak cocok dengan pengguna"})
			return
		}

	} else {
		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Kata sandi salah"})
			return
		}
	}

	if user.StatusAktivasi != "aktif" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Akun Anda belum diaktifkan"})
		return
	}

	token := "token-jwt-dummy-" + user.Username
	c.JSON(http.StatusOK, gin.H{
		"message": "Login berhasil",
		"token":   token,
		"user":    user,
	})
}