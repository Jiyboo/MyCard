package models

import (
	"time"
)

type LandingHero struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Title       string    `gorm:"column:title;not null" json:"title"`
	Description string    `gorm:"column:description;not null" json:"description"`
	ImageURL    string    `gorm:"column:image_url;type:longtext" json:"image_url"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (LandingHero) TableName() string {
	return "landing_heroes"
}

type LandingFeature struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	Icon       string    `gorm:"column:icon" json:"icon"`
	TitleFront string    `gorm:"column:title_front;not null" json:"title_front"`
	DescFront  string    `gorm:"column:desc_front" json:"desc_front"`
	TitleBack  string    `gorm:"column:title_back" json:"title_back"`
	DescBack   string    `gorm:"column:desc_back" json:"desc_back"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type LandingStepSection struct {
	ID        uint          `gorm:"primaryKey" json:"id"`
	Title     string        `gorm:"column:title;not null" json:"title"`
	Steps     []LandingStep `gorm:"foreignKey:SectionID;constraint:OnDelete:CASCADE;" json:"steps"`
	UpdatedAt time.Time     `json:"updated_at"`
}

type LandingStep struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	SectionID   uint      `gorm:"column:section_id;not null" json:"section_id"`
	StepNumber  int       `gorm:"column:step_number;not null" json:"step_number"`
	Title       string    `gorm:"column:title;not null" json:"title"`
	Description string    `gorm:"column:description" json:"description"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type LandingFooter struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	AboutText     string    `gorm:"column:about_text" json:"about_text"`
	Email         string    `gorm:"column:email" json:"email"`
	Phone         string    `gorm:"column:phone" json:"phone"`
	Address       string    `gorm:"column:address" json:"address"`
	Copyright     string    `gorm:"column:copyright" json:"copyright"`
	WebsiteLink  string    `gorm:"column:Website_link" json:"Website_link"`
	InstagramLink string    `gorm:"column:instagram_link" json:"instagram_link"`
	UpdatedAt     time.Time `json:"updated_at"`
}