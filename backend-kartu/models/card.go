package models

import (
	"time"
)

type CardTemplate struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	NamaTemplate   string    `gorm:"column:nama_template;type:varchar(100);not null" json:"nama_template"`
	FileBackground string    `gorm:"column:file_background;type:varchar(255);not null" json:"file_background"`
	CreatedAt      time.Time `json:"created_at"`
}

type Member struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	UserID      int       `gorm:"column:user_id;unique;not null" json:"user_id"`
	RegionID    *int      `gorm:"column:region_id" json:"region_id"`
	NamaLengkap string    `gorm:"column:nama_lengkap;type:varchar(150);not null" json:"nama_lengkap"`
	NoTelepon   *string   `gorm:"column:no_telepon;type:varchar(20)" json:"no_telepon"`
	Alamat      *string   `gorm:"column:alamat;type:text" json:"alamat"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type MemberCard struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	MemberID       uint      `gorm:"column:member_id;not null" json:"member_id"`
	TemplateID     *uint     `gorm:"column:template_id" json:"template_id"`
	KodeQr         string    `gorm:"column:kode_qr;type:varchar(100);unique;not null" json:"kode_qr"`
	FileTtd        string    `gorm:"column:file_ttd;type:longtext;not null" json:"file_ttd"`
	FileBackground string    `gorm:"column:file_background;type:longtext" json:"file_background"`
	Status         string    `gorm:"column:status;type:enum('aktif','tidak_aktif');default:'aktif'" json:"status"`
	CreatedAt      time.Time `json:"created_at"`
}