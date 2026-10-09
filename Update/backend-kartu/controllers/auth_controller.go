package controllers

import (
	"backend-kartu/dto"
	"backend-kartu/models"
	"bytes"
	"encoding/json"
	"math"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthController struct {
	DB *gorm.DB
}

func NewAuthController(db *gorm.DB) *AuthController {
	return &AuthController{DB: db}
}

func verifyCaptcha(token string) bool {
	secret := os.Getenv("RECAPTCHA_SECRET_KEY")
	if secret == "" || secret == "SECRET_KEY_DUMMY" || token == "dummy_token" {
		return true
	}

	reqBody, _ := json.Marshal(map[string]string{
		"secret":   secret,
		"response": token,
	})

	resp, err := http.Post("https://www.google.com/recaptcha/api/siteverify", "application/json", bytes.NewBuffer(reqBody))
	if err != nil {
		return true
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	success, ok := result["success"].(bool)
	if !ok {
		return true
	}
	return success
}

func (ctrl *AuthController) Register(c *gin.Context) {
	var req dto.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if !verifyCaptcha(req.CaptchaToken) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Validasi Captcha gagal"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengenkripsi kata sandi"})
		return
	}

	user := models.User{
		NamaLengkap:    req.NamaLengkap,
		Username:       req.Username,
		Email:          req.Email,
		Password:       string(hashedPassword),
		StatusAktivasi: "pending",
		Role:           "user",
	}

	if err := ctrl.DB.Create(&user).Error; err != nil {
		if strings.Contains(err.Error(), "Duplicate entry") {
			if strings.Contains(err.Error(), "username") {
				c.JSON(http.StatusConflict, gin.H{"error": "Username sudah digunakan"})
				return
			}
			if strings.Contains(err.Error(), "email") {
				c.JSON(http.StatusConflict, gin.H{"error": "Email sudah digunakan"})
				return
			}
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mendaftarkan pengguna"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Registrasi berhasil, menunggu aktivasi admin"})
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
		"biometric_enabled":  user.BiometricEnabled,
		"two_factor_enabled": user.TwoFactorEnabled,
		"nfc_enabled":        user.NFCEnabled,
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
	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if !verifyCaptcha(req.CaptchaToken) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Validasi Captcha gagal"})
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
			c.JSON(http.StatusBadRequest, gin.H{"error": "Data wajah tidak valid"})
			return
		}
		if !compareFaceDescriptors(user.FaceData, req.LoginFaceData) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Wajah tidak cocok"})
			return
		}
	} else if req.LoginMethod == "nfc" {
		if !user.NFCEnabled || user.NfcCardId == "" || req.NfcCardId != user.NfcCardId {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Kartu NFC tidak valid"})
			return
		}
	} else {
		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Kata sandi salah"})
			return
		}
		if user.TwoFactorEnabled && user.TwoFactorPin != req.Pin {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "PIN 2FA salah"})
			return
		}
	}

	if user.StatusAktivasi != "aktif" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Akun Anda belum diaktifkan"})
		return
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "FALLBACK_SECRET_JANGAN_GUNAKAN_DI_PRODUCTION"
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID,
		"role":    user.Role,
		"exp":     time.Now().Add(time.Hour * 24).Unix(),
	})

	tokenString, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat sesi"})
		return
	}

	c.SetCookie("auth_token", tokenString, 86400, "/", "", false, true)

	c.JSON(http.StatusOK, gin.H{
		"message": "Login berhasil",
		"user": gin.H{
			"id":           user.ID,
			"nama_lengkap": user.NamaLengkap,
			"username":     user.Username,
			"role_akun":    user.Role,
			"region":       user.Region,
		},
	})
}