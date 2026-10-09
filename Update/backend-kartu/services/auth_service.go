package services

import (
	"backend-kartu/dto"
	"backend-kartu/models"
	"backend-kartu/repositories"
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthService interface {
	Register(req dto.RegisterRequest) (models.User, error)
	Login(req dto.LoginRequest) (string, error)
}

type authService struct {
	userRepo repositories.UserRepository
}

func NewAuthService(userRepo repositories.UserRepository) AuthService {
	return &authService{userRepo}
}

func (s *authService) Register(req dto.RegisterRequest) (models.User, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return models.User{}, err
	}

	user := models.User{
		NamaLengkap:    req.NamaLengkap,
		Username:       req.Username,
		Email:          req.Email,
		Password:       string(hashedPassword),
		Role:           "user",
		StatusAktivasi: "pending",
	}

	return s.userRepo.Create(user)
}

func (s *authService) Login(req dto.LoginRequest) (string, error) {
	user, err := s.userRepo.FindByUsername(req.Username)
	if err != nil {
		return "", errors.New("kredensial tidak valid")
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
	if err != nil {
		return "", errors.New("kredensial tidak valid")
	}

	if user.StatusAktivasi != "aktif" {
		return "", errors.New("akun anda belum diaktifkan")
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
	return tokenString, err
}