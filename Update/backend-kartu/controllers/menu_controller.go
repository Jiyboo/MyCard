package controllers

import (
	"backend-kartu/models"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type MenuController struct {
	DB *gorm.DB
}

func NewMenuController(db *gorm.DB) *MenuController {
	return &MenuController{DB: db}
}

func resolveRegionID(db *gorm.DB, regionalIDStr string) *uint {
	if regionalIDStr == "" || regionalIDStr == "undefined" || regionalIDStr == "null" {
		return nil
	}

	if parsedID, err := strconv.ParseUint(regionalIDStr, 10, 32); err == nil {
		id := uint(parsedID)
		return &id
	}

	var region struct{ ID uint }
	if err := db.Table("regions").Where("nama_region = ? OR kode = ?", regionalIDStr, regionalIDStr).Select("id").First(&region).Error; err == nil {
		return &region.ID
	}

	return nil
}

func (ctrl *MenuController) GetMenus(c *gin.Context) {
	var menus []models.Menu
	if err := ctrl.DB.Find(&menus).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data menu"})
		return
	}
	c.JSON(http.StatusOK, menus)
}

func (ctrl *MenuController) GetMenuPermissions(c *gin.Context) {
	menuID := c.Param("id")
	var permissions []models.MenuPermission
	if err := ctrl.DB.Where("menu_id = ?", menuID).Find(&permissions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil hak akses"})
		return
	}
	c.JSON(http.StatusOK, permissions)
}

type UpdatePermissionPayload struct {
	RequiresLogin bool                    `json:"requires_login"`
	Permissions   []models.MenuPermission `json:"permissions"`
}

func (ctrl *MenuController) UpdateMenuPermissions(c *gin.Context) {
	menuIDStr := c.Param("id")
	menuID, err := strconv.ParseUint(menuIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID menu tidak valid"})
		return
	}

	var payload UpdatePermissionPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data tidak valid"})
		return
	}

	tx := ctrl.DB.Begin()

	if err := tx.Model(&models.Menu{}).Where("id = ?", menuID).Update("requires_login", payload.RequiresLogin).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui status login menu"})
		return
	}

	if err := tx.Where("menu_id = ?", menuID).Delete(&models.MenuPermission{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus hak akses lama"})
		return
	}

	for i := range payload.Permissions {
		payload.Permissions[i].ID = 0
		payload.Permissions[i].MenuID = uint(menuID)
	}

	if len(payload.Permissions) > 0 {
		if err := tx.Create(&payload.Permissions).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan hak akses baru"})
			return
		}
	}

	tx.Commit()
	c.JSON(http.StatusOK, gin.H{"message": "Pengaturan akses berhasil diperbarui"})
}

func (ctrl *MenuController) GetMenuAccess(c *gin.Context) {
	menuCode := c.Query("code")
	role := c.Query("role")
	regionalIDStr := c.Query("regional_id")

	var menu models.Menu
	if err := ctrl.DB.Preload("Permissions").Where("menu_code = ?", menuCode).First(&menu).Error; err != nil {
		c.JSON(http.StatusOK, gin.H{"has_access": false})
		return
	}

	if !menu.RequiresLogin {
		c.JSON(http.StatusOK, gin.H{"has_access": true})
		return
	}

	if role == "" {
		c.JSON(http.StatusOK, gin.H{"has_access": false})
		return
	}

	if role == "superadmin" {
		c.JSON(http.StatusOK, gin.H{"has_access": true})
		return
	}

	regID := resolveRegionID(ctrl.DB, regionalIDStr)
	hasAccess := false

	for _, p := range menu.Permissions {
		if p.RoleName == role {
			if p.RegionalID == nil || regID == nil || (regID != nil && p.RegionalID != nil && *p.RegionalID == *regID) {
				if p.CanRead {
					hasAccess = true
					break
				}
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"has_access": hasAccess})
}

func (ctrl *MenuController) GetUserMenuAccess(c *gin.Context) {
	role := c.Query("role")
	regionalIDStr := c.Query("regional_id")

	allowedMenus := make(map[string]map[string]interface{})

	if role == "" {
		c.JSON(http.StatusOK, allowedMenus)
		return
	}

	var menus []models.Menu
	if err := ctrl.DB.Preload("Permissions").Find(&menus).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data menu"})
		return
	}

	if role == "superadmin" {
		for _, menu := range menus {
			allowedMenus[menu.MenuCode] = map[string]interface{}{
				"permissions": []map[string]interface{}{
					{
						"role_name":             "superadmin",
						"can_read":              true,
						"can_create":            true,
						"can_update":            true,
						"can_delete":            true,
						"can_view_cross_region": true,
						"allowed_cross_regions": "[\"Semua\"]",
					},
				},
			}
		}
		c.JSON(http.StatusOK, allowedMenus)
		return
	}

	regID := resolveRegionID(ctrl.DB, regionalIDStr)

	for _, menu := range menus {
		if !menu.RequiresLogin {
			allowedMenus[menu.MenuCode] = map[string]interface{}{
				"permissions": []map[string]interface{}{
					{
						"can_read":              true,
						"can_create":            false,
						"can_update":            false,
						"can_delete":            false,
						"can_view_cross_region": false,
						"allowed_cross_regions": "[]",
					},
				},
			}
			continue
		}

		var applicablePerms []map[string]interface{}

		for _, p := range menu.Permissions {
			if p.RoleName == role {
				if p.RegionalID == nil || regID == nil || (regID != nil && p.RegionalID != nil && *p.RegionalID == *regID) {
					applicablePerms = append(applicablePerms, map[string]interface{}{
						"can_read":              p.CanRead,
						"can_create":            p.CanCreate,
						"can_update":            p.CanUpdate,
						"can_delete":            p.CanDelete,
						"can_view_cross_region": p.CanViewCrossRegion,
						"allowed_cross_regions": p.AllowedCrossRegions,
					})
				}
			}
		}

		canRead := false
		for _, p := range applicablePerms {
			if p["can_read"].(bool) {
				canRead = true
				break
			}
		}

		if canRead {
			allowedMenus[menu.MenuCode] = map[string]interface{}{
				"permissions": applicablePerms,
			}
		}
	}

	c.JSON(http.StatusOK, allowedMenus)
}