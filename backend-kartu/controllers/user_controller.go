package controllers

import (
	"backend-kartu/models"
	"net/http"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type UserController struct {
	DB *gorm.DB
}

type ProfileInput struct {
	NamaLengkap  string `json:"nama_lengkap"`
	Email        string `json:"email"`
	FotoProfil   string `json:"foto_profil"`
	PasswordLama string `json:"password_lama"`
	PasswordBaru string `json:"password_baru"`
}

type SettingsInput struct {
	TwoFactorEnabled bool   `json:"two_factor_enabled"`
	BiometricEnabled bool   `json:"biometric_enabled"`
	NFCEnabled       bool   `json:"nfc_enabled"`
	FaceData         string `json:"face_data"`
}

func NewUserController(db *gorm.DB) *UserController {
	return &UserController{DB: db}
}

func (ctrl *UserController) GetUsers(c *gin.Context) {
	var users []models.User
	query := ctrl.DB

	role := c.Query("role")
	if role != "" {
		query = query.Where("role = ?", role)
	}

	query.Find(&users)
	c.JSON(http.StatusOK, users)
}

func (ctrl *UserController) CreateUser(c *gin.Context) {
	var user models.User
	if err := c.ShouldBindJSON(&user); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if user.Password != "" {
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
		user.Password = string(hashedPassword)
	}

	ctrl.DB.Create(&user)
	c.JSON(http.StatusOK, user)
}

func (ctrl *UserController) UpdateUser(c *gin.Context) {
	id := c.Param("id")
	var existingUser models.User

	if err := ctrl.DB.First(&existingUser, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pengguna tidak ditemukan"})
		return
	}

	var inputData models.User
	if err := c.ShouldBindJSON(&inputData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	existingUser.NamaLengkap = inputData.NamaLengkap
	existingUser.Username = inputData.Username
	existingUser.Email = inputData.Email
	existingUser.Role = inputData.Role
	existingUser.Region = inputData.Region
	existingUser.StatusAktivasi = inputData.StatusAktivasi

	if inputData.Password != "" {
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(inputData.Password), bcrypt.DefaultCost)
		existingUser.Password = string(hashedPassword)
	}

	ctrl.DB.Save(&existingUser)
	c.JSON(http.StatusOK, existingUser)
}

func (ctrl *UserController) DeleteUser(c *gin.Context) {
	id := c.Param("id")
	ctrl.DB.Delete(&models.User{}, id)
	c.JSON(http.StatusOK, gin.H{"message": "Pengguna berhasil dihapus"})
}

func (ctrl *UserController) ToggleStatus(c *gin.Context) {
	id := c.Param("id")
	var req struct {
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	ctrl.DB.Model(&models.User{}).Where("id = ?", id).Update("status_aktivasi", req.Status)
	c.JSON(http.StatusOK, gin.H{"message": "Status diperbarui"})
}

func (ctrl *UserController) UpdateProfile(c *gin.Context) {
	id := c.Param("id")
	var existingUser models.User

	if err := ctrl.DB.First(&existingUser, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pengguna tidak ditemukan"})
		return
	}

	var inputData ProfileInput
	if err := c.ShouldBindJSON(&inputData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if inputData.NamaLengkap != "" {
		existingUser.NamaLengkap = inputData.NamaLengkap
	}
	if inputData.Email != "" {
		existingUser.Email = inputData.Email
	}
	if inputData.FotoProfil != "" {
		existingUser.FotoProfil = inputData.FotoProfil
	}

	if inputData.PasswordLama != "" && inputData.PasswordBaru != "" {
		err := bcrypt.CompareHashAndPassword([]byte(existingUser.Password), []byte(inputData.PasswordLama))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Password lama tidak sesuai"})
			return
		}

		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(inputData.PasswordBaru), bcrypt.DefaultCost)
		existingUser.Password = string(hashedPassword)
	}

	ctrl.DB.Save(&existingUser)
	c.JSON(http.StatusOK, existingUser)
}

func (ctrl *UserController) UpdateSettings(c *gin.Context) {
	id := c.Param("id")
	var user models.User

	if err := ctrl.DB.First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pengguna tidak ditemukan"})
		return
	}

	var input SettingsInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user.TwoFactorEnabled = input.TwoFactorEnabled
	user.BiometricEnabled = input.BiometricEnabled
	user.NFCEnabled = input.NFCEnabled

	if input.FaceData != "" {
		user.FaceData = input.FaceData
	} else if !input.BiometricEnabled {
		user.FaceData = ""
	}

	if err := ctrl.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui pengaturan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Pengaturan berhasil diperbarui",
		"user":    user,
	})
}