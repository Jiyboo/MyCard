package dto

type RegisterRequest struct {
	NamaLengkap  string `json:"nama_lengkap" binding:"required"`
	Username     string `json:"username" binding:"required"`
	Email        string `json:"email" binding:"required,email"`
	Password     string `json:"password" binding:"required,min=6"`
	CaptchaToken string `json:"captcha_token" binding:"required"`
}

type LoginRequest struct {
	Username      string `json:"username" binding:"required"`
	Password      string `json:"password"`
	LoginMethod   string `json:"login_method" binding:"required"`
	LoginFaceData string `json:"login_face_data"`
	Pin           string `json:"pin"`
	NfcCardId     string `json:"nfc_card_id"`
	CaptchaToken  string `json:"captcha_token" binding:"required"`
}