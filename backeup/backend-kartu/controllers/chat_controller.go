package controllers

import (
	"backend-kartu/models"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"gorm.io/gorm"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type Client struct {
	Conn *websocket.Conn
	Send chan []byte
}

type ChatController struct {
	DB          *gorm.DB
	Clients     map[uint]*Client
	ClientsLock sync.RWMutex
}

func NewChatController(db *gorm.DB) *ChatController {
	return &ChatController{
		DB:      db,
		Clients: make(map[uint]*Client),
	}
}

type SignalingMessage struct {
	Type     string      `json:"type"`
	SenderID uint        `json:"sender_id"`
	TargetID uint        `json:"target_id"`
	Payload  interface{} `json:"payload"`
}

func (c *Client) writePump() {
	defer c.Conn.Close()
	for {
		message, ok := <-c.Send
		if !ok {
			c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
			return
		}
		c.Conn.WriteMessage(websocket.TextMessage, message)
	}
}

func (ctrl *ChatController) HandleWebSocket(c *gin.Context) {
	userIDStr := c.Query("user_id")
	if userIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Parameter user_id diperlukan"})
		return
	}
	userID, _ := strconv.ParseUint(userIDStr, 10, 32)

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	client := &Client{
		Conn: conn,
		Send: make(chan []byte, 256),
	}

	ctrl.ClientsLock.Lock()
	ctrl.Clients[uint(userID)] = client
	ctrl.ClientsLock.Unlock()

	go client.writePump()

	defer func() {
		ctrl.ClientsLock.Lock()
		if cl, ok := ctrl.Clients[uint(userID)]; ok {
			close(cl.Send)
			delete(ctrl.Clients, uint(userID))
		}
		ctrl.ClientsLock.Unlock()
	}()

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			break
		}

		var sigMsg SignalingMessage
		if err := json.Unmarshal(msg, &sigMsg); err == nil {
			if sigMsg.TargetID != 0 {
				ctrl.ClientsLock.RLock()
				targetClient, exists := ctrl.Clients[sigMsg.TargetID]
				ctrl.ClientsLock.RUnlock()

				if exists {
					targetClient.Send <- msg
				}
			} else if sigMsg.Type == "call-stream-update" {
				payloadMap, ok := sigMsg.Payload.(map[string]interface{})
				if ok {
					participantIds, pOk := payloadMap["participantIds"].([]interface{})
					if pOk {
						for _, idObj := range participantIds {
							idFloat, ok := idObj.(float64)
							if ok && uint(idFloat) != uint(userID) {
								ctrl.ClientsLock.RLock()
								targetClient, exists := ctrl.Clients[uint(idFloat)]
								ctrl.ClientsLock.RUnlock()
								if exists {
									targetClient.Send <- msg
								}
							}
						}
					}
				}
			}
		}
	}
}

func (ctrl *ChatController) GetConversations(c *gin.Context) {
	userID := c.Query("user_id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Parameter user_id diperlukan"})
		return
	}
	userIDInt, _ := strconv.ParseUint(userID, 10, 32)

	var participants []models.ConversationParticipant
	if err := ctrl.DB.Where("user_id = ?", userIDInt).Find(&participants).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memuat partisipan"})
		return
	}

	var conversationIDs []uint
	for _, p := range participants {
		conversationIDs = append(conversationIDs, p.ConversationID)
	}

	var conversations []models.Conversation
	if len(conversationIDs) > 0 {
		ctrl.DB.Preload("Participants.User").Preload("Messages", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at desc").Limit(1)
		}).Where("id IN ?", conversationIDs).Order("updated_at desc").Find(&conversations)

		type UnreadResult struct {
			ConversationID uint
			Count          int64
		}
		var unreadResults []UnreadResult
		ctrl.DB.Model(&models.Message{}).
			Select("messages.conversation_id, count(messages.id) as count").
			Joins("JOIN conversation_participants cp ON cp.conversation_id = messages.conversation_id AND cp.user_id = ?", userIDInt).
			Where("messages.conversation_id IN ? AND messages.sender_id != ? AND messages.id > COALESCE(cp.last_read_message_id, 0)", conversationIDs, userIDInt).
			Group("messages.conversation_id").
			Scan(&unreadResults)

		unreadMap := make(map[uint]int64)
		for _, ur := range unreadResults {
			unreadMap[ur.ConversationID] = ur.Count
		}

		ctrl.ClientsLock.RLock()
		for i, conv := range conversations {
			conversations[i].UnreadCount = unreadMap[conv.ID]
			if conv.Type == "direct" {
				for _, p := range conv.Participants {
					if p.UserID != uint(userIDInt) {
						_, exists := ctrl.Clients[p.UserID]
						conversations[i].IsOnline = exists
						break
					}
				}
			}
		}
		ctrl.ClientsLock.RUnlock()
	}

	c.JSON(http.StatusOK, conversations)
}

func (ctrl *ChatController) GetMessages(c *gin.Context) {
	conversationID := c.Param("id")
	userID := c.Query("user_id")

	var messages []models.Message
	if err := ctrl.DB.Preload("Sender").Preload("ReplyTo").Preload("ReplyTo.Sender").Where("conversation_id = ?", conversationID).Order("created_at asc").Find(&messages).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memuat pesan"})
		return
	}

	var participants []models.ConversationParticipant
	ctrl.DB.Where("conversation_id = ?", conversationID).Find(&participants)

	var filteredMessages []models.Message
	userIDStr := fmt.Sprintf(",%s,", userID)
	
	now := time.Now()

	for _, m := range messages {
		if !strings.Contains(m.DeletedFor, userIDStr) {
			if m.IsMedia && now.Sub(m.CreatedAt).Hours() > 24*7 {
				m.IsDeleted = true
				m.Content = "Media ini telah kedaluwarsa harap minta dikirim kembali oleh sender"
				m.MediaUrl = ""
				m.MediaType = ""
			}

			status := "sent"
			readCount := 0
			deliveredCount := 0

			for _, p := range participants {
				if p.UserID != m.SenderID {
					if p.LastReadMessageID != nil && *p.LastReadMessageID >= m.ID {
						readCount++
					} else {
						deliveredCount++
					}
				}
			}

			totalOtherParticipants := len(participants) - 1

			if totalOtherParticipants > 0 {
				if readCount == totalOtherParticipants {
					status = "read"
				} else if readCount > 0 || deliveredCount > 0 {
					status = "delivered"
				}
			}

			m.Status = status
			filteredMessages = append(filteredMessages, m)
		}
	}

	c.JSON(http.StatusOK, filteredMessages)
}

func (ctrl *ChatController) SendMessage(c *gin.Context) {
	conversationIDStr := c.PostForm("conversation_id")
	senderIDStr := c.PostForm("sender_id")
	content := c.PostForm("content")
	replyToIDStr := c.PostForm("reply_to_id")

	conversationID, _ := strconv.ParseUint(conversationIDStr, 10, 32)
	senderID, _ := strconv.ParseUint(senderIDStr, 10, 32)
	
	var replyToID *uint
	if replyToIDStr != "" {
		id, _ := strconv.ParseUint(replyToIDStr, 10, 32)
		uId := uint(id)
		replyToID = &uId
	}

	msg := models.Message{
		ConversationID: uint(conversationID),
		SenderID:       uint(senderID),
		Content:        content,
		ReplyToID:      replyToID,
	}

	file, err := c.FormFile("media")
	if err == nil {
		uploadDir := "./uploads/chat_media"
		if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
			os.MkdirAll(uploadDir, os.ModePerm)
		}

		filename := fmt.Sprintf("%d_%s", time.Now().Unix(), filepath.Base(file.Filename))
		filepathStr := filepath.Join(uploadDir, filename)
		if err := c.SaveUploadedFile(file, filepathStr); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan file"})
			return
		}

		msg.IsMedia = true
		msg.MediaUrl = "/uploads/chat_media/" + filename
		
		mimeType := file.Header.Get("Content-Type")
		if strings.HasPrefix(mimeType, "image/") {
			msg.MediaType = "image"
		} else if strings.HasPrefix(mimeType, "video/") {
			msg.MediaType = "video"
		} else {
			msg.MediaType = "document"
		}

		if msg.Content == "" {
			msg.Content = "Mengirim file"
		}
	}

	if err := ctrl.DB.Create(&msg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengirim pesan"})
		return
	}

	ctrl.DB.Model(&models.Conversation{}).Where("id = ?", msg.ConversationID).Update("updated_at", msg.CreatedAt)
	ctrl.DB.Model(&models.ConversationParticipant{}).Where("conversation_id = ? AND user_id = ?", msg.ConversationID, msg.SenderID).Update("last_read_message_id", msg.ID)
	ctrl.DB.Preload("Sender").Preload("ReplyTo").Preload("ReplyTo.Sender").First(&msg, msg.ID)

	var participants []models.ConversationParticipant
	ctrl.DB.Where("conversation_id = ?", msg.ConversationID).Find(&participants)

	ctrl.ClientsLock.RLock()
	for _, p := range participants {
		if targetClient, ok := ctrl.Clients[p.UserID]; ok {
			wsMsg, _ := json.Marshal(map[string]interface{}{
				"type":    "new-message",
				"payload": msg,
			})
			targetClient.Send <- wsMsg
		}
	}
	ctrl.ClientsLock.RUnlock()

	c.JSON(http.StatusOK, msg)
}

func (ctrl *ChatController) CreateConversation(c *gin.Context) {
	var input struct {
		Type           string `json:"type"`
		Name           string `json:"name"`
		ParticipantIDs []uint `json:"participant_ids"`
		CreatorID      uint   `json:"creator_id"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data tidak valid"})
		return
	}

	tx := ctrl.DB.Begin()

	var convName *string
	if input.Name != "" {
		convName = &input.Name
	}

	conversation := models.Conversation{
		Type:      input.Type,
		Name:      convName,
		CreatorID: input.CreatorID,
	}

	if err := tx.Create(&conversation).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat percakapan"})
		return
	}

	for _, pid := range input.ParticipantIDs {
		role := "member"
		if pid == input.CreatorID && input.Type == "group" {
			role = "admin"
		}
		participant := models.ConversationParticipant{
			ConversationID: conversation.ID,
			UserID:         pid,
			Role:           role,
		}
		if err := tx.Create(&participant).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menambahkan partisipan"})
			return
		}
	}

	tx.Commit()
	c.JSON(http.StatusOK, conversation)
}

type MarkReadInput struct {
	UserID         uint `json:"user_id"`
	ConversationID uint `json:"conversation_id"`
}

func (ctrl *ChatController) MarkAsRead(c *gin.Context) {
	var input MarkReadInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data tidak valid"})
		return
	}

	var lastMsg models.Message
	if err := ctrl.DB.Where("conversation_id = ?", input.ConversationID).Order("id desc").First(&lastMsg).Error; err == nil {
		ctrl.DB.Model(&models.ConversationParticipant{}).
			Where("conversation_id = ? AND user_id = ?", input.ConversationID, input.UserID).
			Update("last_read_message_id", lastMsg.ID)
	}

	c.JSON(http.StatusOK, gin.H{"message": "Status dibaca diperbarui"})
}

func (ctrl *ChatController) DeleteConversation(c *gin.Context) {
	conversationID := c.Param("id")
	userID := c.Query("user_id")

	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Parameter user_id diperlukan"})
		return
	}

	var conv models.Conversation
	if err := ctrl.DB.First(&conv, conversationID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Obrolan tidak ditemukan"})
		return
	}

	if conv.Type == "group" {
		userIDInt, _ := strconv.ParseUint(userID, 10, 32)
		if conv.CreatorID != uint(userIDInt) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Hanya pembuat grup yang dapat menghapus grup"})
			return
		}
	}

	if err := ctrl.DB.Delete(&models.Conversation{}, conversationID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus obrolan"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Obrolan dihapus"})
}

type LeaveChatInput struct {
	UserID     uint  `json:"user_id"`
	NewAdminID *uint `json:"new_admin_id"`
}

func (ctrl *ChatController) LeaveConversation(c *gin.Context) {
	conversationID := c.Param("id")
	var input LeaveChatInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data tidak valid"})
		return
	}

	var conv models.Conversation
	if err := ctrl.DB.First(&conv, conversationID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Obrolan tidak ditemukan"})
		return
	}

	var participant models.ConversationParticipant
	if err := ctrl.DB.Where("conversation_id = ? AND user_id = ?", conversationID, input.UserID).First(&participant).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Partisipan tidak ditemukan"})
		return
	}

	var count int64
	ctrl.DB.Model(&models.ConversationParticipant{}).Where("conversation_id = ?", conversationID).Count(&count)

	if conv.CreatorID == input.UserID && count > 1 {
		if input.NewAdminID == nil || *input.NewAdminID == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Pilih admin baru sebelum keluar"})
			return
		}
		ctrl.DB.Model(&models.ConversationParticipant{}).Where("conversation_id = ? AND user_id = ?", conversationID, *input.NewAdminID).Update("role", "admin")
		ctrl.DB.Model(&models.Conversation{}).Where("id = ?", conversationID).Update("creator_id", *input.NewAdminID)
	}

	var user models.User
	ctrl.DB.First(&user, input.UserID)

	if err := ctrl.DB.Where("conversation_id = ? AND user_id = ?", conversationID, input.UserID).Delete(&models.ConversationParticipant{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal keluar dari obrolan"})
		return
	}

	convID, _ := strconv.ParseUint(conversationID, 10, 32)
	sysMsg := models.Message{
		ConversationID: uint(convID),
		SenderID:       input.UserID,
		Content:        user.NamaLengkap + " keluar dari grup",
		IsSystem:       true,
	}
	ctrl.DB.Create(&sysMsg)

	c.JSON(http.StatusOK, gin.H{"message": "Berhasil keluar dari obrolan"})
}

type DeleteMessageInput struct {
	UserID uint   `json:"user_id"`
	Type   string `json:"type"`
}

func (ctrl *ChatController) DeleteMessage(c *gin.Context) {
	messageID := c.Param("id")
	var input DeleteMessageInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data tidak valid"})
		return
	}

	var msg models.Message
	if err := ctrl.DB.First(&msg, messageID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pesan tidak ditemukan"})
		return
	}

	if input.Type == "everyone" {
		if msg.SenderID != input.UserID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Tidak memiliki akses"})
			return
		}
		msg.IsDeleted = true
		msg.Content = "Pesan ini telah dihapus"
		msg.MediaUrl = ""
		ctrl.DB.Save(&msg)
	} else if input.Type == "me" {
		userIDStr := fmt.Sprintf(",%d,", input.UserID)
		if !strings.Contains(msg.DeletedFor, userIDStr) {
			msg.DeletedFor += userIDStr
			ctrl.DB.Save(&msg)
		}
	}

	c.JSON(http.StatusOK, msg)
}

type AddMemberInput struct {
	RequesterID uint   `json:"requester_id"`
	UserIDs     []uint `json:"user_ids"`
}

func (ctrl *ChatController) AddGroupMembers(c *gin.Context) {
	conversationID := c.Param("id")
	var input AddMemberInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data tidak valid"})
		return
	}

	var conv models.Conversation
	if err := ctrl.DB.First(&conv, conversationID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Grup tidak ditemukan"})
		return
	}

	if conv.Type != "group" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Bukan grup"})
		return
	}

	var requester models.ConversationParticipant
	if err := ctrl.DB.Where("conversation_id = ? AND user_id = ?", conversationID, input.RequesterID).First(&requester).Error; err != nil || requester.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Hanya admin yang dapat menambahkan anggota"})
		return
	}

	tx := ctrl.DB.Begin()

	for _, uid := range input.UserIDs {
		var existing models.ConversationParticipant
		if err := tx.Where("conversation_id = ? AND user_id = ?", conversationID, uid).First(&existing).Error; err != nil {
			participant := models.ConversationParticipant{
				ConversationID: conv.ID,
				UserID:         uid,
				Role:           "member",
			}
			tx.Create(&participant)

			var addedUser models.User
			tx.First(&addedUser, uid)

			sysMsg := models.Message{
				ConversationID: conv.ID,
				SenderID:       input.RequesterID,
				Content:        addedUser.NamaLengkap + " telah ditambahkan ke grup",
				IsSystem:       true,
			}
			tx.Create(&sysMsg)
		}
	}

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Anggota berhasil ditambahkan"})
}

type UpdateGroupInput struct {
	RequesterID uint   `json:"requester_id"`
	Name        string `json:"name"`
}

func (ctrl *ChatController) UpdateGroupName(c *gin.Context) {
	conversationID := c.Param("id")
	var input UpdateGroupInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data tidak valid"})
		return
	}

	var requester models.ConversationParticipant
	if err := ctrl.DB.Where("conversation_id = ? AND user_id = ?", conversationID, input.RequesterID).First(&requester).Error; err != nil || requester.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Hanya admin yang dapat mengubah nama grup"})
		return
	}

	if err := ctrl.DB.Model(&models.Conversation{}).Where("id = ?", conversationID).Update("name", input.Name).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengubah nama grup"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Nama grup berhasil diubah"})
}

type ManageMemberInput struct {
	RequesterID uint `json:"requester_id"`
	TargetID    uint `json:"target_id"`
}

func (ctrl *ChatController) PromoteAdmin(c *gin.Context) {
	conversationID := c.Param("id")
	var input ManageMemberInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data tidak valid"})
		return
	}

	var conv models.Conversation
	if err := ctrl.DB.First(&conv, conversationID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Grup tidak ditemukan"})
		return
	}

	var requester models.ConversationParticipant
	if err := ctrl.DB.Where("conversation_id = ? AND user_id = ?", conversationID, input.RequesterID).First(&requester).Error; err != nil || requester.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Hanya admin yang dapat menunjuk admin lain"})
		return
	}

	if err := ctrl.DB.Model(&models.ConversationParticipant{}).Where("conversation_id = ? AND user_id = ?", conversationID, input.TargetID).Update("role", "admin").Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menunjuk admin"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Berhasil menunjuk admin baru"})
}

func (ctrl *ChatController) DemoteAdmin(c *gin.Context) {
	conversationID := c.Param("id")
	var input ManageMemberInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data tidak valid"})
		return
	}

	var conv models.Conversation
	if err := ctrl.DB.First(&conv, conversationID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Grup tidak ditemukan"})
		return
	}

	if conv.CreatorID != input.RequesterID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Hanya pembuat grup yang dapat memberhentikan admin"})
		return
	}

	if conv.CreatorID == input.TargetID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Pembuat grup tidak dapat diberhentikan"})
		return
	}

	if err := ctrl.DB.Model(&models.ConversationParticipant{}).Where("conversation_id = ? AND user_id = ?", conversationID, input.TargetID).Update("role", "member").Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memberhentikan admin"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Berhasil memberhentikan admin"})
}

func (ctrl *ChatController) RemoveMember(c *gin.Context) {
	conversationID := c.Param("id")
	var input ManageMemberInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data tidak valid"})
		return
	}

	var conv models.Conversation
	if err := ctrl.DB.First(&conv, conversationID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Grup tidak ditemukan"})
		return
	}

	var requester models.ConversationParticipant
	if err := ctrl.DB.Where("conversation_id = ? AND user_id = ?", conversationID, input.RequesterID).First(&requester).Error; err != nil || requester.Role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Hanya admin yang dapat mengeluarkan anggota"})
		return
	}

	var target models.ConversationParticipant
	if err := ctrl.DB.Where("conversation_id = ? AND user_id = ?", conversationID, input.TargetID).First(&target).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Anggota tidak ditemukan"})
		return
	}

	if target.UserID == conv.CreatorID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Pembuat grup tidak dapat dikeluarkan"})
		return
	}

	if target.Role == "admin" && requester.UserID != conv.CreatorID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Admin tidak dapat mengeluarkan admin lain, kecuali pembuat grup"})
		return
	}

	tx := ctrl.DB.Begin()

	var targetUser models.User
	tx.First(&targetUser, input.TargetID)

	if err := tx.Delete(&models.ConversationParticipant{}, target.ID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengeluarkan anggota"})
		return
	}

	sysMsg := models.Message{
		ConversationID: conv.ID,
		SenderID:       input.RequesterID,
		Content:        targetUser.NamaLengkap + " telah dikeluarkan dari grup",
		IsSystem:       true,
	}
	tx.Create(&sysMsg)

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Berhasil mengeluarkan anggota"})
}