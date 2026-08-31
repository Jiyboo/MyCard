package models

import (
	"time"
	"gorm.io/gorm"
)

type Conversation struct {
	ID           uint                      `gorm:"primaryKey" json:"id"`
	Type         string                    `gorm:"column:type;type:enum('direct','group');default:'direct'" json:"type"`
	Name         *string                   `gorm:"column:name;type:varchar(255)" json:"name"`
	Participants []ConversationParticipant `gorm:"foreignKey:ConversationID;constraint:OnDelete:CASCADE;" json:"participants,omitempty"`
	Messages     []Message                 `gorm:"foreignKey:ConversationID;constraint:OnDelete:CASCADE;" json:"messages,omitempty"`
	CreatorID    uint                      `gorm:"column:creator_id" json:"creator_id"`
	CreatedAt    time.Time                 `json:"created_at"`
	UpdatedAt    time.Time                 `json:"updated_at"`
	UnreadCount  int64                     `gorm:"-" json:"unread_count"`
	IsOnline     bool                      `gorm:"-" json:"is_online"`
}

type ConversationParticipant struct {
	ID                uint      `gorm:"primaryKey" json:"id"`
	ConversationID    uint      `gorm:"column:conversation_id;not null" json:"conversation_id"`
	UserID            uint      `gorm:"column:user_id;not null" json:"user_id"`
	Role              string    `gorm:"column:role;type:enum('admin','member');default:'member'" json:"role"`
	LastReadMessageID *uint     `gorm:"column:last_read_message_id" json:"last_read_message_id"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
	
	User User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

type Message struct {
	ID             uint           `gorm:"primaryKey" json:"id"`
	ConversationID uint           `gorm:"column:conversation_id;not null" json:"conversation_id"`
	SenderID       uint           `gorm:"column:sender_id;not null" json:"sender_id"`
	Content        string         `gorm:"column:content;type:text;not null" json:"content"`
	IsDeleted      bool           `gorm:"column:is_deleted;default:false" json:"is_deleted"`
	IsSystem       bool           `gorm:"column:is_system;default:false" json:"is_system"`
	DeletedFor     string         `gorm:"column:deleted_for;type:text" json:"deleted_for"`
	ReplyToID      *uint          `gorm:"column:reply_to_id" json:"reply_to_id"`
	IsMedia        bool           `gorm:"column:is_media;default:false" json:"is_media"`
	MediaUrl       string         `gorm:"column:media_url;type:varchar(255)" json:"media_url"`
	MediaType      string         `gorm:"column:media_type;type:varchar(50)" json:"media_type"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
	
	Sender  User     `gorm:"foreignKey:SenderID" json:"sender,omitempty"`
	ReplyTo *Message `gorm:"foreignKey:ReplyToID" json:"reply_to,omitempty"`
	Status  string   `gorm:"-" json:"status"`
}