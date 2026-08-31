package models

import (
	"time"
	"gorm.io/gorm"
)

type User struct {
	ID               uint           `gorm:"primaryKey" json:"id"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
	NamaLengkap      string         `gorm:"column:nama_lengkap" json:"nama_lengkap"`
	Username         string         `gorm:"column:username;unique" json:"username"`
	Email            string         `gorm:"column:email;unique" json:"email"`
	Password         string         `gorm:"column:password" json:"password"`
	Role             string         `gorm:"column:role;default:'user'" json:"role_akun"`
	StatusAktivasi   string         `gorm:"column:status_aktivasi;default:'pending'" json:"status"`
	Region           string         `gorm:"column:region" json:"region"`
	RegionID         *int           `gorm:"column:region_id;type:int(11);default:null" json:"region_id"`
	DiaktifkanOleh   *int           `gorm:"column:diaktifkan_oleh;type:int(11);default:null" json:"diaktifkan_oleh"`
	FotoProfil       string         `gorm:"column:foto_profil;type:longtext" json:"foto_profil"`
	TwoFactorEnabled bool           `gorm:"column:two_factor_enabled;default:false" json:"two_factor_enabled"`
	TwoFactorPin     string         `gorm:"column:two_factor_pin" json:"two_factor_pin"`
	BiometricEnabled bool           `gorm:"column:biometric_enabled;default:false" json:"biometric_enabled"`
	NFCEnabled       bool           `gorm:"column:nfc_enabled;default:false" json:"nfc_enabled"`
	NfcCardId        string         `gorm:"column:nfc_card_id" json:"nfc_card_id"`
	FaceData         string         `gorm:"column:face_data;type:longtext" json:"face_data"`
}

func (User) TableName() string {
	return "users"
}