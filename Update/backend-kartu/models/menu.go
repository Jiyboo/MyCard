package models

import (
	"time"
)

type Menu struct {
	ID            uint             `gorm:"primaryKey" json:"id"`
	MenuCode      string           `gorm:"column:menu_code;type:varchar(100);unique;not null" json:"menu_code"`
	MenuName      string           `gorm:"column:menu_name;type:varchar(255);not null" json:"menu_name"`
	MenuType      string           `gorm:"column:menu_type;type:enum('navbar','sidebar');not null" json:"menu_type"`
	RequiresLogin bool             `gorm:"column:requires_login;default:true" json:"requires_login"`
	Permissions   []MenuPermission `gorm:"foreignKey:MenuID;constraint:OnDelete:CASCADE;" json:"permissions,omitempty"`
	CreatedAt     time.Time        `json:"created_at"`
	UpdatedAt     time.Time        `json:"updated_at"`
}

type MenuPermission struct {
	ID                  uint      `gorm:"primaryKey" json:"id"`
	MenuID              uint      `gorm:"column:menu_id;not null" json:"menu_id"`
	RoleName            string    `gorm:"column:role_name;type:varchar(50);not null" json:"role_name"`
	RegionalID          *uint     `gorm:"column:regional_id" json:"regional_id"`
	CanCreate           bool      `gorm:"column:can_create;default:false" json:"can_create"`
	CanRead             bool      `gorm:"column:can_read;default:false" json:"can_read"`
	CanUpdate           bool      `gorm:"column:can_update;default:false" json:"can_update"`
	CanDelete           bool      `gorm:"column:can_delete;default:false" json:"can_delete"`
	CanViewCrossRegion  bool      `gorm:"column:can_view_cross_region;default:false" json:"can_view_cross_region"`
	AllowedCrossRegions string    `gorm:"column:allowed_cross_regions;type:text" json:"allowed_cross_regions"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}