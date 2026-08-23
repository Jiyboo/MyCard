package models

import (
	"time"
	"gorm.io/gorm"
)

type Region struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	Kode      string         `gorm:"column:kode;unique;not null" json:"kode"`
	Nama      string         `gorm:"column:nama_region;not null" json:"nama"`
	Deskripsi string         `gorm:"column:deskripsi" json:"deskripsi"`
	Status    string         `gorm:"column:status_aktivasi;default:'aktif'" json:"status"`
}

func (Region) TableName() string {
	return "regions"
}